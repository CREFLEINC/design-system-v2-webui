#!/usr/bin/env node
// 파운데이션 미러의 무결성을 검사한다.
//
//   node scripts/check-foundation.mjs                        tamper 검사 (오프라인). 불일치 시 exit 1
//   node scripts/check-foundation.mjs --upstream             + staleness 확인. 절대 실패하지 않는다 (fail-open)
//   node scripts/check-foundation.mjs --upstream --strict    신선함을 확실히 확인하지 못하면 exit 1 — cron 워크플로용.
//                                                              기본 모드는 여전히 절대 실패하지 않는다
//   node scripts/check-foundation.mjs --verify-upstream      오프라인 검사 통과 후, lock 을 파운데이션 원본(@lock.commit)과
//                                                              전수 대조한다. 검증 불가(네트워크·인증·커밋 미존재)를 포함해
//                                                              모든 실패가 exit 1 — --upstream 과 정반대의 fail-closed 계약이다.
//                                                              (신뢰 루트를 lock → 파운데이션 리포로 옮겨 같은-PR 위조를 잡는다.)
//
// 기본·--upstream 모드는 파운데이션 repo 에 접근하지 않는다 (lock 파일과 디스크만 대조).
// --verify-upstream 만 예외적으로 원격에 접근한다 — CI 에서는 foundation 변경 PR 에 한해 실행한다.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  MIRROR_DIR,
  BUNDLE_FONTS_DIR,
  DEFAULT_REPO,
  DEFAULT_REF,
  verifyMirror,
  verifyBundleFonts,
  verifyAgainstUpstream,
  listMirrorFiles,
  sha256,
  git as execGit,
  gitBuf
} from './foundation-lock.mjs'

const git = (args) => execGit(args, { stdio: ['ignore', 'pipe', 'pipe'] })

const FIX = `
styles/foundation/ 는 파운데이션 repo(CREFLEINC/design-system-v2)의 동봉본입니다.
직접 수정하지 마세요. 파운데이션에서 고친 뒤 아래를 실행하세요:

    npm run sync-foundation

ds-bundle/fonts/ 는 styles/foundation/fonts/ 의 자체 완결 사본입니다.
직접 수정하지 말고 위 명령으로 양쪽을 함께 갱신하세요.
`

const { lock, problems } = verifyMirror(MIRROR_DIR)

// lock 이 파싱된 경우에만 번들 사본을 검사한다 (lock 실패는 verifyMirror 가 이미 보고).
if (lock) problems.push(...verifyBundleFonts(BUNDLE_FONTS_DIR, MIRROR_DIR, lock))

