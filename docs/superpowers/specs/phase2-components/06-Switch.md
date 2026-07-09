# Phase 2 Component Spec — Switch

- Directory: `src/components/Switch/`

## Exports (append to src/index.ts)
```ts
export { Switch } from './components/Switch/Switch'
export type { SwitchProps, SwitchLabelPlacement } from './components/Switch/Switch'
```

## Props interface
```tsx
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './Switch.module.css'

export type SwitchLabelPlacement = 'start' | 'end'

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'> {
  /** 스위치 옆 라벨. 있으면 wrapping <label>이 접근가능한 이름을 제공한다.
   *  없으면 consumer가 aria-label을 ...rest로 넘겨야 한다. */
  label?: ReactNode
  /** 라벨 위치. 기본 'end' (컨트롤 오른쪽). */
  labelPlacement?: SwitchLabelPlacement
}

/*
 * 구현 스케치 (implementer용) — Button.tsx의 forwardRef + cx 패턴을 그대로 따른다.
 * 네이티브 checkbox에 role="switch"를 부여해 키보드/폼/체크상태를 공짜로 얻고,
 * 브라우저 접근성 레이어가 checked -> on/off를 자동 매핑한다(수동 aria-checked 금지 →
 * uncontrolled 입력과 충돌 방지). ref는 네이티브 input에 연결한다.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, labelPlacement = 'end', disabled, className, ...rest },
  ref
) {
  return (
    <label className={cx(styles.root, styles[labelPlacement], disabled && styles.disabled, className)}>
      <span className={styles.control}>
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          className={styles.input}
          disabled={disabled}
          {...rest}
        />
        <span className={styles.track} aria-hidden="true">
          <span className={styles.thumb} />
        </span>
      </span>
      {label != null && <span className={styles.labelText}>{label}</span>}
    </label>
  )
})
```

## Variants & API
No visual "variants" (single style); the axes are checked/unchecked (native checkbox state, pure CSS), enabled/disabled, and labelPlacement 'start' | 'end' (default 'end').

Key decisions, each grounded in the Button/Icon pattern read:
- forwardRef<HTMLInputElement> to the native input — matches Button's forwardRef<HTMLButtonElement>, and a consumer sensibly attaches a ref to a form control (RHF register, focus, uncontrolled reads). ...rest spreads onto the input so checked/defaultChecked/onChange/name/value/aria-label/data-* all pass through, exactly as Button spreads ...rest onto <button>.
- Native <input type="checkbox" role="switch"> instead of a hand-rolled div+onClick: gives keyboard operability (Space toggles), focus, form participation, and correct AT semantics with ZERO runtime deps and no manual key handling. role="switch" on a checkbox is valid ARIA; screen readers announce on/off from the native checked state. We deliberately do NOT set aria-checked manually — the accessibility layer derives it from checked, which keeps uncontrolled inputs correct (setting it by hand would freeze an uncontrolled switch).
- Controlled AND uncontrolled both supported for free because it's a native input: pass `checked`+`onChange` (controlled) or `defaultChecked` (uncontrolled). Mirrors how Button forwards native attrs rather than re-implementing them.
- Omit<..., 'type' | 'role'> so consumers can't break the switch semantics, but keep `disabled`, `checked`, `name`, `onChange`, etc.
- Wrapping <label> gives implicit label association (input nested in label) — no id/htmlFor bookkeeping. When `label` is omitted the accessible name must come from a consumer-supplied aria-label via ...rest (documented in the prop JSDoc).
- disabled is applied to the input (blocks toggling natively) AND adds a `styles.disabled` class to the root so the out-of-control-subtree labelText can be dimmed — same technique Button uses (`styles[variant]` + state classes on the root), since a sibling selector can't cross from input to labelText.
- Structure: root <label> → control <span> (position:relative, sized as track) containing the visually-hidden input (absolutely overlaying the track, opacity 0, still focusable/clickable) + the visual track><thumb; then the labelText span. Track/thumb visuals are driven purely by `.input:checked + .track` / `.input:disabled + .track` / `.input:focus-visible + .track` — no JS state, no extra deps.
- Icon is not consumed here (a switch has no icon), consistent with Icon.tsx being label-driven and optional elsewhere.

