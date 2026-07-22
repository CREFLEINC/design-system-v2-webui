// 파운데이션 미러(styles/foundation/)의 무결성 계약.
// sync-foundation.mjs 가 lock 을 쓰고, check-foundation.mjs 가 lock 을 검증한다.
// ds-bundle/fonts/ 의 폰트 사본도 이 lock 을 기준으로 검사·동기화한다 (verifyBundleFonts/writeBundleFonts).
// import 시 부수효과 없음 — 프로세스 실행은 아래 git 헬퍼 호출 시에만 일어난다.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const MIRROR_DIR = join(ROOT, 'styles', 'foundation')
export const BUNDLE_FONTS_DIR = join(ROOT, 'ds-bundle', 'fonts')
export const LOCK_NAME = 'foundation.lock.json'
export const DEFAULT_REPO = 'https://github.com/CREFLEINC/design-system-v2.git'
export const DEFAULT_REF = 'main'

// 파운데이션 소스 내 폰트 디렉토리. sync 의 openLocalSource/openRemoteSource 와
// verifyAgainstUpstream 이 공유한다 (평평한 ds-bundle/fonts/*.woff2 를 미러의 fonts/* 로 매핑).
export const FONT_DIR_IN_SOURCE = 'ds-bundle/fonts'

// git 헬퍼 — sync/check 스크립트가 공유. 호출 시에만 프로세스 실행, import 부수효과 없음.
export const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', ...opts })
export const gitBuf = (args, opts = {}) => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024, ...opts })

// lock 의 files 에 등재되지 않아도 미러 디렉토리에 존재해도 되는 파일들.
// 파운데이션에서 동기화된 것이 아니라 이 repo 가 소유하는 파일이다.
const ALLOW = [/^foundation\.lock\.json$/, /^README\.md$/, /^fonts\/LICENSE-[^/]+\.txt$/]
export const isAllowed = (rel) => ALLOW.some((re) => re.test(rel))

// ds-bundle/fonts/ 는 평평한 디렉토리라 라이선스 파일명이 곧 상대경로다 (fonts/ 접두어 없음).
const LICENSE_RE = /^LICENSE-[^/]+\.txt$/

export const sha256 = (data) => 'sha256:' + createHash('sha256').update(data).digest('hex')
export const hashFile = (abs) => sha256(readFileSync(abs))

// 미러 디렉토리의 모든 파일을 POSIX 상대 경로로 정렬해 나열한다.
export function listMirrorFiles(dir) {
  const out = []
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else out.push(relative(dir, p).split(sep).join('/'))
    }
  }
  if (existsSync(dir)) walk(dir)
  return out.sort()
}

// lock 과 디스크를 대조한다. 문제가 없으면 problems 는 빈 배열.
export function verifyMirror(dir) {
  const problems = []
  const lockPath = join(dir, LOCK_NAME)

  if (!existsSync(lockPath)) {
    problems.push(`${LOCK_NAME} 이(가) 없습니다. npm run sync-foundation 을 실행하세요.`)
    return { lock: null, problems }
  }

  let lock
  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  } catch (e) {
    problems.push(`${LOCK_NAME} 파싱 실패: ${e.message}`)
    return { lock: null, problems }
  }
  if (!lock.files || typeof lock.files !== 'object') {
    problems.push(`${LOCK_NAME} 에 files 필드가 없습니다.`)
    return { lock: null, problems }
  }

  // 1) lock 에 적힌 파일은 존재해야 하고 해시가 일치해야 한다.
  for (const [rel, expected] of Object.entries(lock.files)) {
    const abs = join(dir, ...rel.split('/'))
    if (!existsSync(abs)) {
      problems.push(`누락: ${rel}`)
      continue
    }
    const actual = hashFile(abs)
    if (actual !== expected) problems.push(`변조: ${rel}\n      기대 ${expected}\n      실제 ${actual}`)
  }

  // 2) lock 에 없는 파일은 허용 목록에 있어야 한다. (몰래 끼워 넣기 방지)
  for (const rel of listMirrorFiles(dir))
    if (!(rel in lock.files) && !isAllowed(rel)) problems.push(`미등록 파일: ${rel}`)

  return { lock, problems }
}

