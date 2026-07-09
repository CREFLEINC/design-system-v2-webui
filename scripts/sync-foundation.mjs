#!/usr/bin/env node
// 파운데이션(design-system-v2)의 tokens.css 와 폰트를 styles/foundation/ 으로 동기화하고
// foundation.lock.json 을 재생성한다.
//
//   npm run sync-foundation                              원격 main 에서
//   FOUNDATION_REF=v1.0.0 npm run sync-foundation        특정 태그/커밋/브랜치
//   FOUNDATION_DIR=../foundation npm run sync-foundation 로컬 체크아웃에서 (동시 작업용)
//
// 미러 파일의 내용은 절대 수정하지 않는다 (배너 주입 금지).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MIRROR_DIR, LOCK_NAME, DEFAULT_REPO, DEFAULT_REF, sha256, listMirrorFiles, isAllowed } from './foundation-lock.mjs'

const allowDirty = process.argv.includes('--allow-dirty')
const repo = process.env.FOUNDATION_REPO || DEFAULT_REPO
const ref = process.env.FOUNDATION_REF || DEFAULT_REF
const localDir = process.env.FOUNDATION_DIR

const FONT_DIR_IN_SOURCE = 'ds-bundle/fonts'

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', ...opts })
const gitBuf = (args) => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 })

function die(msg) {
  console.error('✗ ' + msg)
  process.exit(1)
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

function openRemoteSource(tmp) {
  // working tree 를 만들지 않는다. fetch 후 `git show` 로 blob 만 꺼낸다.
  // 이 방식은 브랜치·태그·전체 SHA 를 모두 지원한다.
  git(['init', '--quiet', tmp])
  git(['-C', tmp, 'remote', 'add', 'origin', repo])
  try {
    git(['-C', tmp, 'fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', ref], {
      stdio: ['ignore', 'ignore', 'pipe']
    })
  } catch (e) {
    die(`파운데이션을 가져오지 못했습니다 (repo=${repo}, ref=${ref}).\n${String(e.stderr || e.message).trim()}`)
  }
  const commit = git(['-C', tmp, 'rev-parse', 'FETCH_HEAD']).trim()
  return {
    commit,
    dirty: false,
    read: (p) => gitBuf(['-C', tmp, 'show', `FETCH_HEAD:${p}`]),
    listFonts: () =>
      git(['-C', tmp, 'ls-tree', '--name-only', 'FETCH_HEAD', `${FONT_DIR_IN_SOURCE}/`])
        .trim()
        .split('\n')
        .filter((p) => p.endsWith('.woff2'))
  }
}

let tmp
try {
  const src = localDir ? openLocalSource(localDir) : openRemoteSource((tmp = mkdtempSync(join(tmpdir(), 'crefle-foundation-'))))
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

  // 요약.
  const added = [...next.keys()].filter((r) => !before.has(r))
  const changed = [...next.keys()].filter((r) => before.has(r) && before.get(r) !== files[r])
  const removed = [...before.keys()].filter((r) => !next.has(r))
  const fmt = (label, list) => (list.length ? `  ${label}: ${list.join(', ')}` : null)
  const lines = [fmt('추가', added), fmt('변경', changed), fmt('삭제', removed)].filter(Boolean)
  console.log(`✓ 동기화 완료 (${next.size}개 파일)`)
  console.log(lines.length ? lines.join('\n') : '  변경 없음 — 미러가 이미 최신입니다.')
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true })
}