## Accessibility
- Role: native <input type="checkbox"> + role="switch". getByRole('switch') resolves; AT announces as a switch with on/off derived from the native `checked` state (no manual aria-checked, so uncontrolled stays correct).
- Name: wrapping <label> provides the accessible name from the `label` content (implicit association via nesting). If `label` is omitted, consumer supplies aria-label through ...rest; document this.
- Keyboard: fully operable via the native input — Tab focuses, Space toggles. No custom key handlers needed. The input is visually hidden with opacity:0 + absolute positioning (NOT display:none/visibility:hidden), so it remains focusable and clickable.
- Focus: visible ring via `.input:focus-visible + .track { box-shadow: var(--focus-ring) }` — same :focus-visible + box-shadow contract as Button. Ring lands on the visible track, not the invisible input.
- Disabled: `disabled` on the input blocks toggling and focus natively; root gets .disabled to dim labelText. No aria-disabled needed (native disabled is authoritative).
- Contrast (WCAG AA, both themes): checked track var(--primary) with white var(--on-primary) thumb; unchecked track var(--surface-container-high) with a 1px inset var(--outline) border (>=3:1 boundary) and thumb var(--on-surface-variant) (>=3:1 as a graphical UI object). labelText var(--on-surface). All swap correctly light/dark via tokens.

## CSS notes
TOKENS ONLY — no raw color, px only 0/1/2 for borders/rings. Dimensions composed from existing --space-* tokens so NO new size tokens are invented:
- Control/track size: width var(--space-8) (40px), height var(--space-6) (24px). Track: border-radius var(--radius-full); padding var(--space-1) (4px); display:flex; align-items:center; box-sizing:border-box.
- Thumb: width/height var(--space-4) (16px); border-radius var(--radius-full); transform: translateX(0) unchecked; transition: transform var(--motion-base) var(--ease-standard), background var(--motion-fast) var(--ease-standard).
- Travel: `.input:checked + .track .thumb { transform: translateX(var(--space-4)) }` — 4(pad) + 16(thumb) + 16(travel) + 4(pad) = 40 = track width. Symmetric, all token-derived.

