# Phase 2 Component Spec — Radio + RadioGroup

- Directory: `src/components/Radio/`

## Exports (append to src/index.ts)
```ts
export { Radio } from './components/Radio/Radio'
export type { RadioProps } from './components/Radio/Radio'
export { RadioGroup } from './components/Radio/RadioGroup'
export type { RadioGroupProps, RadioOrientation } from './components/Radio/RadioGroup'
```

## Props interface
```tsx
// ---- src/components/Radio/RadioGroup.tsx ----
import { createContext } from 'react'
import type { HTMLAttributes } from 'react'

export type RadioOrientation = 'vertical' | 'horizontal'

export interface RadioGroupContextValue {
  /** 그룹 내 모든 radio가 공유하는 name (네이티브 roving의 기반) */
  name: string
  /** 현재 선택된 value (없으면 미선택) */
  value: string | undefined
  /** 선택 변경 시 호출 (선택된 radio의 value) */
  onChange: (value: string) => void
  /** 그룹 전체 비활성 */
  disabled?: boolean
}

// Radio가 소비하는 컨텍스트. 그룹 밖에서는 null → Radio가 단독 모드로 동작.
export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** 그룹 name — 하위 Radio들이 공유한다 (필수) */
  name: string
  /** 제어 컴포넌트: 선택된 value */
  value?: string
  /** 비제어 컴포넌트: 초기 선택 value */
  defaultValue?: string
  /** 선택 변경 콜백 (선택된 value) */
  onChange?: (value: string) => void
  /** 그룹 전체 비활성 */
  disabled?: boolean
  /** 배치 방향 (기본 vertical) */
  orientation?: RadioOrientation
  /** 라벨 요소 id (aria-labelledby). 없으면 aria-label 제공 필요 */
  'aria-labelledby'?: string
  'aria-label'?: string
}

// ---- src/components/Radio/Radio.tsx ----
import type { InputHTMLAttributes, ReactNode } from 'react'

// InputHTMLAttributes.value(string|number|readonly string[])를 string으로 좁힌다.
// InputHTMLAttributes.size(number)는 시각 크기와 혼동되므로 Omit.
export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'value'> {
  /** 이 옵션의 값 — 그룹의 value와 일치하면 선택됨 (필수) */
  value: string
  /** 라벨 콘텐츠 (label 요소로 연결됨) */
  children?: ReactNode
}
// forwardRef<HTMLInputElement, RadioProps> — ref는 네이티브 input에 전달된다.
```

## Variants & API
TWO components, ONE shared Radio.module.css, in src/components/Radio/. Files: Radio.tsx, RadioGroup.tsx, Radio.module.css, Radio.stories.tsx, Radio.test.tsx.

NO visual variant/size axis (unlike Button) — a radio is a single canonical form. The interesting axis is grouping + native roving, so complexity goes there. Only a group-level `orientation` modifier class (vertical | horizontal) exists.

RADIO (forwardRef<HTMLInputElement>): renders a <label class=styles.radio> wrapping (1) a visually-transparent native <input type="radio"> that overlays the whole label (position:absolute; inset:0; opacity:0), (2) an aria-hidden <span class=styles.control> holding the aria-hidden <span class=styles.dot>, (3) a <span class=styles.label>{children}</span>. Ref → the input; ...rest spreads onto the input (so consumers pass onFocus/onBlur/data-*/aria-*). Because label wraps input+text, the text becomes the input's accessible name automatically — no htmlFor/id wiring needed.

Radio reads RadioGroupContext via useContext:
- If in a group: checked = ctx.value === props.value; name = ctx.name; disabled = ctx.disabled || props.disabled; onChange handler calls ctx.onChange(props.value) THEN props.onChange?.(e). We pass `checked` (controlled) so React owns state and the group's value is the single source of truth.
- If standalone (ctx === null): behaves as a thin styled native radio — name/checked/defaultChecked/onChange all come from props and are spread through. This keeps Radio usable without a group (mirrors how Button needs no wrapper).

Design decision — controlled input inside group: the group always renders each Radio with an explicit `checked` derived from ctx.value, making the whole group a controlled set. Native same-name grouping still gives us arrow-key roving for free; when the browser moves selection it fires onChange on the newly-selected radio, which flows through ctx.onChange back into value and re-renders. This is why we do NOT hand-roll roving tabindex or keydown — the constraint "arrow-key selection comes free from native radios grouped by name" is honored by keeping real <input type=radio> elements sharing one name.

