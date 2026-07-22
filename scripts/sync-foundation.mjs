#!/usr/bin/env node
// 파운데이션(design-system-v2)의 tokens.css 와 폰트를 styles/foundation/ 으로 동기화하고
// foundation.lock.json 을 재생성한다.
//
//   npm run sync-foundation                              원격 main 에서
//   FOUNDATION_REF=v1.0.0 npm run sync-foundation        특정 태그/커밋/브랜치
//   FOUNDATION_DIR=../foundation npm run sync-foundation 로컬 체크아웃에서 (동시 작업용)
//
// 미러 파일의 내용은 절대 수정하지 않는다 (배너 주입 금지).
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  MIRROR_DIR,
  BUNDLE_FONTS_DIR,
  LOCK_NAME,
  DEFAULT_REPO,
  DEFAULT_REF,
  FONT_DIR_IN_SOURCE,
  sha256,
  listMirrorFiles,
  isAllowed,
  writeBundleFonts,
  openRemoteSource,
  git
} from './foundation-lock.mjs'

const allowDirty = process.argv.includes('--allow-dirty')
const repo = process.env.FOUNDATION_REPO || DEFAULT_REPO
const ref = process.env.FOUNDATION_REF || DEFAULT_REF
const localDir = process.env.FOUNDATION_DIR

// die() 는 process.exit 를 직접 호출하지 않는다 — process.exit 은 감싸고 있는
// finally 블록(임시 디렉토리 정리)을 건너뛰기 때문이다. 대신 이 타입을 던지고,
// 최상위 흐름에서 잡아 메시지를 찍은 뒤 exitCode 만 설정한다.
class FoundationSyncError extends Error {
  constructor(message) {
    super(message)
    this.name = 'FoundationSyncError'
  }
}

function die(msg) {
  throw new FoundationSyncError(msg)
}

// 소스에서 { commit, dirty, read(path) -> Buffer, listFonts() -> string[] } 를 만든다.
function openLocalSource(dir) {
  if (!existsSync(join(dir, 'tokens.css'))) die(`FOUNDATION_DIR 에 tokens.css 가 없습니다: ${dir}`)
  const status = git(['-C', dir, 'status', '--porcelain', '--', 'tokens.css', FONT_DIR_IN_SOURCE]).trim()
  const dirty = status.length > 0
  if (dirty && !allowDirty)
    die(
      `FOUNDATION_DIR 의 working tree 가 dirty 합니다. 커밋하거나 --allow-dirty 를 쓰세요.\n${status}`
    )
  const commit = git(['-C', dir, 'rev-parse', 'HEAD']).trim()
  return {
    commit,
    dirty,
    read: (p) => readFileSync(join(dir, ...p.split('/'))),
    listFonts: () =>
      git(['-C', dir, 'ls-files', '--', `${FONT_DIR_IN_SOURCE}/*.woff2`])
        .trim()
        .split('\n')
        .filter(Boolean)
  }
}

let tmp
try {
  try {
    const src = localDir
      ? openLocalSource(localDir)
      : openRemoteSource((tmp = mkdtempSync(join(tmpdir(), 'crefle-foundation-'))), {
          repo,
          ref,
          // fetch 실패 시 sync 의 die() 로 위임 — 임시 디렉토리를 정리한 뒤 ✗ 메시지 + exit 1 (동작 불변).
          onFetchError: (e) =>
            die(`파운데이션을 가져오지 못했습니다 (repo=${repo}, ref=${ref}).\n${String(e.stderr || e.message).trim()}`)
        })
    console.log(`파운데이션 소스: ${localDir ? localDir : `${repo} @ ${ref}`}  (${src.commit.slice(0, 7)}${src.dirty ? ', dirty' : ''})`)

    const before = new Map(
      listMirrorFiles(MIRROR_DIR)
        .filter((rel) => !isAllowed(rel))
        .map((rel) => [rel, sha256(readFileSync(join(MIRROR_DIR, ...rel.split('/'))))])
    )

    // 새 내용을 모은다.
    const next = new Map()
    next.set('tokens.css', src.read('tokens.css'))
    for (const p of src.listFonts()) next.set(`fonts/${p.split('/').pop()}`, src.read(p))

    // 디스크에 쓴다.
    mkdirSync(join(MIRROR_DIR, 'fonts'), { recursive: true })
    for (const [rel, buf] of next) writeFileSync(join(MIRROR_DIR, ...rel.split('/')), buf)

    // 더 이상 존재하지 않는 미러 파일은 지운다.
    for (const rel of before.keys()) if (!next.has(rel)) unlinkSync(join(MIRROR_DIR, ...rel.split('/')))

    // lock 을 쓴다.
    const files = {}
    for (const rel of [...next.keys()].sort()) files[rel] = sha256(next.get(rel))
    const lock = {
      repo,
      ref,
      commit: src.commit,
      syncedAt: new Date().toISOString(),
      ...(src.dirty ? { dirty: true } : {}),
      files
    }
    writeFileSync(join(MIRROR_DIR, LOCK_NAME), JSON.stringify(lock, null, 2) + '\n')

    // 옛 PIN 파일 제거.
    const pin = join(MIRROR_DIR, 'PIN')
    if (existsSync(pin)) unlinkSync(pin)

    // ds-bundle/fonts/ 사본에 폰트를 전파한다 (자체 완결 번들이 CDN 없이 폰트를 안고 있어야 하므로).
    // 라이선스 등 비-woff2 는 건드리지 않는다 — 검사(verifyBundleFonts)가 이탈을 잡고 사람이 고친다.
    const bundleFonts = new Map()
    for (const [rel, buf] of next) if (rel.startsWith('fonts/')) bundleFonts.set(rel.slice('fonts/'.length), buf)
    const bundleResult = writeBundleFonts(BUNDLE_FONTS_DIR, bundleFonts)

    // 요약.
    const added = [...next.keys()].filter((r) => !before.has(r))
    const changed = [...next.keys()].filter((r) => before.has(r) && before.get(r) !== files[r])
    const removed = [...before.keys()].filter((r) => !next.has(r))
    const fmt = (label, list) => (list.length ? `  ${label}: ${list.join(', ')}` : null)
    const lines = [fmt('추가', added), fmt('변경', changed), fmt('삭제', removed)].filter(Boolean)
    console.log(`✓ 동기화 완료 (${next.size}개 파일)`)
    console.log(lines.length ? lines.join('\n') : '  변경 없음 — 미러가 이미 최신입니다.')

    // ds-bundle 사본 결과 (기존 미러 요약과 구별되게 명시).
    const bundleLines = [
      fmt('추가', bundleResult.added),
      fmt('변경', bundleResult.changed),
      fmt('삭제', bundleResult.removed)
    ].filter(Boolean)
    console.log(
      bundleLines.length
        ? `  ds-bundle/fonts 사본 갱신:\n${bundleLines.map((l) => '  ' + l).join('\n')}`
        : '  ds-bundle/fonts 사본: 변경 없음'
    )
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true })
  }
} catch (e) {
  // die() 가 던진 에러만 여기서 처리한다 — finally 로 임시 디렉토리를 정리한 뒤이므로,
  // 메시지를 찍고 exitCode 만 설정해도 process.exit 과 동일한 사용자 경험을 준다.
  if (e instanceof FoundationSyncError) {
    console.error('✗ ' + e.message)
    process.exitCode = 1
  } else {
    throw e
  }
}