Colors / states (which token for which part):
- Unchecked track: background var(--surface-container-high); box-shadow: inset 0 0 0 1px var(--outline) (real control boundary — the outlined Button uses the same inset 1px border technique, but with the AA-passing --outline from Task 0 instead of decorative --outline-variant).
- Unchecked thumb: background var(--on-surface-variant).
- Checked track: `.input:checked + .track { background: var(--primary); box-shadow: none }`.
- Checked thumb: `.input:checked + .track .thumb { background: var(--on-primary) }` (white on red — AA both themes; do NOT use --primary as a foreground).
- Focus: `.input:focus-visible + .track { box-shadow: var(--focus-ring) }` (unchecked focus combines inset border + ring: `inset 0 0 0 1px var(--outline), var(--focus-ring)`).
- Hover state layer (M3 ::before overlay, background untouched): `.track::before { content:''; position:absolute; inset:0; border-radius:inherit; background:transparent; transition: background var(--motion-fast) var(--ease-standard); pointer-events:none }`. `.root:hover .input:not(:disabled):checked + .track::before { background: var(--state-hover) }` and unchecked hover uses var(--state-hover-neutral). isolation:isolate on track like Button.
- Disabled: `.input:disabled + .track { background: var(--state-disabled-fill); box-shadow: none }`, `.input:disabled + .track .thumb { background: var(--state-disabled-text) }`, `.disabled .labelText { color: var(--state-disabled-text) }`, cursor:default. Input cursor:pointer normally, default when disabled.
- Visually-hidden input: position:absolute; inset:0; width:100%; height:100%; margin:0; opacity:0; cursor:pointer; z-index over track so pointer hits it.
- Layout: .root { display:inline-flex; align-items:center; gap:var(--space-2); cursor:pointer } (gap = Button's gap token). .start { flex-direction:row-reverse } / .end { flex-direction:row } reorder the two visible children (control, labelText); the absolutely-positioned input doesn't affect flex order. .labelText { font: var(--type-label-lg); letter-spacing: var(--type-label-lg-tracking); color: var(--on-surface) }.
- Motion guard: `@media (prefers-reduced-motion: reduce) { .thumb { transition: none } }` — disables the slide per the Task 0 reduced-motion convention.

## New tokens needed (Task 0 provides these)
- --outline: (added by Phase 2 Task 0) form-control border color, >=3:1 vs --surface in both themes — used here for the unchecked track boundary (inset 1px). Rationale: --outline-variant is ~1.6:1 (decorative only) and would fail AA for the switch outline; this component relies on the Task 0 --outline exactly as permitted by the spec brief.

## Acceptance tests (implement as written; these define behavior)
### 라벨을 렌더하고 role=switch로 접근 가능하다 (기본 off)
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './Switch'
import styles from './Switch.module.css'

test('라벨을 렌더하고 role=switch로 접근 가능하다 (기본 off)', () => {
  render(<Switch label="알림" />)
  const el = screen.getByRole('switch', { name: '알림' })
  expect(el).not.toBeChecked()
})
```
### 클릭하면 켜지고 onChange가 호출된다
```tsx
test('클릭하면 켜지고 onChange가 호출된다', async () => {
  const onChange = vi.fn()
  render(<Switch label="알림" onChange={onChange} />)
  const el = screen.getByRole('switch', { name: '알림' })
  await userEvent.click(el)
  expect(el).toBeChecked()
  expect(onChange).toHaveBeenCalledOnce()
})
```
### Space 키로 토글된다 (키보드 조작)
```tsx
test('Space 키로 토글된다 (키보드 조작)', async () => {
  render(<Switch label="알림" />)
  const el = screen.getByRole('switch', { name: '알림' })
  el.focus()
  expect(el).toHaveFocus()
  await userEvent.keyboard(' ')
  expect(el).toBeChecked()
})
```
### disabled면 토글되지 않고 onChange가 호출되지 않는다
```tsx
test('disabled면 토글되지 않고 onChange가 호출되지 않는다', async () => {
  const onChange = vi.fn()
  render(<Switch label="알림" disabled onChange={onChange} />)
  const el = screen.getByRole('switch')
  expect(el).toBeDisabled()
  await userEvent.click(el)
  expect(el).not.toBeChecked()
  expect(onChange).not.toHaveBeenCalled()
})
```
### controlled: checked가 반영되고 클릭 시 onChange만 발생한다
```tsx
test('controlled: checked가 반영되고 클릭 시 onChange만 발생한다', async () => {
  const onChange = vi.fn()
  render(<Switch label="알림" checked onChange={onChange} />)
  const el = screen.getByRole('switch')
  expect(el).toBeChecked()
  await userEvent.click(el)
  expect(onChange).toHaveBeenCalledOnce()
  // controlled — 부모가 state를 갱신하지 않으면 여전히 on
  expect(el).toBeChecked()
})
```
### labelPlacement 클래스가 root에 적용된다 (기본 end)
```tsx
test('labelPlacement 클래스가 root에 적용된다 (기본 end)', () => {
  const { rerender } = render(<Switch label="알림" />)
  const root = () => screen.getByRole('switch').closest('label') as HTMLElement
  expect(root().className).toContain(styles.end)
  rerender(<Switch label="알림" labelPlacement="start" />)
  expect(root().className).toContain(styles.start)
})
```
### ref가 네이티브 input에 연결된다
```tsx
test('ref가 네이티브 input에 연결된다', () => {
  const ref = { current: null as HTMLInputElement | null }
  render(<Switch label="알림" ref={ref} />)
  expect(ref.current).toBeInstanceOf(HTMLInputElement)
  expect(ref.current?.getAttribute('role')).toBe('switch')
})
```
### label 없이 aria-label로 이름을 제공할 수 있다
```tsx
test('label 없이 aria-label로 이름을 제공할 수 있다', () => {
  render(<Switch aria-label="다크 모드" />)
  expect(screen.getByRole('switch', { name: '다크 모드' })).toBeInTheDocument()
})
```

## Story notes
Follow Button.stories.tsx exactly: import { Meta, StoryObj } from '@storybook/react-vite', title 'Components/Switch', component Switch, args { label: '알림', labelPlacement: 'end' }. Korean copy throughout.
- Playground: Story = {} bound to args (toggle checked/disabled/labelPlacement via controls).
- Matrix (required, enumerates the axes for screenshot QA): a grid rendering every combination of state × placement:
  rows = [off, on] via defaultChecked; cols within each row = [enabled, disabled];
  plus one row per placement to show label on both sides. Concretely map over ([false, true] as const) for checked and ([false, true] as const) for disabled, and render <Switch> with Korean labels: '알림' (off/enabled), '자동 저장' (on/enabled), '다크 모드' (disabled). Include a start-placement example: <Switch label=\"자동 저장\" labelPlacement=\"start\" defaultChecked />. Use defaultChecked (uncontrolled) so the story stays interactive without state wiring, like Button's non-stateful Matrix.
  Layout with plain inline style display:grid/flex + gap numbers (Button.stories uses raw px in inline styles — that is JS, not the linted .module.css, so it's fine).

## Render-verify checklist (light + dark)
- Both themes: unchecked track shows a visible 1px --outline border and a neutral thumb parked at the LEFT; checked track is brand red (--primary) with a WHITE thumb parked fully to the RIGHT (no clipping at track edge).
- Checked-thumb travel is symmetric: equal 4px gap at both ends when on vs off.
- Keyboard focus (Tab to the switch) shows the --focus-ring box-shadow around the TRACK, visible against both light and dark surfaces; unchecked focus keeps the outline border AND the ring.
- Disabled switches (both on and off) render with muted --state-disabled-fill track and dimmed label text (--state-disabled-text), no focus ring, no hover response.
- labelPlacement start puts the label to the LEFT of the control and end to the RIGHT, with consistent --space-2 gap; label text uses --on-surface and is legible in both themes.
- Hover over an enabled switch shows a subtle state-layer tint on the track without changing the base track color (M3 overlay), and no layout shift.
- Dark theme: red checked track and white thumb both remain clearly distinguishable from the dark surface; unchecked thumb (--on-surface-variant) is visible against the darker track.

## Risks / decisions
1) --outline does not exist yet — this spec hard-depends on Phase 2 Task 0 adding it (>=3:1 in both themes). If Task 0 slips, the unchecked track boundary must temporarily fall back to a visible token (not --outline-variant, which fails AA). 2) We intentionally omit manual aria-checked and rely on the browser mapping role=switch+checked → on/off; verify with a real screen reader that CREFLE's target AT announces state (jsdom/testing-library confirm via toBeChecked, but SR announcement is browser-level). 3) Visually-hidden input must use opacity:0 + absolute (never display:none/visibility:hidden) or Space/Tab/focus-visible break — flag for the implementer as a correctness-critical detail. 4) Thumb sizing is composed from --space-* (40/24/16/4) rather than dedicated switch tokens; if design wants exact M3 52×32 metrics, dedicated tokens (--switch-*) would be needed — confirm the composed proportions are acceptable to the plan owner."}
