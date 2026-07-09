// 파운데이션 미러(styles/foundation/)의 무결성 계약.
// sync-foundation.mjs 가 lock 을 쓰고, check-foundation.mjs 가 lock 을 검증한다.
// 여기에는 순수 로직만 둔다 — 네트워크도 프로세스도 없다.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const MIRROR_DIR = join(ROOT, 'styles', 'foundation')
export const LOCK_NAME = 'foundation.lock.json'
export const DEFAULT_REPO = 'https://github.com/CREFLEINC/design-system-v2.git'
export const DEFAULT_REF = 'main'

// lock 의 files 에 등재되지 않아도 미러 디렉토리에 존재해도 되는 파일들.
// 파운데이션에서 동기화된 것이 아니라 이 repo 가 소유하는 파일이다.
const ALLOW = [/^foundation\.lock\.json$/, /^README\.md$/, /^fonts\/LICENSE-[^/]+\.txt$/]
export const isAllowed = (rel) => ALLOW.some((re) => re.test(rel))

export const sha256 = (data) => 'sha256:' + createHash('sha256').update(data).digest('hex')
export const hashFile = (abs) => sha256(readFileSync(abs))

// 미러 디렉토리의 모든 파일을 POSIX 상대 경로로 정렬해 나열한다.
export function listMirrorFiles(dir) {
  const out = []
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else out.push(relative(dir, p).split(sep).join('/'))
    }
  }
  if (existsSync(dir)) walk(dir)
  return out
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
