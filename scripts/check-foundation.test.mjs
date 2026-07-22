// check-foundation.mjs --upstream 의 staleness 분기(checkUpstream())가
// mkdtempSync 로 만든 임시 디렉토리를 실제로 정리하는지 검증한다.
//
// 이전 버전은 존재하지 않는 file:// 원격 하나로 "모든" 경우를 대신했다. 하지만
// checkUpstream() 은 `git ls-remote` 를 가장 먼저 호출하고, 그게 실패하면(exit 128)
// mkdtempSync 가 호출되기도 전에 바깥 catch 로 빠진다 — tmp 는 계속 undefined 로 남고
// finally 의 rmSync 는 아무 것도 지우지 않는다. 즉 "임시 디렉토리를 남기지 않는다"는
// 단언이 cleanup 로직이 완전히 망가져 있어도 항상 참인, 공허한(vacuous) 테스트였다.
//
// mkdtempSync 는 ls-remote 가 성공하고 원격 커밋이 lock.commit 과 다를 때에만
// 호출된다(check-foundation.mjs:56). 이 파일은 그 경로를 실제로 타도록 로컬 git
// 저장소를 원격처럼 만들어(file://, 오프라인·결정적) 아래 3가지를 각각 검증한다:
//
//   1) tokens.css 가 다름              → mkdtempSync 호출 + 정상 fetch + 경고 후 exit 0
//   2) 커밋은 있지만 tokens.css 가 없음 → mkdtempSync 호출 + `git show` 실패 + exit 0
//   3) ls-remote 자체가 실패           → mkdtempSync 미호출(비교 대상, 정직하게 표기)
import { describe, it, expect, afterEach } from 'vitest'
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { ROOT, MIRROR_DIR, verifyMirror, verifyAgainstUpstream, sha256 } from './foundation-lock.mjs'

const TMP_PREFIX = 'crefle-upstream-' // check-foundation.mjs 의 mkdtempSync 접두어와 동일해야 한다.
const SCRIPT = join(ROOT, 'scripts', 'check-foundation.mjs')

// os.tmpdir() 에서 스크립트가 쓰는 접두어와 일치하는 항목만 골라낸다.
function tmpEntries() {
  return new Set(readdirSync(tmpdir()).filter((name) => name.startsWith(TMP_PREFIX)))
}

const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

// tokens.css(또는 다른 파일) 하나를 커밋한 로컬 git 저장소를 만들어 원격처럼 쓴다.
// 접두어를 TMP_PREFIX 와 다르게 둬서(crefle-fixture-remote-) leaked-dir 판정에서
// 픽스처 자신이 오검출되지 않게 한다.
// files 의 키는 POSIX 경로이며 중첩 디렉토리(ds-bundle/fonts/…)를 지원한다.
function makeRemoteRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), 'crefle-fixture-remote-'))
  git(['init', '--quiet', '-b', 'main', dir])
  // verifyAgainstUpstream 은 lock.commit(SHA) 을 직접 fetch 한다. file:// 원격은 임의 SHA
  // fetch 를 기본 거부하므로, reachable SHA fetch 를 명시적으로 허용한다(GitHub 는 기본 허용 — 분석가 실증).
  // ref(main) 기반 fetch 를 쓰는 기존 --upstream 테스트에는 영향이 없다.
  git(['-C', dir, 'config', 'uploadpack.allowReachableSHA1InWant', 'true'])
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, ...rel.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  git(['-C', dir, 'add', '-A'])
  git(['-C', dir, '-c', 'user.email=test@test.invalid', '-c', 'user.name=test', 'commit', '--quiet', '-m', 'fixture'])
  return dir
}

const headCommit = (dir) => git(['-C', dir, 'rev-parse', 'HEAD']).trim()

// extraArgs 는 기본 빈 배열 — 기존 호출부(runUpstream(remote))는 동작 불변.
function runUpstream(repoDir, extraArgs = []) {
  const env = {
    ...process.env,
    FOUNDATION_REPO: `file://${repoDir}`,
    FOUNDATION_REF: 'main'
  }
  return spawnSync(process.execPath, [SCRIPT, '--upstream', ...extraArgs], { encoding: 'utf8', env })
}

