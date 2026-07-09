// check-foundation.mjs --upstream 가 원격에 닿지 못해도 임시 디렉토리를 남기지 않고
// 경고만 찍은 뒤 exit 0 으로 끝나는지 검증한다.
// Node 는 process.exit() 를 호출하면 감싸고 있는 finally 블록을 건너뛴다 — --upstream
// 블록의 process.exit(0) 두 곳을 return 으로 고친 회귀 방지 테스트다 (sync-foundation.test.mjs 와 동일한 취지).
// 오프라인·결정적이어야 하므로 존재하지 않는 file:// 원격을 써서 네트워크 없이 실패시킨다.
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROOT, MIRROR_DIR, verifyMirror } from './foundation-lock.mjs'

const TMP_PREFIX = 'crefle-upstream-'
const SCRIPT = join(ROOT, 'scripts', 'check-foundation.mjs')

// os.tmpdir() 에서 스크립트가 쓰는 접두어와 일치하는 항목만 골라낸다.
function tmpEntries() {
  return new Set(readdirSync(tmpdir()).filter((name) => name.startsWith(TMP_PREFIX)))
}

describe('check-foundation --upstream: 원격을 찾지 못해도 임시 디렉토리를 남기지 않는다', () => {
  it('원격 ls-remote 가 실패해도 경고만 찍고 exit 0 으로 끝나며 임시 디렉토리를 남기지 않는다', () => {
    // 이 미러 자체는 손대지 않는다 — tamper 검사가 먼저 통과해야 --upstream 분기에 도달한다.
    expect(verifyMirror(MIRROR_DIR).problems).toEqual([])

    const before = tmpEntries()

    const env = {
      ...process.env,
      FOUNDATION_REPO: 'file:///nonexistent-crefle-upstream-repo',
      FOUNDATION_REF: 'main'
    }

    const result = spawnSync(process.execPath, [SCRIPT, '--upstream'], { encoding: 'utf8', env })

    expect(result.status).toBe(0)
    expect(result.stdout + result.stderr).toContain('⚠')

    const leaked = [...tmpEntries()].filter((name) => !before.has(name))
    expect(leaked).toEqual([])
  })
})
