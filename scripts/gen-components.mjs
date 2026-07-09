#!/usr/bin/env node
// docs/COMPONENTS.md 를 src/index.ts 에서 생성한다.
//
//   node scripts/gen-components.mjs           생성/갱신
//   node scripts/gen-components.mjs --check   드리프트 검사. 문서가 코드와 다르면 exit 1
//
// --check 는 게이트(npm run check)에 물려 있다. 컴포넌트를 추가하거나 props 를
// 바꾸고 문서를 갱신하지 않으면 CI 가 막는다. 인벤토리가 코드와 어긋날 수 없게 하려는 것이다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { relative } from 'node:path'
import { ROOT, DOC_PATH, buildInventory, renderMarkdown } from './components-inventory.mjs'

const rel = relative(ROOT, DOC_PATH)
const next = renderMarkdown(buildInventory())
const current = existsSync(DOC_PATH) ? readFileSync(DOC_PATH, 'utf8') : null

if (!process.argv.includes('--check')) {
  writeFileSync(DOC_PATH, next)
  console.log(`${current === next ? '✓ 변경 없음' : '✓ 갱신'} — ${rel}`)
  process.exit(0)
}

if (current === next) {
  console.log(`✓ 컴포넌트 인벤토리가 코드와 일치합니다 — ${rel}`)
  process.exit(0)
}

console.error(`✗ ${rel} 가 src/index.ts 와 어긋났습니다.\n`)
console.error(current === null ? `  ${rel} 가 없습니다.` : '  컴포넌트나 props 가 바뀌었는데 문서가 갱신되지 않았습니다.')
console.error('\n아래를 실행하고 결과를 커밋하세요:\n\n    npm run docs:components\n')
process.exit(1)
