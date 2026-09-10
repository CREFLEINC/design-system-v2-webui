#!/usr/bin/env node
// ds-bundle/guidelines/ 의 «사본» 문서를 docs/ 원본에서 갱신한다.
//
//   node scripts/sync-bundle-guidelines.mjs           사본 갱신
//   node scripts/sync-bundle-guidelines.mjs --check   드리프트 검사. 사본이 원본과 다르면 exit 1
//
// --check 는 게이트(npm run check)에 물려 있다. docs/ 를 고치고 번들 사본을 두고 가면 CI 가 막는다.
//
// 왜 사본이 두 벌인가: docs/ 는 저장소에서 읽는 문서고, ds-bundle/ 은 Claude Design 에
// 발행되는 자체 완결 묶음이다(.design-sync/NOTES.md). 번들은 저장소 밖으로 나가므로
// docs/ 를 상대 경로로 참조할 수 없어 사본을 동봉한다.
//
// 방향은 docs/ → ds-bundle/guidelines/ 다. 히스토리가 그렇게 말한다 — 4b72538(phase 5)이
// 당시의 docs/ 에서 번들 사본을 만들었고, 이후 관례는 한 커밋에서 양쪽을 함께 고치는 것이었다.
// 사람이 읽고 쓰는 쪽이 원본이고, 번들은 발행용 파생물이다.
//
// PAIRED 에 없는 번들 문서(colors.md·tokens.md·type.md)는 docs/ 에 대응이 없는 번들
// 고유 문서다 — 이 스크립트의 대상이 아니다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SELF = fileURLToPath(import.meta.url)
const ROOT = join(dirname(SELF), '..')

/** docs/<name> → ds-bundle/guidelines/<name> 로 동봉되는 문서 */
const PAIRED = ['component-conventions.md', 'patterns.md', 'reduced-motion.md']

const FIX = `
ds-bundle/guidelines/ 의 위 문서는 docs/ 원본의 사본입니다.
직접 수정하지 마세요. docs/ 에서 고친 뒤 아래를 실행하세요:

    npm run sync:bundle-guidelines

번들은 Claude Design 에 발행되는 자체 완결 묶음이라, docs/ 만 고치면
발행된 쪽이 낡은 규칙을 계속 보여줍니다.
`

const check = process.argv.includes('--check')
const drifted = []
const updated = []

for (const name of PAIRED) {
  const srcPath = join(ROOT, 'docs', name)
  const dstPath = join(ROOT, 'ds-bundle', 'guidelines', name)

  if (!existsSync(srcPath)) {
    console.error(`✗ 원본이 없습니다 — ${relative(ROOT, srcPath)}`)
    console.error(`\n  PAIRED 목록과 실제 파일이 어긋났습니다. ${relative(ROOT, SELF)} 의 PAIRED 를 확인하세요.\n`)
    process.exit(1)
  }

  const src = readFileSync(srcPath, 'utf8')
  const dst = existsSync(dstPath) ? readFileSync(dstPath, 'utf8') : null

  if (src === dst) continue

  if (check) {
    drifted.push({ name, missing: dst === null })
  } else {
    writeFileSync(dstPath, src)
    updated.push(name)
  }
}

if (!check) {
  console.log(
    updated.length === 0
      ? `✓ 변경 없음 — 번들 사본 ${PAIRED.length}개가 docs/ 원본과 일치합니다`
      : `✓ 갱신 — ${updated.map((n) => `ds-bundle/guidelines/${n}`).join(', ')}`
  )
  process.exit(0)
}

if (drifted.length === 0) {
  console.log(`✓ 번들 사본 일치 — docs/ ↔ ds-bundle/guidelines/ 문서 ${PAIRED.length}개`)
  process.exit(0)
}

console.error('✗ ds-bundle/guidelines/ 사본이 docs/ 원본과 어긋났습니다\n')
for (const { name, missing } of drifted) {
  console.error(missing ? `  - ${name} (사본이 없습니다)` : `  - ${name}`)
}
console.error(FIX)
process.exit(1)
