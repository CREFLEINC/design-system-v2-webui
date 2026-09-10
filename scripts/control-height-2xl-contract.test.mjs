// #90: TextField·SearchInput·Select·NumberPad 4종 + Field 슬롯의 2xl(72px) 등급이
// 공용 토큰 --control-height-2xl을 소비함을 고정한다.
// jsdom은 CSS 미주입(vitest css 기본 false)이라 CSS 모듈은 어떤 키에도 이름을 합성하는
// 프록시다 — styles.xxl은 CSS에 .xxl 규칙이 없어도 '_xxl_<hash>'를 반환한다(실측:
// styles.thisRuleDoesNotExist도 값을 돌려준다). 즉 클래스명 단언은 규칙의 존재도
// 높이 바인딩도 증명하지 못한다. 그래서 node:fs로 소스를 직접 읽어
// 계약(클래스 → 토큰 var() → 72px)을 고정한다(선례: dialog-css-contract.test.mjs).
import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const tokensWeb = readFileSync(join(root, 'styles', 'web-tokens.css'), 'utf8')
const tokensBundle = readFileSync(join(root, 'ds-bundle', 'tokens', 'web-tokens.css'), 'utf8')

const textFieldCss = readFileSync(
  join(root, 'src', 'components', 'TextField', 'TextField.module.css'),
  'utf8'
)
const searchInputCss = readFileSync(
  join(root, 'src', 'components', 'SearchInput', 'SearchInput.module.css'),
  'utf8'
)
const selectCss = readFileSync(join(root, 'src', 'components', 'Select', 'Select.module.css'), 'utf8')
const numberPadCss = readFileSync(
  join(root, 'src', 'components', 'NumberPad', 'NumberPad.module.css'),
  'utf8'
)
const fieldCss = readFileSync(join(root, 'src', 'components', 'Field', 'Field.module.css'), 'utf8')

test('토큰: --control-height-2xl이 72px로 정의돼 있다', () => {
  expect(tokensWeb).toMatch(/--control-height-2xl:\s*72px/)
})

test('토큰 사본: ds-bundle/tokens/web-tokens.css가 styles/web-tokens.css와 완전 동일하다', () => {
  expect(tokensBundle).toBe(tokensWeb)
})

test('TextField: .xxl 블록이 --control-height-2xl을 소비한다', () => {
  const block = textFieldCss.match(/\.xxl\s*\{[^}]*\}/)?.[0]
  expect(block).toBeDefined()
  expect(block).toContain('height: var(--control-height-2xl)')
})

test('SearchInput: .xxl 블록이 --control-height-2xl을 소비한다', () => {
  const block = searchInputCss.match(/\.xxl\s*\{[^}]*\}/)?.[0]
  expect(block).toBeDefined()
  expect(block).toContain('height: var(--control-height-2xl)')
})

test('Select: .xxl 블록이 --control-height-2xl을 소비한다', () => {
  const block = selectCss.match(/\.xxl\s*\{[^}]*\}/)?.[0]
  expect(block).toBeDefined()
  expect(block).toContain('height: var(--control-height-2xl)')
})

test('Select: .listboxXxl 블록이 --control-height-2xl 기반 max-height를 갖는다', () => {
  const block = selectCss.match(/\.listboxXxl\s*\{[^}]*\}/)?.[0]
  expect(block).toBeDefined()
  expect(block).toContain('max-height: calc(var(--control-height-2xl) * 6)')
})

test('Select: .listboxXxl .option 블록이 --control-height-2xl 기반 min-height를 갖는다', () => {
  const block = selectCss.match(/\.listboxXxl \.option\s*\{[^}]*\}/)?.[0]
  expect(block).toBeDefined()
  expect(block).toContain('min-height: var(--control-height-2xl)')
})

test('NumberPad: .xxl 블록이 --control-height-2xl 기반 grid-auto-rows를 갖는다', () => {
  const block = numberPadCss.match(/\.xxl\s*\{[^}]*\}/)?.[0]
  expect(block).toBeDefined()
  expect(block).toContain('grid-auto-rows: var(--control-height-2xl)')
})

// Field는 컨트롤 자체가 아니라 컨트롤을 담는 슬롯이라 height가 아닌 min-height다 —
// 컨트롤이 슬롯보다 커도 잘리지 않아야 하고, 작아도 행 높이는 등급을 지켜야 한다.
test('Field: .xxl 블록이 --control-height-2xl 기반 min-height를 갖는다', () => {
  const block = fieldCss.match(/\.xxl\s*\{[^}]*\}/)?.[0]
  expect(block).toBeDefined()
  expect(block).toContain('min-height: var(--control-height-2xl)')
})

test('회귀: 5개 모듈 CSS의 .xl 블록은 여전히 --control-height-xl을 참조한다(순수 가산)', () => {
  const textFieldXl = textFieldCss.match(/\.xl\s*\{[^}]*\}/)?.[0]
  const searchInputXl = searchInputCss.match(/\.xl\s*\{[^}]*\}/)?.[0]
  const selectXl = selectCss.match(/\.xl\s*\{[^}]*\}/)?.[0]
  const numberPadXl = numberPadCss.match(/\.xl\s*\{[^}]*\}/)?.[0]
  const fieldXl = fieldCss.match(/\.xl\s*\{[^}]*\}/)?.[0]

  expect(textFieldXl).toContain('--control-height-xl')
  expect(searchInputXl).toContain('--control-height-xl')
  expect(selectXl).toContain('--control-height-xl')
  expect(numberPadXl).toContain('--control-height-xl')
  expect(fieldXl).toContain('--control-height-xl')
})