let remoteDirs = []
afterEach(() => {
  for (const d of remoteDirs) rmSync(d, { recursive: true, force: true })
  remoteDirs = []
})

describe('check-foundation --upstream: 임시 디렉토리 정리', () => {
  it('원격이 앞서 있고 tokens.css 가 다르면 경고 후 exit 0 이며 임시 디렉토리를 남기지 않는다 (mkdtempSync 실사용 경로)', () => {
    // 이 미러 자체는 손대지 않는다 — tamper 검사가 먼저 통과해야 --upstream 분기에 도달한다.
    expect(verifyMirror(MIRROR_DIR).problems).toEqual([])

    const before = tmpEntries()

    // 실제 미러의 tokens.css 와 다른 내용을 가진 원격 커밋 하나를 만든다.
    // 새로 만든 커밋의 SHA-1 은 foundation.lock.json 의 commit 과 다를 수밖에 없으므로
    // checkUpstream() 은 ls-remote → commit 비교를 지나 mkdtempSync 까지 반드시 도달한다.
    const remote = makeRemoteRepo({ 'tokens.css': ':root { --crefle-fixture-differs: 1; }\n' })
    remoteDirs.push(remote)

    const result = runUpstream(remote)
    const output = result.stdout + result.stderr

    expect(result.status).toBe(0)
    expect(output).toContain('tokens.css 가 변경되었습니다')
    expect(output).toContain('npm run sync-foundation')

    const leaked = [...tmpEntries()].filter((name) => !before.has(name))
    expect(leaked).toEqual([])

    // 이 분기는 원격을 fetch 만 할 뿐, 로컬 미러(styles/foundation/)에는 절대 쓰지 않는다.
    expect(verifyMirror(MIRROR_DIR).problems).toEqual([])
  })

  it('원격 커밋에 tokens.css 가 없어 git show 가 실패해도(mkdtempSync 이후) 임시 디렉토리를 남기지 않고 exit 0 으로 끝난다', () => {
    const before = tmpEntries()

    // tokens.css 가 아닌 다른 파일만 커밋한다 — ls-remote/커밋 비교까지는 통과하지만
    // `git show FETCH_HEAD:tokens.css` 가 fatal: path ... does not exist 로 실패한다.
    const remote = makeRemoteRepo({ 'README.md': '커밋 대상이지만 tokens.css 는 아니다\n' })
    remoteDirs.push(remote)

    const result = runUpstream(remote)
    const output = result.stdout + result.stderr

    expect(result.status).toBe(0)
    expect(output).toContain('⚠ 업스트림 확인을 건너뜁니다')

    const leaked = [...tmpEntries()].filter((name) => !before.has(name))
    expect(leaked).toEqual([])

    expect(verifyMirror(MIRROR_DIR).problems).toEqual([])
  })

  // 정직하게 표기: 이 케이스는 "원격이 아예 응답하지 않아도 --upstream 이 exit 0 으로
  // 끝난다"는 것만 증명한다. 임시 디렉토리 정리는 증명하지 못한다 — checkUpstream() 의
  // 첫 문장인 `git ls-remote` 자체가 실패하면(exit 128) mkdtempSync 가 호출되기 전에
  // 바깥 catch 로 빠지기 때문이다(tmp 는 undefined 로 남는다). 그래서 위 두 케이스가
  // 실제 cleanup 경로를 담당한다.
  it('[cleanup 비대상] ls-remote 자체가 실패해도(mkdtempSync 미호출) 경고만 찍고 exit 0 으로 끝난다', () => {
    const before = tmpEntries()

    const env = {
      ...process.env,
      FOUNDATION_REPO: 'file:///nonexistent-crefle-upstream-repo',
      FOUNDATION_REF: 'main'
    }

    const result = spawnSync(process.execPath, [SCRIPT, '--upstream'], { encoding: 'utf8', env })

    expect(result.status).toBe(0)
    expect(result.stdout + result.stderr).toContain('⚠')

    // mkdtempSync 가 애초에 호출되지 않으므로 이 단언은 자명하게 참이다(공허함을 인지하고 남긴다).
    const leaked = [...tmpEntries()].filter((name) => !before.has(name))
    expect(leaked).toEqual([])
  })
})