if (problems.length) {
  console.error('✗ 파운데이션 미러 무결성 검사 실패\n')
  for (const p of problems) console.error('  - ' + p)
  console.error(FIX)
  process.exitCode = 1
} else {
  if (lock.dirty) console.warn('⚠ 이 lock 은 dirty 한 로컬 체크아웃에서 생성되었습니다 (--allow-dirty).')
  console.log(`✓ 파운데이션 미러 무결성 OK — ${Object.keys(lock.files).length}개 파일 @ ${lock.commit.slice(0, 7)}`)

  // 번들 사본 대조 결과 (개수는 lock·디스크에서 도출 — 하드코딩 금지).
  const bundleFontCount = Object.keys(lock.files).filter((k) => k.startsWith('fonts/')).length
  const bundleLicenseCount = listMirrorFiles(BUNDLE_FONTS_DIR).filter((f) => /^LICENSE-[^/]+\.txt$/.test(f)).length
  console.log(`✓ ds-bundle/fonts 사본 일치 — 폰트 ${bundleFontCount}개 + 라이선스 ${bundleLicenseCount}개`)

  if (process.argv.includes('--upstream')) {
    // ---- staleness: 경고 전용. 네트워크·인증 실패도 통과시킨다. ----
    // --strict 는 opt-in: 아래 ⚠ 경로에서만 exit 1 로 바꾼다. ✓/ℹ 경로와
    // --strict 없는 기본 모드는 한 글자도 동작이 달라지지 않는다.
    const strict = process.argv.includes('--strict')
    const repo = process.env.FOUNDATION_REPO || lock.repo || DEFAULT_REPO
    const ref = process.env.FOUNDATION_REF || lock.ref || DEFAULT_REF

    // Node 는 process.exit() 를 호출하면 감싸고 있는 finally 블록을 건너뛴다 —
    // 그래서 이 안에서는 process.exit 대신 return 만 쓴다. finally 의
    // 임시 디렉토리 정리가 어떤 경로로 빠져나가든 항상 실행되도록 하기 위해서다.
    function checkUpstream() {
      let tmp
      try {
        const remote = git(['ls-remote', repo, ref]).trim().split(/\s+/)[0]
        if (!remote) {
          console.warn(`⚠ 원격 ref '${ref}' 를 찾을 수 없습니다. 업스트림 확인을 건너뜁니다.`)
          if (strict) process.exitCode = 1
          return
        }
        if (remote === lock.commit) {
          console.log('✓ 파운데이션 최신 커밋과 동일합니다.')
          return
        }

        tmp = mkdtempSync(join(tmpdir(), 'crefle-upstream-'))
        git(['init', '--quiet', tmp])
        git(['-C', tmp, 'remote', 'add', 'origin', repo])
        git(['-C', tmp, 'fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', ref])
        const upstreamTokens = gitBuf(['-C', tmp, 'show', 'FETCH_HEAD:tokens.css'])

        const short = (s) => s.slice(0, 7)
        if (sha256(upstreamTokens) === lock.files['tokens.css'])
          console.log(`ℹ 파운데이션이 앞서 있으나(${short(lock.commit)} → ${short(remote)}) tokens.css 는 동일합니다 (문서 변경뿐).`)
        else {
          console.warn(
            `⚠ 파운데이션의 tokens.css 가 변경되었습니다 (${short(lock.commit)} → ${short(remote)}).\n` +
              '  npm run sync-foundation 실행을 검토하세요.'
          )
          if (strict) process.exitCode = 1
        }
      } catch (e) {
        console.warn(`⚠ 업스트림 확인을 건너뜁니다 (네트워크/인증 실패): ${String(e.message).split('\n')[0]}`)
        if (strict) process.exitCode = 1
      } finally {
        if (tmp) rmSync(tmp, { recursive: true, force: true })
      }
    }

    checkUpstream()
  }

  if (process.argv.includes('--verify-upstream')) {
    // ---- 신뢰 루트 대조: fail-closed. --upstream 과 달리 검증을 완료하지 못하면 실패시킨다. ----
    // verifyAgainstUpstream 은 모든 실패(네트워크·인증·커밋 미존재·집합/해시 불일치)를
    // problems 로 담고 예외를 스스로 흡수한다. 그래도 혹시 새는 예외까지 fail-closed 로 처리한다.
    const repo = process.env.FOUNDATION_REPO || lock.repo || DEFAULT_REPO
    let verifyProblems
    try {
      verifyProblems = verifyAgainstUpstream(lock, { repo })
    } catch (e) {
      console.error('✗ 업스트림 신뢰 루트 대조 실패 (예기치 못한 오류 — fail-closed)\n')
      console.error('  - ' + String(e.message).split('\n')[0])
      process.exitCode = 1
      verifyProblems = null
    }

    if (verifyProblems && verifyProblems.length) {
      console.error('✗ 업스트림 신뢰 루트 대조 실패 — 웹UI 미러가 파운데이션 원본과 다릅니다\n')
      for (const p of verifyProblems) console.error('  - ' + p)
      console.error(FIX)
      process.exitCode = 1
    } else if (verifyProblems) {
      console.log(`✓ upstream 대조 OK — ${Object.keys(lock.files).length}개 파일 @ ${lock.commit.slice(0, 7)}`)
    }
  }
}