// ds-bundle/fonts/ 의 폰트 사본을 미러·lock 과 대조한다. 문제가 없으면 빈 배열.
// 두 사본이 바이트 동일하므로 lock 의 fonts/* 해시를 그대로 번들 검사 기준으로 쓴다
// (lock 스키마·verifyMirror 무변경). 세 가지 규칙을 본다:
//   1) lock 의 fonts/* 항목이 번들에 존재하고 해시가 일치해야 한다.
//   2) 미러의 폰트 라이선스가 번들에도 동일 바이트로 존재해야 한다 (라이선스 이탈 차단).
//   3) 번들의 나머지 파일은 (1)의 폰트이거나 (2)의 라이선스여야 한다 (번들 전용 반입 차단).
// lock?.files 가 없으면 빈 배열(호출자는 lock 파싱 성공 시에만 호출). bundleDir 부재 시 (1)이 전부 누락으로 보고.
export function verifyBundleFonts(bundleDir, mirrorDir, lock) {
  const problems = []
  if (!lock || !lock.files || typeof lock.files !== 'object') return problems

  // 1) lock 폰트 전수 대조.
  const fontBases = new Set()
  for (const [rel, expected] of Object.entries(lock.files)) {
    if (!rel.startsWith('fonts/')) continue
    const base = rel.slice('fonts/'.length)
    fontBases.add(base)
    const abs = join(bundleDir, ...base.split('/'))
    if (!existsSync(abs)) {
      problems.push(`누락(ds-bundle): ${base}`)
      continue
    }
    const actual = hashFile(abs)
    if (actual !== expected) problems.push(`변조(ds-bundle): ${base}\n      기대 ${expected}\n      실제 ${actual}`)
  }

  // 2) 라이선스 양방향 동일 (미러 → 번들: 누락·바이트 불일치 차단).
  const mirrorFontsDir = join(mirrorDir, 'fonts')
  const mirrorLicenses = new Set()
  for (const name of listMirrorFiles(mirrorFontsDir)) {
    if (!LICENSE_RE.test(name)) continue
    mirrorLicenses.add(name)
    const bundleAbs = join(bundleDir, name)
    if (!existsSync(bundleAbs)) {
      problems.push(`누락(ds-bundle): ${name}`)
      continue
    }
    if (!readFileSync(bundleAbs).equals(readFileSync(join(mirrorFontsDir, name))))
      problems.push(`불일치(ds-bundle): ${name} — styles/foundation/fonts 와 다릅니다`)
  }

  // 3) 미등록 차단 (번들 → 미러: 번들 전용 폰트/라이선스 반입 차단).
  for (const rel of listMirrorFiles(bundleDir)) {
    if (fontBases.has(rel)) continue
    if (LICENSE_RE.test(rel) && mirrorLicenses.has(rel)) continue
    problems.push(`미등록 파일(ds-bundle): ${rel}`)
  }

  return problems
}

// sync 가 미러에 쓴 폰트를 ds-bundle/fonts/ 사본에도 전파한다. fonts: Map<basename, Buffer>.
// .woff2 인데 map 에 없는 파일만 지운다 — LICENSE 등 비-woff2 는 절대 지우지 않는다
// (검사가 라이선스 이탈을 잡고, 사람이 고친다). { added, changed, removed }(basename 배열) 반환.
export function writeBundleFonts(bundleDir, fonts) {
  mkdirSync(bundleDir, { recursive: true })

  const before = new Map()
  for (const rel of listMirrorFiles(bundleDir)) before.set(rel, hashFile(join(bundleDir, ...rel.split('/'))))

  const added = []
  const changed = []
  for (const [base, buf] of fonts) {
    const nextHash = sha256(buf)
    if (!before.has(base)) added.push(base)
    else if (before.get(base) !== nextHash) changed.push(base)
    writeFileSync(join(bundleDir, ...base.split('/')), buf)
  }

  const removed = []
  for (const rel of before.keys())
    if (rel.endsWith('.woff2') && !fonts.has(rel)) {
      unlinkSync(join(bundleDir, ...rel.split('/')))
      removed.push(rel)
    }

  return { added: added.sort(), changed: changed.sort(), removed: removed.sort() }
}

