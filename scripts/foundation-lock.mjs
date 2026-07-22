// 파운데이션 미러(styles/foundation/)의 무결성 계약.
// sync-foundation.mjs 가 lock 을 쓰고, check-foundation.mjs 가 lock 을 검증한다.
// ds-bundle/fonts/ 의 폰트 사본도 이 lock 을 기준으로 검사·동기화한다 (verifyBundleFonts/writeBundleFonts).
// import 시 부수효과 없음 — 프로세스 실행은 아래 git 헬퍼 호출 시에만 일어난다.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { join, relative, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const MIRROR_DIR = join(ROOT, 'styles', 'foundation')
export const BUNDLE_FONTS_DIR = join(ROOT, 'ds-bundle', 'fonts')
export const LOCK_NAME = 'foundation.lock.json'
export const DEFAULT_REPO = 'https://github.com/CREFLEINC/design-system-v2.git'
export const DEFAULT_REF = 'main'

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
