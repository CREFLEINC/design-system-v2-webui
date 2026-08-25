// #81 리뷰 회귀: Dialog .panel의 max-height는 #80의 공유 변수 --dialog-max-h를 소비한다.
// right/left·모바일 풀스크린이 셸의 max-height만 직접 덮고 변수를 재정의하지 않으면
// 패널이 var(--space-8)만큼 짧아진다(PR #81 리뷰 Major 실측).
// jsdom은 CSS 미주입(vitest css 기본 false)·미디어쿼리/var() 미해석이라 computed 검증이 불가하고,
// 같은 이유로 src 테스트의 .css?raw import도 스텁된다 — 그래서 node:fs로 소스를 직접 읽어
// CSS 계약(재정의 존재 + 캐스케이드 순서)을 고정한다. 런타임 실측은 npm run shoot이 커버.
// 실제 소스 대상 단언의 선례: components-inventory.test.mjs (실제 src/index.ts 검증).
import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components', 'Dialog', 'Dialog.module.css'),
  'utf8'
)

test('#81 회귀: right/left 블록이 --dialog-max-h를 100dvh로 재정의한다', () => {
  const block = css.match(/\.right,\s*\.left\s*\{[^}]*\}/)?.[0]
  expect(block).toBeDefined()
  expect(block).toContain('--dialog-max-h: 100dvh')
})

test('#81 회귀: 모바일 풀스크린 .dialog 블록이 --dialog-max-h를 100dvh로 재정의한다', () => {
  const mediaStart = css.indexOf('@media (max-width: 768px)')
  expect(mediaStart).toBeGreaterThanOrEqual(0)
  const dialogRule = css.slice(mediaStart).match(/\.dialog\s*\{[^}]*\}/)?.[0]
  expect(dialogRule).toBeDefined()
  expect(dialogRule).toContain('--dialog-max-h: 100dvh')
})

test('#81 회귀: 100dvh 재정의는 기본 정의(calc)보다 캐스케이드 후행이다', () => {
  const base = css.indexOf('--dialog-max-h: calc')
  const override = css.indexOf('--dialog-max-h: 100dvh')
  expect(base).toBeGreaterThanOrEqual(0)
  expect(override).toBeGreaterThan(base)
})
