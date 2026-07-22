// verifyMirror 의 통과 경로 1개와 실패 경로 4개를 임시 디렉토리 픽스처로 검증한다.
import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifyMirror, sha256, LOCK_NAME, listMirrorFiles } from './foundation-lock.mjs'

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