// --strict 는 opt-in: 위 세 케이스(--upstream 단독)의 ⚠ 경로에서만 exit 1 로 바꾼다.
// ✓/ℹ 경로와 --strict 없는 기본 모드는 동작이 달라지지 않는다 (위 describe 가 그 회귀 방어막).
describe('check-foundation --upstream --strict: exit code', () => {
  it('tokens.css 드리프트 시 --strict 는 exit 1 이며 변경 메시지를 담는다', () => {
    const remote = makeRemoteRepo({ 'tokens.css': ':root { --crefle-fixture-strict-differs: 1; }\n' })
    remoteDirs.push(remote)

    const result = runUpstream(remote, ['--strict'])
    const output = result.stdout + result.stderr

    expect(result.status).toBe(1)
    expect(output).toContain('tokens.css 가 변경되었습니다')
  })

  it('원격 ref 를 찾을 수 없으면(ls-remote 실패) --strict 는 exit 1 이다', () => {
    const env = {
      ...process.env,
      FOUNDATION_REPO: 'file:///nonexistent-crefle-upstream-repo',
      FOUNDATION_REF: 'main'
    }

    const result = spawnSync(process.execPath, [SCRIPT, '--upstream', '--strict'], { encoding: 'utf8', env })

    expect(result.status).toBe(1)
    expect(result.stdout + result.stderr).toContain('업스트림 확인을 건너뜁니다')
  })

  it('원격이 앞서 있으나 tokens.css 가 동일하면 --strict 도 exit 0 이다', () => {
    // 실제 미러의 tokens.css 를 그대로 커밋한다 — 커밋 SHA 는 lock.commit 과 다를
    // 수밖에 없으므로(새 저장소) ls-remote → commit 비교를 지나 ℹ 경로에 확실히 도달한다.
    const currentTokens = readFileSync(join(MIRROR_DIR, 'tokens.css'))
    const remote = makeRemoteRepo({ 'tokens.css': currentTokens })
    remoteDirs.push(remote)

    const result = runUpstream(remote, ['--strict'])
    const output = result.stdout + result.stderr

    expect(result.status).toBe(0)
    expect(output).toContain('tokens.css 는 동일합니다')
  })
})

