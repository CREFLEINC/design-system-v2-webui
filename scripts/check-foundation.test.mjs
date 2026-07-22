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
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROOT, MIRROR_DIR, verifyMirror } from './foundation-lock.mjs'

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
function makeRemoteRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), 'crefle-fixture-remote-'))
  git(['init', '--quiet', '-b', 'main', dir])
  for (const [rel, content] of Object.entries(files)) writeFileSync(join(dir, rel), content)
  git(['-C', dir, 'add', '-A'])
  git(['-C', dir, '-c', 'user.email=test@test.invalid', '-c', 'user.name=test', 'commit', '--quiet', '-m', 'fixture'])
  return dir
}

function runUpstream(repoDir) {
  const env = {
    ...process.env,
    FOUNDATION_REPO: `file://${repoDir}`,
    FOUNDATION_REF: 'main'
  }
  return spawnSync(process.execPath, [SCRIPT, '--upstream'], { encoding: 'utf8', env })
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
