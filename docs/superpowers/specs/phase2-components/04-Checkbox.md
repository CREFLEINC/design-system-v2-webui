# Phase 2 Component Spec — Checkbox

- Directory: `src/components/Checkbox/`

## Exports (append to src/index.ts)
```ts
export { Checkbox } from './components/Checkbox/Checkbox'
export type { CheckboxProps } from './components/Checkbox/Checkbox'
```

## Props interface
```tsx
import { type InputHTMLAttributes, type ReactNode } from 'react'

export interface CheckboxProps
  // 네이티브 input 속성을 그대로 노출한다. type은 고정('checkbox'), size는 CSS와 충돌하므로 제외.
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** 부분 선택. 네이티브 input.indeterminate 로 반영되어 AT에 "mixed"로 보고된다 */
  indeterminate?: boolean
  /** 박스 오른쪽 라벨. 없으면 접근성 이름을 위해 aria-label 을 넘겨야 한다 */
  children?: ReactNode
}

// checked/defaultChecked/onChange/name/value/disabled/id 등은 ...rest 로 네이티브 input에 전달된다
// (제어/비제어 모두 지원 — Button이 나머지 button 속성을 spread 하는 것과 동일 패턴)
```

## Variants & API
SINGLE VARIANT / SINGLE SIZE — a checkbox is one visual form; no variant/size props (unlike Button). This keeps the API lean and matches "no props the spec doesn't require."

ROOT ELEMENT = `<label>`. The visible box and the label text both live inside one `<label>`, so a native click anywhere on the row toggles the input with zero JS — no htmlFor/id wiring needed. `className` and any `style` land on the root label (mirrors Button applying className to its root).

VISUALLY-HIDDEN NATIVE INPUT: a real `<input type="checkbox">` is the source of truth and the a11y surface. It is positioned to fill the box, `opacity:0`, so it remains focusable, hit-testable, and reports state to AT, while the styled `.box` span (aria-hidden) renders the visuals. State toggling is pure CSS via sibling selectors (`.input:checked + .box`, `.input:indeterminate + .box`, `.input:focus-visible + .box`, `.input:disabled + .box`) — no state classes computed in JS.

forwardRef → the INPUT (a consumer attaches a ref to read/focus the control, e.g. form libs). Because `indeterminate` has no HTML attribute, it is set imperatively: keep an internal `useRef`, expose it through `useImperativeHandle(ref, () => innerRef.current!, [])`, and in a `useEffect([indeterminate])` do `innerRef.current.indeterminate = !!indeterminate`. Zero deps, native only.

CONTROLLED + UNCONTROLLED: neither `checked` nor `onChange` is destructured — both flow through `...rest` onto the input, so both modes work like a raw input.

CHECK / DASH MARKS: two hand-rolled inline SVGs inside the aria-hidden box (`fill:none; stroke:currentColor`), toggled by opacity. check path `M5 12l4 4L19 7`, indeterminate path `M6 12h12`. `:indeterminate` hides the check and shows the dash so the checked+indeterminate combo resolves to the dash. State is conveyed to AT by the native input (indeterminate → "mixed"), NOT by the SVG, so marks stay decorative.

JSX shape:
<label className={cx(styles.root, className)}>
  <span className={styles.control}>
    <input ref={innerRef} type="checkbox" className={styles.input} disabled={disabled} {...rest} />
    <span className={styles.box} aria-hidden="true">
      <svg className={styles.check} viewBox="0 0 24 24"><path d="M5 12l4 4L19 7" /></svg>
      <svg className={styles.dash} viewBox="0 0 24 24"><path d="M6 12h12" /></svg>
    </span>
  </span>
  {children != null && <span className={styles.label}>{children}</span>}
</label>