// ── verifyAgainstUpstream (신뢰 루트 대조, fail-closed) ──────────────────────────
// 스크립트가 아니라 함수를 직접 호출한다 — lock 을 손으로 만들어 주입한다(스크립트의
// MIRROR_DIR 은 고정이므로 함수 단위로만 위조 시나리오를 재현할 수 있다).
// upstream 픽스처는 파운데이션 리포 레이아웃(tokens.css 루트 + ds-bundle/fonts/*.woff2)을 흉내낸다.
describe('verifyAgainstUpstream (함수 단위, file:// 픽스처)', () => {
  const TOKENS = ':root { --crefle-verify-fixture: 1; }\n'
  const FONT_A = Buffer.from('woff2-A-bytes-for-verify')

  // 픽스처를 만들고 remoteDirs 에 등록한다(afterEach 가 정리).
  function upstreamFixture() {
    const dir = makeRemoteRepo({ 'tokens.css': TOKENS, 'ds-bundle/fonts/A.woff2': FONT_A })
    remoteDirs.push(dir)
    return dir
  }

  // 픽스처와 정확히 일치하는 lock 객체.
  function lockMatching(dir) {
    return {
      repo: `file://${dir}`,
      ref: 'main',
      commit: headCommit(dir),
      files: { 'tokens.css': sha256(TOKENS), 'fonts/A.woff2': sha256(FONT_A) }
    }
  }

  it('(a) 정상 lock ↔ 픽스처 일치 → 빈 problems', () => {
    const dir = upstreamFixture()
    expect(verifyAgainstUpstream(lockMatching(dir), { repo: `file://${dir}` })).toEqual([])
  })

  it('(b) 해시 위조(tokens.css) → 해시 불일치 보고', () => {
    const dir = upstreamFixture()
    const lock = lockMatching(dir)
    lock.files['tokens.css'] = sha256('forged-tokens-content')
    const problems = verifyAgainstUpstream(lock, { repo: `file://${dir}` })
    expect(problems.some((p) => p.includes('해시 불일치') && p.includes('tokens.css'))).toBe(true)
  })

  it('(c) 존재하지 않는 commit SHA → 커밋 미존재(fetch 실패) 보고', () => {
    const dir = upstreamFixture()
    const lock = lockMatching(dir)
    lock.commit = '0123456789abcdef0123456789abcdef01234567' // reachable 하지 않은 SHA
    const problems = verifyAgainstUpstream(lock, { repo: `file://${dir}` })
    expect(problems.some((p) => p.includes('가져올 수 없습니다') && p.includes('sync-foundation'))).toBe(true)
  })

  it('(d) lock 에서 파일 삭제(집합 불일치) → 보고', () => {
    const dir = upstreamFixture()
    const lock = lockMatching(dir)
    delete lock.files['fonts/A.woff2'] // 폰트 항목을 몰래 제거해 위조를 숨긴다
    const problems = verifyAgainstUpstream(lock, { repo: `file://${dir}` })
    expect(problems.some((p) => p.includes('집합 불일치') && p.includes('fonts/A.woff2'))).toBe(true)
  })

  it('(e) 원격 접근 불가(없는 경로) → 인증/네트워크 실패 보고 (fail-closed)', () => {
    const lock = { repo: 'file:///no', ref: 'main', commit: 'a'.repeat(40), files: { 'tokens.css': sha256(TOKENS) } }
    const problems = verifyAgainstUpstream(lock, { repo: 'file:///nonexistent-crefle-verify-fixture' })
    expect(problems.some((p) => p.includes('업스트림 접근 실패'))).toBe(true)
  })

  it('(f) lock 에 upstream 에 없는 파일이 있으면 집합 불일치(반입 위조)로 잡는다', () => {
    const dir = upstreamFixture()
    const lock = lockMatching(dir)
    lock.files['fonts/ROGUE.woff2'] = sha256('rogue')
    const problems = verifyAgainstUpstream(lock, { repo: `file://${dir}` })
    expect(problems.some((p) => p.includes('집합 불일치') && p.includes('fonts/ROGUE.woff2'))).toBe(true)
  })
})

// ── 스크립트 배선(exit code) ─────────────────────────────────────────────────
// 스크립트는 실제 미러의 고정 lock 을 읽으므로 "통과" 경로는 실 upstream 으로만 재현 가능하다
// (라이브 자가 검증에서 별도 확인). 여기서는 fail-closed 배선을 spawnSync 로 증명한다:
// 오프라인 검사는 통과하지만 원격 접근이 불가하면 exit 1 로 끝나야 한다.
describe('check-foundation --verify-upstream: 스크립트 배선', () => {
  it('원격 접근 불가 시 오프라인 검사 통과 후 fail-closed 로 exit 1 이다', () => {
    // 실제 미러가 clean 해야 오프라인 검사를 통과해 verify 분기에 도달한다.
    expect(verifyMirror(MIRROR_DIR).problems).toEqual([])

    const env = {
      ...process.env,
      FOUNDATION_REPO: 'file:///nonexistent-crefle-verify-wiring',
      GIT_TERMINAL_PROMPT: '0'
    }
    const result = spawnSync(process.execPath, [SCRIPT, '--verify-upstream'], { encoding: 'utf8', env })
    const output = result.stdout + result.stderr

    expect(result.status).toBe(1)
    expect(output).toContain('✓ 파운데이션 미러 무결성 OK') // 오프라인 검사는 통과했다
    expect(output).toContain('업스트림 신뢰 루트 대조 실패') // verify 가 실행되어 fail-closed 로 실패했다

    // verify 분기는 원격을 fetch 만 할 뿐 로컬 미러에는 절대 쓰지 않는다.
    expect(verifyMirror(MIRROR_DIR).problems).toEqual([])
  })
})
