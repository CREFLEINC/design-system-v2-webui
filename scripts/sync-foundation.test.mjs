// sync-foundation.mjs 가 원격 fetch 실패 시에도 임시 디렉토리를 남기지 않는지 검증한다.
// Node 는 process.exit() 를 호출하면 감싸고 있는 finally 블록을 건너뛴다 —
// die() 가 process.exit 대신 에러를 던지도록 고친 회귀 방지 테스트다.
// 오프라인·결정적이어야 하므로 존재하지 않는 file:// 원격을 써서 네트워크 없이 fetch 를 실패시킨다.
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROOT, MIRROR_DIR, verifyMirror } from './foundation-lock.mjs'

const TMP_PREFIX = 'crefle-foundation-'
const SCRIPT = join(ROOT, 'scripts', 'sync-foundation.mjs')

// os.tmpdir() 에서 스크립트가 쓰는 접두어와 일치하는 항목만 골라낸다.
function tmpEntries() {
  return new Set(readdirSync(tmpdir()).filter((name) => name.startsWith(TMP_PREFIX)))
}

describe('sync-foundation: 원격 fetch 실패 시 임시 디렉토리 정리', () => {
  it('git fetch 가 실패해도 임시 디렉토리를 남기지 않고 stderr 에 ✗ 와 함께 exit 1 로 끝난다', () => {
    const before = tmpEntries()

    const env = {
      ...process.env,
      FOUNDATION_REPO: 'file:///nonexistent-crefle-foundation-repo',
      FOUNDATION_REF: 'main'
    }
    delete env.FOUNDATION_DIR // 로컬 소스 분기로 새지 않도록 명시적으로 비운다.

    const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', env })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('✗')

    const leaked = [...tmpEntries()].filter((name) => !before.has(name))
    expect(leaked).toEqual([])

    // fetch 단계에서 죽으므로 미러 디렉토리는 전혀 건드리지 않아야 한다.
    expect(verifyMirror(MIRROR_DIR).problems).toEqual([])
  })
})