// 원격 파운데이션 리포에서 { commit, dirty:false, read(path)->Buffer, listFonts()->string[] } 를 만든다.
// working tree 를 만들지 않는다 — fetch 후 `git show`/`ls-tree` 로 blob 만 꺼낸다.
// 브랜치·태그·전체 SHA 를 모두 지원한다 (verify 는 lock.commit(SHA) 를, sync 는 브랜치/태그를 넘긴다).
// fetch 실패 처리는 호출자에 위임한다: onFetchError 가 있으면 그 반환값을 그대로 돌려주고
// (sync 는 die() 로 던진다), 없으면 원본 에러를 다시 던진다 (verify 는 잡아서 "커밋 미존재"로 분류).
// sync 는 이 헬퍼를 공유해 쓴다 (PR #26 의 스크립트 헬퍼 공유 컨벤션). 동작 불변.
export function openRemoteSource(tmp, { repo, ref, onFetchError } = {}) {
  git(['init', '--quiet', tmp])
  git(['-C', tmp, 'remote', 'add', 'origin', repo])
  try {
    git(['-C', tmp, 'fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', ref], {
      stdio: ['ignore', 'ignore', 'pipe']
    })
  } catch (e) {
    if (onFetchError) return onFetchError(e)
    throw e
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

// 에러에서 사용자에게 보여줄 첫 줄만 뽑는다 (git stderr 우선, 없으면 message).
const firstErrLine = (e) =>
  String((e && (e.stderr || e.message)) || e)
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean) || ''

// ── 신뢰 루트 upstream 대조 (fail-closed 위조 검증) ────────────────────────────
// lock 을 파운데이션 원본(@lock.commit)과 대조한다. 문제가 없으면 problems 는 빈 배열.
//
// 신뢰 루트를 lock(웹UI PR 작성자가 같은 PR 에서 위조 가능) → 파운데이션 리포(그가 건드릴 수
// 없음)로 옮긴다. 그래서 이 함수는 lock.files 를 신뢰하지 않고, "무엇이 있어야 하는지"를
// upstream 내용에서 도출한 뒤 lock 과 대조한다.
//
// fail-closed: 검증을 완료하지 못하면(네트워크·인증 실패, 커밋 미존재 포함) 성공으로 치지 않는다.
// 모든 실패 경로는 problems 에 담기며, 어떤 예외도 밖으로 새지 않는다 (finally 로 임시 디렉토리 정리).
//
// 검사 3항목:
//   ① lock.commit 을 depth-1 로 fetch 가능해야 한다 (불가 = 위조 SHA 또는 rebase 로 사라진 커밋).
//   ② 기대 파일 집합 {tokens.css} ∪ {fonts/<basename>: FETCH_HEAD 의 ds-bundle/fonts/*.woff2} 가
//      lock.files 키 집합과 정확히 동일해야 한다 (항목 삭제 위조 차단).
//   ③ 각 파일의 sha256 이 lock 값과 일치해야 한다.
//
// 에러 메시지 3계열(운영자가 원인을 즉시 식별하도록):
//   - 인증/네트워크 실패  → FOUNDATION_PAT/자격증명 안내
//   - 커밋 미존재         → 위조 의심 또는 rebase, npm run sync-foundation 재실행 안내
//   - 집합/해시 불일치     → 위조·손상 경고
export function verifyAgainstUpstream(lock, { repo } = {}) {
  const problems = []
  const short = (s) => String(s).slice(0, 7)

  if (!lock || typeof lock.commit !== 'string' || !lock.files || typeof lock.files !== 'object') {
    problems.push('lock 이 유효하지 않습니다 (commit/files 필드 없음) — 업스트림 대조를 수행할 수 없습니다.')
    return problems
  }
  const target = repo || lock.repo || DEFAULT_REPO

  // 연결·인증을 먼저 확인한다. 이래야 아래 fetch 실패를 "커밋 미존재"와 명확히 구분할 수 있다.
  // (ls-remote 성공 = 원격 접근 가능 → 이후 fetch 실패는 그 SHA 가 없다는 뜻.)
  try {
    git(['ls-remote', target, 'HEAD'], { stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) {
    problems.push(
      `업스트림 접근 실패 (repo=${target}) — 네트워크 또는 인증 문제입니다.\n` +
        `      CI 라면 FOUNDATION_PAT secret 을, 로컬이라면 git 자격증명을 확인하세요.\n` +
        `      원인: ${firstErrLine(e)}`
    )
    return problems
  }

  let tmp
  try {
    tmp = mkdtempSync(join(tmpdir(), 'crefle-verify-'))

    // ① lock.commit(SHA) 을 대상으로 fetch. 실패 = 그 커밋이 upstream 에 없음.
    let src
    try {
      src = openRemoteSource(tmp, { repo: target, ref: lock.commit })
    } catch (e) {
      problems.push(
        `커밋 ${short(lock.commit)} 을(를) 업스트림에서 가져올 수 없습니다 — ` +
          `lock.commit 이 위조되었거나 업스트림 rebase 로 사라진 커밋입니다.\n` +
          `      npm run sync-foundation 을 재실행해 lock 을 갱신하세요.\n` +
          `      원인: ${firstErrLine(e)}`
      )
      return problems
    }

    // ② 기대 파일 집합·해시를 upstream 내용에서 도출한다 (lock 을 신뢰하지 않는다).
    const expected = { 'tokens.css': sha256(src.read('tokens.css')) }
    for (const p of src.listFonts()) expected[`fonts/${p.split('/').pop()}`] = sha256(src.read(p))

    const expectedKeys = new Set(Object.keys(expected))
    const lockKeys = new Set(Object.keys(lock.files))
    const at = short(src.commit)

    // 집합 대조 (양방향) — 항목 삭제/추가 위조를 잡는다.
    for (const k of [...expectedKeys].sort())
      if (!lockKeys.has(k)) problems.push(`집합 불일치: 업스트림 @${at} 에는 있으나 lock 에 없는 파일 — ${k} (삭제 위조·손상 의심)`)
    for (const k of [...lockKeys].sort())
      if (!expectedKeys.has(k)) problems.push(`집합 불일치: lock 에는 있으나 업스트림 @${at} 에 없는 파일 — ${k} (반입 위조·손상 의심)`)

    // ③ 해시 대조 (양쪽에 있는 키만).
    for (const k of [...expectedKeys].sort()) {
      if (!lockKeys.has(k)) continue
      if (expected[k] !== lock.files[k])
        problems.push(
          `해시 불일치: ${k} 가 업스트림 @${at} 와 다릅니다 (위조·손상 의심)\n` +
            `      lock     ${lock.files[k]}\n` +
            `      업스트림 ${expected[k]}`
        )
    }
  } catch (e) {
    // 예상치 못한 실패도 fail-closed — 성공으로 치지 않는다.
    problems.push(`업스트림 대조 중 예기치 못한 오류 (fail-closed): ${firstErrLine(e)}`)
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true })
  }

  return problems
}
