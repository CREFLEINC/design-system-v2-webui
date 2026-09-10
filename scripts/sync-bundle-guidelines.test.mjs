// #98: docs/ ↔ ds-bundle/guidelines/ 사본 정합.
//
// npm run check:bundle-guidelines 가 게이트지만, 그 게이트는 «자기가 아는 파일»만 본다 —
// 새 사본 쌍을 만들고 스크립트의 PAIRED 에 등록하지 않으면 조용히 지나친다.
// 그 구멍을 여기서 막는다: 실제 파일 시스템에서 쌍을 도출해 게이트의 목록과 대조한다.
import { expect, test } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS_DIR = join(root, 'docs')
const BUNDLE_DIR = join(root, 'ds-bundle', 'guidelines')

const mdNames = (dir) => readdirSync(dir).filter((f) => f.endsWith('.md'))

/** 두 디렉터리에 «같은 이름»으로 존재하는 .md — 이것이 사본 쌍의 정의다 */
const pairedOnDisk = mdNames(BUNDLE_DIR)
  .filter((name) => mdNames(DOCS_DIR).includes(name))
  .sort()

test('사본 쌍이 하나 이상 있다 — 도출 자체가 빈 집합이면 아래 단언이 무의미해진다', () => {
  expect(pairedOnDisk.length).toBeGreaterThan(0)
})

test.each(pairedOnDisk)('%s: docs/ 원본과 ds-bundle/guidelines/ 사본이 완전 동일하다', (name) => {
  const src = readFileSync(join(DOCS_DIR, name), 'utf8')
  const dst = readFileSync(join(BUNDLE_DIR, name), 'utf8')
  expect(dst).toBe(src)
})

test('게이트의 PAIRED 목록이 디스크의 사본 쌍과 정확히 일치한다', () => {
  const source = readFileSync(join(root, 'scripts', 'sync-bundle-guidelines.mjs'), 'utf8')
  const literal = source.match(/const PAIRED = \[([^\]]*)\]/)?.[1]
  expect(literal, 'sync-bundle-guidelines.mjs 에서 PAIRED 배열을 찾지 못했습니다').toBeDefined()

  const declared = [...literal.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()

  // 등록 누락(디스크에 있는데 PAIRED 에 없음)이면 그 쌍은 게이트 밖에서 조용히 갈라진다.
  // 반대(PAIRED 에 있는데 디스크에 없음)면 스크립트가 exit 1 로 먼저 죽는다.
  expect(declared).toEqual(pairedOnDisk)
})