## Accessibility
- ROLE: native `<input type="checkbox">` gives role=checkbox for free. Accessible name comes from the wrapping `<label>` text (`children`); when there is no visible label the consumer MUST pass `aria-label` (spread via ...rest) — documented in the prop JSDoc.
- INDETERMINATE: setting `input.indeterminate = true` makes browsers report aria-checked="mixed" natively — do NOT hand-set aria-checked (would fight the native value). Unchecked/checked report "false"/"true" natively too.
- KEYBOARD: fully native — Tab focuses the input, Space toggles. No custom key handlers, no tabindex overrides. Nothing steals focus (the styled box is aria-hidden and non-focusable).
- FOCUS: `.input:focus-visible + .box { box-shadow: var(--focus-ring) }` puts the visible ring on the styled box while real focus lives on the hidden input (keyboard-only, not on mouse click).
- DISABLED: native `disabled` attribute blocks focus + toggling and removes it from the tab order; CSS dims box + label.
- CONTRAST (AA): unchecked border var(--outline) (Task 0, ≥3:1 vs surface, both themes). Checked box fill var(--primary) with mark var(--on-primary) (white on red ≥4.5:1). Label var(--on-surface). No reliance on var(--outline-variant) for the control boundary.
- The whole row is one label, so pointer target includes the text (larger, WCAG target-size friendly).

## CSS notes
TOKENS ONLY. Raw px used only where the lint allows (0/1/2): the 2px box border and the M3-correct 2px box corner radius. Every other dimension/color is a var().

- .root: display inline-flex; align-items center; gap var(--space-2); cursor pointer; font var(--type-body-lg); color var(--on-surface). (label typography = body, not label-scale, since it's supporting content.)
- .control: position relative; isolation isolate; display inline-flex; flex none. Hosts the M3 hover state-layer via .control::before — position absolute; inset calc(var(--space-2) * -1) (token-only negative inset → circular ripple larger than the box); border-radius var(--radius-full); background transparent; pointer-events none; transition background var(--motion-fast) var(--ease-standard). `.root:hover .control::before { background: var(--state-hover) }` — honors Button's ::before overlay pattern without touching the box fill.
- .input: position absolute; inset 0; width 100%; height 100%; margin 0; opacity 0; cursor inherit. (Real control, invisible, covers the box.)
- .box: width var(--space-5); height var(--space-5) (20px); border-radius 2px; border 2px solid var(--outline); background transparent; display grid; place-items center; color var(--on-primary); transition background var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast) var(--ease-standard).
- .check, .dash: width var(--space-4); height var(--space-4); fill none; stroke currentColor; stroke-width 2 (unitless SVG attr — but set stroke-width via presentation attribute in JSX, not CSS px, to stay lint-clean); opacity 0; transition opacity var(--motion-fast) var(--ease-standard); grid-area 1 / 1 (stack).
- CHECKED: `.input:checked + .box { background: var(--primary); border-color: var(--primary) }` and `.input:checked + .box .check { opacity: 1 }`.
- INDETERMINATE (wins over checked): `.input:indeterminate + .box { background: var(--primary); border-color: var(--primary) }`, `.input:indeterminate + .box .dash { opacity: 1 }`, `.input:indeterminate + .box .check { opacity: 0 }`.
- FOCUS: `.input:focus-visible + .box { box-shadow: var(--focus-ring) }`.
- DISABLED: `.input:disabled ~ .box`? use `+ .box` — `.input:disabled + .box { border-color: var(--state-disabled-fill) }`; `.input:disabled:checked + .box, .input:disabled:indeterminate + .box { background: var(--state-disabled-fill); border-color: var(--state-disabled-fill) }`; disabled mark color: `.input:disabled + .box { color: var(--state-disabled-text) }`; `.root:has(.input:disabled) { cursor: default; color: var(--state-disabled-text) }` and suppress hover layer `.root:has(.input:disabled):hover .control::before { background: transparent }`. (:has is well-supported in the Storybook 10 / modern-Chrome target; falls back gracefully — label dim is cosmetic.)
- LIGHT/DARK: entirely token-driven. --primary/--on-primary/--outline/--on-surface/--state-* all swap via themes.css [data-theme='dark']; no theme-specific rules in the module.
- MOTION: only var(--motion-*) durations + var(--ease-standard). Wrap `@media (prefers-reduced-motion: reduce) { .box, .check, .dash, .control::before { transition: none } }` to disable animation per Task 0 convention.