RADIOGROUP (function component, no ref needed — it's a passive <div role="radiogroup"> container): supports BOTH controlled (value + onChange) and uncontrolled (defaultValue) usage, matching real form-control expectations. Internal: `const isControlled = value !== undefined; const [internal, setInternal] = useState(defaultValue); const selected = isControlled ? value : internal; const handleChange = useCallback(next => { if (!isControlled) setInternal(next); onChange?.(next) }, [isControlled, onChange])`. Provides useMemo'd context {name, value: selected, onChange: handleChange, disabled}. Root <div> gets className=cx(styles.group, orientation === 'horizontal' && styles.horizontal, className), role="radiogroup", and spreads ...rest (so aria-label / aria-labelledby / data-testid land on it). Children are arbitrary (allows headings/help text between Radios) — the context, not child-cloning, wires everything up.

Key justifications grounded in Button/Icon pattern read: cx util (no clsx); forwardRef only where a ref is sensible (input, not the passive group div — Button forwardRefs its button, Icon has no ref); ...rest spread onto the control element; extend the correct HTML attributes interface (InputHTMLAttributes for Radio, HTMLAttributes<HTMLDivElement> for group); state-layer ::before overlay reused for the hover/press halo; :focus-visible → box-shadow: var(--focus-ring). Zero runtime deps.

## Accessibility
Roles/semantics: the real <input type="radio"> supplies role=radio, checked state, and disabled state to AT natively — we never fake ARIA. RadioGroup root is role="radiogroup" and MUST be named via aria-label or aria-labelledby (stories + tests always supply one; document this as required). Each Radio's accessible name comes from the <label> wrapping the input and its text (getByRole('radio',{name}) resolves).

Keyboard contract (all native, no custom handlers):
- Tab moves focus INTO the group landing on the checked radio (or the first radio if none checked) and Tab again leaves the group — native radio roving tabindex.
- Arrow Up/Left and Down/Right move selection among same-name radios, wrapping, skipping disabled ones, and firing change → ctx.onChange updates value.
- Space selects the focused radio.
Because selection == focus for native radios, no roving-tabindex bookkeeping is needed.

Focus visibility: the native input is transparent but still the focus target; `.input:focus-visible + .control { box-shadow: var(--focus-ring) }` paints the ring on the visible dot. focus-visible (not :focus) so mouse clicks don't ring.

Disabled: per-item via input `disabled`, per-group via ctx.disabled OR'd into each input's disabled — disabled radios are removed from the tab/arrow sequence natively and clicks are inert (asserted in tests). Disabled styling never relies on color alone: border + dot go to muted disabled tokens and the cursor changes.

Contrast (WCAG AA, both themes): unchecked ring uses var(--outline) (Task 0 guarantees >=3:1 vs surface — the existing --outline-variant at ~1.6:1 is decorative-only and is NOT used for the boundary). Checked ring + inner dot use var(--primary-text) (light #C9252C, dark #E8878B) NOT var(--primary), so the selected indicator (a meaningful graphical object) clears 3:1 on dark too. Label text uses var(--on-surface).

## CSS notes
TOKENS ONLY. Sizes come from spacing tokens (no raw px except border/ring 1/2). Full intended Radio.module.css:

/* label root */
.radio { position: relative; display: inline-flex; align-items: center; gap: var(--space-3); cursor: pointer; }

/* native input overlays the whole label: focusable + full-row hit target, but invisible */
.input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.input:disabled { cursor: default; }

/* visible ring */
.control {
  position: relative; flex: none; display: inline-grid; place-items: center;
  width: var(--space-5); height: var(--space-5);           /* 20px */
  border: 2px solid var(--outline);                        /* 2px allowed */
  border-radius: var(--radius-full);
  transition: border-color var(--motion-fast) var(--ease-standard);
}
/* M3 state-layer halo — overlay only, never touches the ring fill */
.control::before {
  content: ''; position: absolute; left: 50%; top: 50%;
  width: var(--space-8); height: var(--space-8);           /* 40px halo */
  transform: translate(-50%, -50%);
  border-radius: var(--radius-full); background: transparent;
  transition: background var(--motion-fast) var(--ease-standard); pointer-events: none;
}
.input:enabled:hover + .control::before  { background: var(--state-hover); }
.input:enabled:active + .control::before { background: var(--state-press); }

/* inner dot */
.dot {
  width: var(--space-2); height: var(--space-2);           /* 8px */
  border-radius: var(--radius-full); background: var(--primary-text);
  transform: scale(0); opacity: 0;
  transition: transform var(--motion-fast) var(--ease-standard),
              opacity   var(--motion-fast) var(--ease-standard);
}

/* checked */
.input:checked + .control { border-color: var(--primary-text); }
.input:checked + .control .dot { transform: scale(1); opacity: 1; }

/* focus ring on the visible control (box-shadow ≠ border, no conflict) */
.input:focus-visible + .control { box-shadow: var(--focus-ring); }

/* label text */
.label { font: var(--type-body-lg); color: var(--on-surface); }

/* disabled — never color-only: muted border + muted dot + muted label */
.input:disabled + .control { border-color: var(--state-disabled-fill); }
.input:disabled:checked + .control .dot { background: var(--state-disabled-text); }
.input:disabled ~ .label { color: var(--state-disabled-text); }

/* group container */
.group { display: flex; flex-direction: column; gap: var(--space-3); }
.horizontal { flex-direction: row; gap: var(--space-5); }

/* reduced motion — Task 0 convention */
@media (prefers-reduced-motion: reduce) {
  .control, .control::before, .dot { transition: none; }
}

Light/dark both work purely via tokens: --outline / --primary-text / --on-surface / --state-* / --focus-ring / --state-disabled-* are all theme-swapped in themes.css. --primary-text (not --primary) is deliberate so the checked indicator keeps AA on the dark surface. Motion uses --motion-fast + --ease-standard and is disabled under prefers-reduced-motion. check-tokens.mjs passes: only 1px/2px raw px (border/ring), every var(--x) referenced exists EXCEPT --outline which Task 0 defines.

## New tokens needed (Task 0 provides these)
- --outline: (added by Phase 2 Task 0) — form-control boundary color with >=3:1 contrast vs --surface in BOTH light and dark; used for the unchecked radio ring. --outline-variant (~1.6:1) is decorative-only and must NOT be used for this boundary. Proposed values if Task 0 needs them: light #6E6D78 (~4.0:1 on #FBF8FD), dark #8E9099 (~4.2:1 on #1B1D21). Radio only references var(--outline); it does not define it.

## Acceptance tests (implement as written; these define behavior)
### imports + shared setup (top of Radio.test.tsx)
```tsx
import { expect, test, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Radio } from './Radio'
import { RadioGroup } from './RadioGroup'
import styles from './Radio.module.css'

// RTL cleanup is automatic via src/test/setup.ts
```
### radiogroup role + accessible name, and all options render as radios
```tsx
test('radiogroup role과 aria-label을 노출하고 옵션을 radio로 렌더한다', () => {
  render(
    <RadioGroup name="plan" aria-label="요금제">
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
    </RadioGroup>
  )
  expect(screen.getByRole('radiogroup', { name: '요금제' })).toBeInTheDocument()
  expect(screen.getAllByRole('radio')).toHaveLength(2)
})
```
### clicking an option fires onChange(value) and reflects checked state
```tsx
test('옵션 클릭 시 onChange가 해당 value로 호출되고 checked가 반영된다', async () => {
  const onChange = vi.fn()
  function Harness() {
    const [value, setValue] = useState('free')
    return (
      <RadioGroup name="plan" aria-label="요금제" value={value}
        onChange={(v) => { setValue(v); onChange(v) }}>
        <Radio value="free">무료</Radio>
        <Radio value="pro">프로</Radio>
      </RadioGroup>
    )
  }
  render(<Harness />)
  await userEvent.click(screen.getByRole('radio', { name: '프로' }))
  expect(onChange).toHaveBeenCalledWith('pro')
  expect(screen.getByRole('radio', { name: '프로' })).toBeChecked()
  expect(screen.getByRole('radio', { name: '무료' })).not.toBeChecked()
})
```
### Space key selects the focused radio
```tsx
test('스페이스 키로 포커스된 옵션을 선택한다', async () => {
  const onChange = vi.fn()
  render(
    <RadioGroup name="plan" aria-label="요금제" onChange={onChange}>
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
    </RadioGroup>
  )
  const pro = screen.getByRole('radio', { name: '프로' })
  pro.focus()
  expect(pro).toHaveFocus()
  await userEvent.keyboard(' ')
  expect(onChange).toHaveBeenCalledWith('pro')
  expect(pro).toBeChecked()
})
```
### group-level disabled disables every radio and blocks selection
```tsx
test('그룹 전체 disabled면 모든 radio가 비활성이고 클릭이 무시된다', async () => {
  const onChange = vi.fn()
  render(
    <RadioGroup name="plan" aria-label="요금제" disabled onChange={onChange}>
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
    </RadioGroup>
  )
  screen.getAllByRole('radio').forEach((r) => expect(r).toBeDisabled())
  await userEvent.click(screen.getByRole('radio', { name: '프로' }))
  expect(onChange).not.toHaveBeenCalled()
})
```
### per-item disabled only disables that one radio
```tsx
test('개별 Radio disabled는 해당 항목만 비활성화한다', () => {
  render(
    <RadioGroup name="plan" aria-label="요금제">
      <Radio value="free">무료</Radio>
      <Radio value="pro" disabled>프로</Radio>
    </RadioGroup>
  )
  expect(screen.getByRole('radio', { name: '무료' })).toBeEnabled()
  expect(screen.getByRole('radio', { name: '프로' })).toBeDisabled()
})
```
### uncontrolled defaultValue seeds selection and updates on click
```tsx
test('비제어 defaultValue가 초기 선택을 세팅하고 클릭으로 갱신된다', async () => {
  render(
    <RadioGroup name="plan" aria-label="요금제" defaultValue="free">
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
    </RadioGroup>
  )
  expect(screen.getByRole('radio', { name: '무료' })).toBeChecked()
  await userEvent.click(screen.getByRole('radio', { name: '프로' }))
  expect(screen.getByRole('radio', { name: '프로' })).toBeChecked()
  expect(screen.getByRole('radio', { name: '무료' })).not.toBeChecked()
})
```
### all radios in a group share the group name (native roving basis)
```tsx
test('그룹 내 모든 radio는 같은 name을 공유한다', () => {
  render(
    <RadioGroup name="plan" aria-label="요금제">
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
    </RadioGroup>
  )
  screen.getAllByRole('radio').forEach((r) => expect(r).toHaveAttribute('name', 'plan'))
})
```
### standalone Radio (no group) still forwards checked/onChange
```tsx
test('그룹 없이 단독 Radio도 checked/onChange가 동작한다', async () => {
  const onChange = vi.fn()
  render(<Radio name="solo" value="a" checked={false} onChange={onChange}>단독</Radio>)
  const radio = screen.getByRole('radio', { name: '단독' })
  expect(radio).not.toBeChecked()
  await userEvent.click(radio)
  expect(onChange).toHaveBeenCalledOnce()
})
```
### orientation=horizontal applies the modifier class to the group root
```tsx
test('orientation=horizontal 클래스가 그룹 루트에 적용된다', () => {
  render(
    <RadioGroup name="plan" aria-label="요금제" orientation="horizontal" data-testid="grp">
      <Radio value="a">A</Radio>
      <Radio value="b">B</Radio>
    </RadioGroup>
  )
  expect(screen.getByTestId('grp').className).toContain(styles.horizontal)
})
```
### forwarded ref lands on the native input
```tsx
test('ref가 네이티브 input에 전달된다', () => {
  let node: HTMLInputElement | null = null
  render(<Radio name="solo" value="a" ref={(n) => { node = n }}>단독</Radio>)
  expect(node).toBeInstanceOf(HTMLInputElement)
  expect(node?.type).toBe('radio')
})
```

## Story notes
Storybook 10, import { Meta, StoryObj } from '@storybook/react-vite'. Component/prop names English, all visible copy Korean. Stories:
- Playground: a controlled RadioGroup name=\"plan\" aria-label=\"요금제\" with useState, options 무료/프로/기업, args-less render.
- Vertical (default) and Horizontal: same 3 options, orientation toggled; copy 무료/프로/기업.
- States: show 미선택/선택됨/비활성(미선택)/비활성(선택됨) side by side (drive checked+disabled via a standalone Radio row) with Korean labels 미선택/선택/비활성.
- WithGroupDisabled: RadioGroup disabled defaultValue=\"pro\".
- Matrix (REQUIRED, enumerates states x theme surfaces): a grid rendering, for each state {미선택, 선택됨, 비활성-미선택, 비활성-선택됨}, a Radio in that state, plus one vertical group and one horizontal group. Wrap the whole grid so a screenshot in light AND dark shows every combination. Use a small useState-backed controlled group for the live groups. Example copy: 요금제 / 무료 / 프로 / 기업, 결제주기 / 월간 / 연간. Keep the Matrix static enough to screenshot (pre-set checked states, do not depend on interaction).

## Render-verify checklist (light + dark)
- Light + dark: unchecked radio ring is clearly visible against the surface (uses --outline, >=3:1) — NOT the near-invisible decorative --outline-variant
- Checked radio shows a filled inner dot AND a colored ring in brand red: light = #C9252C, dark = lighter #E8878B (--primary-text), both clearly visible (indicator passes 3:1 on the dark surface)
- Keyboard focus (Tab) shows the --focus-ring box-shadow around the checked/focused control in both themes; mouse click alone does not show the ring
- Hover over a radio shows a faint red circular state-layer halo behind the ring (--state-hover); active/press shows a slightly stronger halo (--state-press)
- Disabled unchecked radio: muted ring (--state-disabled-fill) and muted label text; disabled checked radio: muted inner dot (--state-disabled-text) — disabled is never conveyed by color alone (dot fill + label both mute)
- Label text renders in --on-surface and is readable in both light and dark
- Vertical group stacks options with --space-3 gaps; horizontal group lays them in a row with --space-5 gaps and no wrapping/overlap
- Arrow keys (Up/Down/Left/Right) move the selection between options within a group, wrapping around and skipping disabled options (native roving) — selection follows focus
- Exactly one option per group is selected at a time; selecting another clears the previous
- No horizontal page scroll; the Matrix grid fits and both themes render identically in structure
