// verifyMirror 의 통과 경로 1개와 실패 경로 4개를 임시 디렉토리 픽스처로 검증한다.
import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync, appendFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifyMirror, sha256, LOCK_NAME, listMirrorFiles, verifyBundleFonts, writeBundleFonts } from './foundation-lock.mjs'

const TOKENS = ':root { --primary: #C9252C; }\n'
const FONT = Buffer.from('woff2-stub-bytes')

let dir

function setup() {
  dir = mkdtempSync(join(tmpdir(), 'crefle-mirror-'))
  mkdirSync(join(dir, 'fonts'))
  writeFileSync(join(dir, 'tokens.css'), TOKENS)
  writeFileSync(join(dir, 'fonts', 'A.woff2'), FONT)
  writeFileSync(
    join(dir, LOCK_NAME),
    JSON.stringify(
      {
        repo: 'https://example.invalid/repo.git',
        ref: 'main',
        commit: 'a'.repeat(40),
        syncedAt: '2026-07-09T00:00:00Z',
        files: {
          'tokens.css': sha256(TOKENS),
          'fonts/A.woff2': sha256(FONT)
        }
      },
      null,
      2
    )
  )
  return dir
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

describe('verifyMirror', () => {
  it('정상 미러는 문제가 없다', () => {
    setup()
    const { lock, problems } = verifyMirror(dir)
    expect(problems).toEqual([])
    expect(lock.commit).toHaveLength(40)
  })

  it('lock 파일이 없으면 실패한다', () => {
    setup()
    unlinkSync(join(dir, LOCK_NAME))
    const { lock, problems } = verifyMirror(dir)
    expect(lock).toBeNull()
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(LOCK_NAME)
  })

  it('lock 파일이 깨졌으면 실패한다', () => {
    setup()
    writeFileSync(join(dir, LOCK_NAME), '{ not json')
    const { problems } = verifyMirror(dir)
    expect(problems[0]).toContain('파싱')
  })

  it('미러 파일을 수정하면 변조로 잡는다', () => {
    setup()
    appendFileSync(join(dir, 'tokens.css'), '/* 몰래 고침 */\n')
    const { problems } = verifyMirror(dir)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('변조: tokens.css')
  })

  it('lock 에 적힌 파일이 없으면 누락으로 잡는다', () => {
    setup()
    unlinkSync(join(dir, 'fonts', 'A.woff2'))
    const { problems } = verifyMirror(dir)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('누락: fonts/A.woff2')
  })

  it('lock 에 없는 파일을 끼워 넣으면 미등록으로 잡는다', () => {
    setup()
    writeFileSync(join(dir, 'rogue-tokens.css'), ':root{}')
    const { problems } = verifyMirror(dir)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('미등록 파일: rogue-tokens.css')
  })

  it('허용 목록(README, 폰트 라이선스)은 통과시킨다', () => {
    setup()
    writeFileSync(join(dir, 'README.md'), '# 동봉본')
    writeFileSync(join(dir, 'fonts', 'LICENSE-SpoqaHanSansNeo.txt'), 'OFL 1.1')
    writeFileSync(join(dir, 'fonts', 'LICENSE-MaterialSymbols.txt'), 'Apache-2.0')
    const { problems } = verifyMirror(dir)
    expect(problems).toEqual([])
  })

  it('lock 에 files 필드가 없으면 실패한다', () => {
    setup()
    writeFileSync(
      join(dir, LOCK_NAME),
      JSON.stringify(
        {
          repo: 'https://example.invalid/repo.git',
          ref: 'main',
          commit: 'a'.repeat(40),
          syncedAt: '2026-07-09T00:00:00Z'
        },
        null,
        2
      )
    )
    const { lock, problems } = verifyMirror(dir)
    expect(lock).toBeNull()
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('files')
  })
})

describe('listMirrorFiles', () => {
  let listDir

  afterEach(() => {
    if (listDir) rmSync(listDir, { recursive: true, force: true })
    listDir = undefined
  })

  it('디렉토리명이 형제 파일명의 접두사여도 최종 상대경로 기준 사전순으로 정렬한다', () => {
    listDir = mkdtempSync(join(tmpdir(), 'crefle-listmirror-'))
    mkdirSync(join(listDir, 'a'))
    writeFileSync(join(listDir, 'a', 'inner.css'), '')
    writeFileSync(join(listDir, 'a.css'), '')

    expect(listMirrorFiles(listDir)).toEqual(['a.css', 'a/inner.css'])
  })
})

// ── ds-bundle 폰트 사본 (verifyBundleFonts / writeBundleFonts) ──────────────────
// 실 repo 파일을 픽스처로 쓰지 않는다. 임시 mirror + bundle + lock 객체로만 검증한다.

const FONT_A = Buffer.from('woff2-A-bytes')
const LICENSE_SPOQA = 'OFL 1.1 전문\n'
const LICENSE_MATERIAL = 'Apache-2.0 전문\n'

describe('verifyBundleFonts', () => {
  let base

  // mirror(styles/foundation 역할) + bundle(ds-bundle/fonts 역할) + lock 객체를 만든다.
  function setupBundle() {
    base = mkdtempSync(join(tmpdir(), 'crefle-bundle-'))
    const mirror = join(base, 'mirror')
    const bundle = join(base, 'bundle')
    mkdirSync(join(mirror, 'fonts'), { recursive: true })
    mkdirSync(bundle, { recursive: true })

    writeFileSync(join(mirror, 'fonts', 'A.woff2'), FONT_A)
    writeFileSync(join(bundle, 'A.woff2'), FONT_A)
    writeFileSync(join(mirror, 'fonts', 'LICENSE-Spoqa.txt'), LICENSE_SPOQA)
    writeFileSync(join(bundle, 'LICENSE-Spoqa.txt'), LICENSE_SPOQA)
    writeFileSync(join(mirror, 'fonts', 'LICENSE-Material.txt'), LICENSE_MATERIAL)
    writeFileSync(join(bundle, 'LICENSE-Material.txt'), LICENSE_MATERIAL)

    const lock = { files: { 'tokens.css': sha256('x'), 'fonts/A.woff2': sha256(FONT_A) } }
    return { mirror, bundle, lock }
  }

  afterEach(() => {
    if (base) rmSync(base, { recursive: true, force: true })
    base = undefined
  })

  it('정상 사본은 문제가 없다', () => {
    const { mirror, bundle, lock } = setupBundle()
    expect(verifyBundleFonts(bundle, mirror, lock)).toEqual([])
  })

  it('번들 폰트를 변조하면 변조(ds-bundle)로 잡는다 (기대/실제 해시 포함)', () => {
    const { mirror, bundle, lock } = setupBundle()
    appendFileSync(join(bundle, 'A.woff2'), 'X')
    const problems = verifyBundleFonts(bundle, mirror, lock)
    expect(problems.some((p) => p.startsWith('변조(ds-bundle): A.woff2'))).toBe(true)
    expect(problems.some((p) => p.includes('기대 ') && p.includes('실제 '))).toBe(true)
  })

  it('번들 폰트가 없으면 누락(ds-bundle)으로 잡는다', () => {
    const { mirror, bundle, lock } = setupBundle()
    unlinkSync(join(bundle, 'A.woff2'))
    expect(verifyBundleFonts(bundle, mirror, lock)).toContain('누락(ds-bundle): A.woff2')
  })

  it('lock·라이선스에 없는 파일을 끼워 넣으면 미등록(ds-bundle)으로 잡는다', () => {
    const { mirror, bundle, lock } = setupBundle()
    writeFileSync(join(bundle, 'rogue.woff2'), 'rogue')
    expect(verifyBundleFonts(bundle, mirror, lock)).toContain('미등록 파일(ds-bundle): rogue.woff2')
  })

  it('라이선스 바이트가 다르면 불일치(ds-bundle)로 잡는다', () => {
    const { mirror, bundle, lock } = setupBundle()
    writeFileSync(join(bundle, 'LICENSE-Spoqa.txt'), LICENSE_SPOQA + '변조')
    const problems = verifyBundleFonts(bundle, mirror, lock)
    expect(problems).toContain('불일치(ds-bundle): LICENSE-Spoqa.txt — styles/foundation/fonts 와 다릅니다')
  })

  it('번들 측 라이선스가 없으면 누락(ds-bundle)으로 잡는다', () => {
    const { mirror, bundle, lock } = setupBundle()
    unlinkSync(join(bundle, 'LICENSE-Spoqa.txt'))
    expect(verifyBundleFonts(bundle, mirror, lock)).toContain('누락(ds-bundle): LICENSE-Spoqa.txt')
  })

  it('미러에 없는 번들 전용 라이선스는 미등록(ds-bundle)으로 잡는다', () => {
    const { mirror, bundle, lock } = setupBundle()
    writeFileSync(join(bundle, 'LICENSE-Rogue.txt'), '번들 전용 라이선스')
    expect(verifyBundleFonts(bundle, mirror, lock)).toContain('미등록 파일(ds-bundle): LICENSE-Rogue.txt')
  })

  it('bundleDir 이 없으면 폰트·라이선스가 전부 누락으로 보고된다', () => {
    const { mirror, lock } = setupBundle()
    const problems = verifyBundleFonts(join(base, 'no-such-bundle'), mirror, lock)
    expect(problems).toContain('누락(ds-bundle): A.woff2')
    expect(problems).toContain('누락(ds-bundle): LICENSE-Spoqa.txt')
    expect(problems).toContain('누락(ds-bundle): LICENSE-Material.txt')
  })
})

describe('writeBundleFonts', () => {
  let base

  afterEach(() => {
    if (base) rmSync(base, { recursive: true, force: true })
    base = undefined
  })

  it('디렉토리를 새로 만들어 폰트를 쓰고 added 로 보고한다', () => {
    base = mkdtempSync(join(tmpdir(), 'crefle-writebundle-'))
    const bundle = join(base, 'bundle') // 아직 존재하지 않는다
    const result = writeBundleFonts(bundle, new Map([['A.woff2', FONT_A]]))
    expect(existsSync(join(bundle, 'A.woff2'))).toBe(true)
    expect(readFileSync(join(bundle, 'A.woff2')).equals(FONT_A)).toBe(true)
    expect(result).toEqual({ added: ['A.woff2'], changed: [], removed: [] })
  })

  it('기존 파일이 바뀌면 changed 로 보고하고 덮어쓴다', () => {
    base = mkdtempSync(join(tmpdir(), 'crefle-writebundle-'))
    const bundle = join(base, 'bundle')
    mkdirSync(bundle, { recursive: true })
    writeFileSync(join(bundle, 'A.woff2'), Buffer.from('old-bytes'))
    const result = writeBundleFonts(bundle, new Map([['A.woff2', FONT_A]]))
    expect(readFileSync(join(bundle, 'A.woff2')).equals(FONT_A)).toBe(true)
    expect(result.changed).toEqual(['A.woff2'])
    expect(result.added).toEqual([])
  })

  it('map 에 없는 .woff2 는 removed 로 지운다', () => {
    base = mkdtempSync(join(tmpdir(), 'crefle-writebundle-'))
    const bundle = join(base, 'bundle')
    mkdirSync(bundle, { recursive: true })
    writeFileSync(join(bundle, 'stale.woff2'), Buffer.from('stale'))
    const result = writeBundleFonts(bundle, new Map([['A.woff2', FONT_A]]))
    expect(existsSync(join(bundle, 'stale.woff2'))).toBe(false)
    expect(result.removed).toEqual(['stale.woff2'])
    expect(result.added).toEqual(['A.woff2'])
  })

  it('LICENSE 등 비-woff2 는 map 에 없어도 보존한다 (삭제 금지)', () => {
    base = mkdtempSync(join(tmpdir(), 'crefle-writebundle-'))
    const bundle = join(base, 'bundle')
    mkdirSync(bundle, { recursive: true })
    writeFileSync(join(bundle, 'LICENSE-Spoqa.txt'), LICENSE_SPOQA)
    const result = writeBundleFonts(bundle, new Map([['A.woff2', FONT_A]]))
    expect(existsSync(join(bundle, 'LICENSE-Spoqa.txt'))).toBe(true)
    expect(result.removed).toEqual([])
  })
})