## New tokens needed (Task 0 provides these)
- --outline: (from Phase 2 Task 0) form-control border color, >=3:1 vs --surface in light AND dark. Used for the unchecked checkbox box border — --outline-variant (~1.6:1) is decorative-only and fails the control-boundary contrast bar, so this component depends on Task 0 landing --outline. No other new tokens required.

## Acceptance tests (implement as written; these define behavior)
### 라벨을 렌더하고 클릭하면 체크된다 (비제어)
```tsx
import { expect, test, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

test('라벨을 렌더하고 클릭하면 체크된다 (비제어)', async () => {
  render(<Checkbox>이용약관 동의</Checkbox>)
  const cb = screen.getByRole('checkbox', { name: '이용약관 동의' }) as HTMLInputElement
  expect(cb.checked).toBe(false)
  await userEvent.click(cb)
  expect(cb.checked).toBe(true)
})
```
### 클릭 시 onChange가 호출된다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

test('클릭 시 onChange가 호출된다', async () => {
  const onChange = vi.fn()
  render(<Checkbox onChange={onChange}>수신 동의</Checkbox>)
  await userEvent.click(screen.getByRole('checkbox', { name: '수신 동의' }))
  expect(onChange).toHaveBeenCalledOnce()
  expect(onChange.mock.calls[0][0].target.checked).toBe(true)
})
```
### 라벨 텍스트 클릭으로도 토글된다 (label 연결)
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

test('라벨 텍스트 클릭으로도 토글된다 (label 연결)', async () => {
  render(<Checkbox>전체 선택</Checkbox>)
  const cb = screen.getByRole('checkbox') as HTMLInputElement
  await userEvent.click(screen.getByText('전체 선택'))
  expect(cb.checked).toBe(true)
})
```
### indeterminate prop이 네이티브 input.indeterminate로 반영된다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Checkbox } from './Checkbox'

test('indeterminate prop이 네이티브 input.indeterminate로 반영된다', () => {
  const { rerender } = render(<Checkbox indeterminate>부분 선택</Checkbox>)
  const cb = screen.getByRole('checkbox') as HTMLInputElement
  expect(cb.indeterminate).toBe(true)
  rerender(<Checkbox indeterminate={false}>부분 선택</Checkbox>)
  expect(cb.indeterminate).toBe(false)
})
```
### disabled면 토글이 차단되고 onChange가 호출되지 않는다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

test('disabled면 토글이 차단되고 onChange가 호출되지 않는다', async () => {
  const onChange = vi.fn()
  render(<Checkbox disabled onChange={onChange}>비활성</Checkbox>)
  const cb = screen.getByRole('checkbox') as HTMLInputElement
  expect(cb).toBeDisabled()
  await userEvent.click(cb)
  expect(cb.checked).toBe(false)
  expect(onChange).not.toHaveBeenCalled()
})
```
### Space 키로 토글된다 (키보드 조작)
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

test('Space 키로 토글된다 (키보드 조작)', async () => {
  render(<Checkbox>키보드</Checkbox>)
  const cb = screen.getByRole('checkbox') as HTMLInputElement
  await userEvent.tab()
  expect(cb).toHaveFocus()
  await userEvent.keyboard(' ')
  expect(cb.checked).toBe(true)
})
```
### forwardRef가 input 엘리먼트를 가리킨다
```tsx
import { expect, test } from 'vitest'
import { createRef } from 'react'
import { render } from '@testing-library/react'
import { Checkbox } from './Checkbox'

test('forwardRef가 input 엘리먼트를 가리킨다', () => {
  const ref = createRef<HTMLInputElement>()
  render(<Checkbox ref={ref}>라벨</Checkbox>)
  expect(ref.current).toBeInstanceOf(HTMLInputElement)
  expect(ref.current?.type).toBe('checkbox')
})
```
### 라벨 없이 aria-label로 접근성 이름을 갖는다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Checkbox } from './Checkbox'

test('라벨 없이 aria-label로 접근성 이름을 갖는다', () => {
  render(<Checkbox aria-label="전체 선택" />)
  expect(screen.getByRole('checkbox', { name: '전체 선택' })).toBeInTheDocument()
})
```

## Story notes
- Imports: `import type { Meta, StoryObj } from '@storybook/react-vite'` (matches Button.stories.tsx).
- meta: `title: 'Components/Checkbox'`, component: Checkbox, args: { children: '이용약관에 동의합니다' }.
- Playground: {} (uses args; toggle indeterminate/disabled via controls).
- States story: a column showing 미선택 / 선택됨(defaultChecked) / 부분선택(indeterminate) / 비활성(disabled) / 비활성+선택됨(disabled defaultChecked) each with Korean labels (동의 / 전체 선택 / 부분 선택 / 사용 안 함).
- Matrix story (REQUIRED, enumerated): a grid crossing state × {enabled, disabled}. Rows = [미선택, 선택됨, 부분선택]; columns = [기본, 비활성]. Render real Checkbox instances (defaultChecked for 선택됨, indeterminate for 부분선택, disabled for the second column) so a screenshot captures every visual state at once. Wrap in `<div style={{ display:'grid', gridTemplateColumns:'auto auto', gap:16 }}>` like Button's Matrix.
- Include one long-label example (`아래 내용을 모두 확인하였으며 개인정보 수집 및 이용에 동의합니다`) to verify the box stays top/center-aligned and does not stretch with multiline text.
- Component/prop names stay English (indeterminate, disabled, defaultChecked); all visible copy Korean.

## Render-verify checklist (light + dark)
- 미선택 박스: var(--outline) 테두리가 표면 대비 뚜렷하게 보인다 (라이트/다크 모두 >=3:1)
- 선택됨 박스: 배경이 브랜드 레드(var(--primary))로 채워지고 흰색(var(--on-primary)) 체크마크가 선명하다 — 다크에서도 레드 채도 유지
- 부분선택 박스: 레드 채움 위 가로 대시(-) 표시, 체크마크는 보이지 않음
- 선택+부분선택 동시 지정 시 대시가 이기고 체크는 숨겨진다
- 키보드 Tab 포커스 시 박스에 var(--focus-ring)가 보이고, 마우스 클릭만으로는 링이 나타나지 않는다
- 비활성 미선택: 테두리가 흐린 disabled 톤, 라벨 텍스트도 흐려짐, 커서 default
- 비활성 선택됨: 채움/체크가 레드가 아닌 disabled 톤으로 렌더
- 호버 시 박스 뒤로 원형 state-layer(var(--state-hover))가 은은하게 보이되 박스 채움색은 변하지 않는다
- 긴 라벨 멀티라인: 박스가 늘어나지 않고 첫 줄 기준 상단 정렬 유지
- 라이트/다크 모두 라벨 텍스트가 var(--on-surface)로 본문 대비 충족
- prefers-reduced-motion 시 상태 전환 애니메이션이 없다

## Risks / decisions
1) DEPENDS ON --outline (Task 0). If Task 0 does not land --outline, the token lint fails (unknown token) and the unchecked border has no AA-safe color — --outline-variant is not an acceptable substitute (fails 3:1). Sequencing: Checkbox must be implemented after Task 0.\n2) SVG stroke-width must be a presentation attribute in JSX (`strokeWidth={2}`), NOT a CSS `2px` rule — putting it in the .module.css is fine at 2px (lint allows 2) but keeping it in JSX avoids any ambiguity and keeps the mark crisp at the 20px box size.\n3) `:has()` is used for the disabled label/hover-suppression styling. It is supported in the modern-Chrome screenshot target, but if the build must support older engines the disabled label dim could instead be driven by a JS-applied class on the root — confirm the browser support bar. The control itself (input:disabled + .box) does NOT rely on :has, so core disabled behavior is safe regardless.\n4) indeterminate is imperative (useEffect + useImperativeHandle merge). Confirm the merge-ref pattern is acceptable house style; alternative is a callback ref that both forwards and sets .indeterminate. Both are zero-dep.\n5) No `size`/`error` props included by design (spec scope). If a form field needs an error/invalid checkbox later, that is a follow-up (would add --semantic-error border + aria-invalid)."
