# Phase 2 Component Spec — TextField

- Directory: `src/components/TextField/`

## Exports (append to src/index.ts)
```ts
export { TextField } from './components/TextField/TextField'
export type { TextFieldProps, TextFieldSize } from './components/TextField/TextField'
```

## Props interface
```tsx
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './TextField.module.css'

export type TextFieldSize = 'sm' | 'md' | 'lg'

// Omit 'size' — native input.size is a number and collides with our design size.
export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** 시각적 라벨. 없으면 반드시 aria-label을 rest로 넘겨야 함 */
  label?: string
  /** 도움말 — error가 있으면 대체됨 */
  helperText?: ReactNode
  /** truthy면 invalid 상태(aria-invalid) + 이 텍스트를 error 메시지로 표시 */
  error?: ReactNode
  size?: TextFieldSize
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  /** 인풋을 부모 폭에 맞춰 확장 */
  fullWidth?: boolean
  /** 최상위 wrapper에 붙는 className (className은 <input>으로 전달됨) */
  containerClassName?: string
}

/*
Render shape (implementer reference):

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, helperText, error, size = 'md', leadingIcon, trailingIcon, fullWidth = false,
    containerClassName, className, id: idProp, disabled, required,
    'aria-describedby': describedByProp, ...rest },
  ref
) {
  const reactId = useId()
  const id = idProp ?? reactId
  const helperId = `${id}-helper`
  const errorId = `${id}-error`
  const invalid = error != null && error !== false
  const describedBy =
    cx(describedByProp, invalid ? errorId : helperText ? helperId : undefined) || undefined

  return (
    <div
      className={cx(styles.field, fullWidth && styles.fullWidth, containerClassName)}
      data-disabled={disabled || undefined}
    >
      {label && (
        <label htmlFor={id} className={styles.label}>{label}</label>
      )}
      <div className={cx(styles.inputWrap, styles[size], invalid && styles.invalid, disabled && styles.disabled)}>
        {leadingIcon && <span className={styles.leading} aria-hidden="true">{leadingIcon}</span>}
        <input
          ref={ref}
          id={id}
          className={cx(styles.input, className)}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          {...rest}
        />
        {trailingIcon && <span className={styles.trailing} aria-hidden="true">{trailingIcon}</span>}
      </div>
      {invalid ? (
        <p id={errorId} className={styles.error}>{error}</p>
      ) : helperText ? (
        <p id={helperId} className={styles.helper}>{helperText}</p>
      ) : null}
    </div>
  )
})
*/
```

## Variants & API
Compound field, single forwardRef target = the <input> (where value/onChange/aria/ref all belong, mirroring Button spreading ...rest onto its control). Root is a vertical flex <div> (label / inputWrap / helper-or-error).

Sizes (sm/md/lg): height comes from --control-height-sm|md|lg applied to `.inputWrap`; input font steps from --type-body-sm (sm) to --type-body-lg (md/lg). Class mapping follows Button exactly: cx(styles.inputWrap, styles[size], invalid && styles.invalid, disabled && styles.disabled). Default size md.

States driven by CSS + class flags, no JS style calc:
- default: border `inset 0 0 0 1px var(--outline)` on .inputWrap
- hover (not focused/disabled): `inset 0 0 0 1px var(--on-surface)`
- focus: `.inputWrap:focus-within` → `inset 0 0 0 2px var(--primary), var(--focus-ring)`. Using :focus-within (not :focus-visible) is a deliberate decision — a text field needs a persistent focus indicator while editing regardless of pointer vs keyboard entry, unlike Button which only rings on :focus-visible.
- error: `.invalid` → `inset 0 0 0 1px var(--semantic-error)`; error+focus reuses `var(--focus-ring)` for the outer ring (avoids spelling a literal 4px, which the token lint forbids): `inset 0 0 0 2px var(--semantic-error), var(--focus-ring)`.
- disabled: `.disabled` → `inset 0 0 0 1px var(--state-disabled-fill)`; input text → --state-disabled-text; label greys via `.field[data-disabled] .label`.

Controlled/uncontrolled: fully transparent — value/defaultValue/onChange flow through ...rest to the input, so both modes work with no internal state (React owns it).

ID + describedby wiring: id from props.id or useId() (React 18 native, zero-dep). helperText → `${id}-helper`, error → `${id}-error`. aria-describedby merges any caller-supplied describedby with the active message id (error wins over helper). error replaces helper (never both) so the description is unambiguous.

Icon slots are ReactNode (identical contract to Button.leadingIcon/trailingIcon); consumer passes <Icon name="search" size={20} /> (size 20 to match Button's icon sizing). Wrapped in aria-hidden spans — decorative; semantic meaning must come from label/aria-label, not the icon.

fullWidth prop → `.fullWidth` switches root from inline-flex to flex + width:100%.

## Accessibility
Role/semantics: native <input type="text"> (role textbox) — no ARIA role override needed. Label is a real <label htmlFor={id}> so it is a click target and is exposed as the accessible name; getByLabelText resolves the input. If `label` is omitted the consumer MUST pass aria-label via ...rest (documented).

States: aria-invalid="true" only when error is present (undefined otherwise, never "false" noise). aria-required mirrors required. aria-describedby points at the currently-visible message (error id when invalid, else helper id) and preserves any caller-provided describedby by merging.

Keyboard: fully native — Tab focuses the single input, all text editing keys work; no custom key handling that could trap focus. Focus is always visibly indicated via box-shadow: var(--focus-ring) on :focus-within (persistent while editing).

Disabled input receives the native disabled attribute → removed from tab order and blocks input events.

Contrast (WCAG AA, both themes): rest border --outline (Task 0, ≥3:1 form-control boundary); error border --semantic-error (#B3261E) ≥3:1 on both surfaces as a non-text UI boundary; error MESSAGE text + error icon use --semantic-error-text (new) to hit 4.5:1 (raw --semantic-error is only ~3.3:1 on dark surface — fails for text). Body text --on-surface, helper/label --on-surface-variant, placeholder --on-surface-muted.

Focus management: no focus stealing; ref forwarded so consumers can programmatically focus (e.g. focus-first-error patterns).

## CSS notes
TOKENS ONLY, px limited to 0/1/2 (all borders/rings satisfy this — the only 4px ring is inside var(--focus-ring)'s own definition, never spelled in this module).

Layout: `.field` display:inline-flex; flex-direction:column; gap:var(--space-1). `.fullWidth` → display:flex; width:100%. `.inputWrap` position:relative; display:flex; align-items:center; gap:var(--space-2); border-radius:var(--radius-md); background:transparent; transition:box-shadow var(--motion-fast) var(--ease-standard).

Label: font:var(--type-label-sm); letter-spacing:var(--type-label-sm-tracking); color:var(--on-surface-variant). `.field[data-disabled] .label { color: var(--state-disabled-text) }`.

Sizes on `.inputWrap`: `.sm{height:var(--control-height-sm);padding:0 var(--space-3)}` `.md{height:var(--control-height-md);padding:0 var(--space-3)}` `.lg{height:var(--control-height-lg);padding:0 var(--space-4)}`. `.sm .input{font:var(--type-body-sm);letter-spacing:var(--type-body-sm-tracking)}` (md/lg inherit body-lg).

Input: `.input{flex:1 1 auto;min-width:0;border:0;background:transparent;outline:none;color:var(--on-surface);font:var(--type-body-lg);letter-spacing:var(--type-body-lg-tracking);width:100%}` `.input::placeholder{color:var(--on-surface-muted)}` `.input:disabled{color:var(--state-disabled-text);cursor:default}`.

Border state machine (all box-shadow, token-only):
`.inputWrap{box-shadow:inset 0 0 0 1px var(--outline)}`
`.inputWrap:hover:not(.disabled):not(:focus-within){box-shadow:inset 0 0 0 1px var(--on-surface)}`
`.inputWrap:focus-within{box-shadow:inset 0 0 0 2px var(--primary), var(--focus-ring)}`
`.invalid{box-shadow:inset 0 0 0 1px var(--semantic-error)}`
`.invalid:focus-within{box-shadow:inset 0 0 0 2px var(--semantic-error), var(--focus-ring)}`
`.disabled{box-shadow:inset 0 0 0 1px var(--state-disabled-fill);cursor:default}`

Icon slots: `.leading,.trailing{display:inline-flex;align-items:center;flex:0 0 auto;color:var(--on-surface-variant)}` `.invalid .leading,.invalid .trailing{color:var(--semantic-error-text)}`.

Messages: `.helper{font:var(--type-body-sm);letter-spacing:var(--type-body-sm-tracking);color:var(--on-surface-variant)}` `.error{font:var(--type-body-sm);letter-spacing:var(--type-body-sm-tracking);color:var(--semantic-error-text);display:flex;align-items:center;gap:var(--space-1)}`.

Light/dark: every color is a themed token that swaps via themes.css; --semantic-error stays fixed (border, ok at ≥3:1) while --semantic-error-text swaps to a lighter red on dark for AA text. Nothing hard-coded.

Motion: only the box-shadow transition (var(--motion-fast) var(--ease-standard)). Wrap disable: `@media (prefers-reduced-motion: reduce){ .inputWrap{transition:none} }`.

## New tokens needed (Task 0 provides these)
- --semantic-error-text: light #B3261E / dark #F2B8B5 — needed because --semantic-error (#B3261E) is fixed across themes and reaches only ~3.3:1 on the dark surface #1B1D21: acceptable for the 1-2px border (>=3:1 non-text UI boundary) but FAILS WCAG AA 4.5:1 for the error MESSAGE text and error-tinted icons. Mirrors the existing --primary vs --primary-text split. Add to web-tokens.css :root as `--semantic-error-text: var(--semantic-error)` (light: 5:1 on #FBF8FD) and override in themes.css [data-theme='dark'] to #F2B8B5 (Material error-80, ~10:1 on #1B1D21).
- --outline: form-control border token added by Phase 2 Task 0 (>=3:1 vs surface, light+dark). This spec's rest-state input border depends on it; listed as an explicit dependency, not invented here.

## Acceptance tests (implement as written; these define behavior)
### label이 input과 연결되고 입력이 전달된다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { TextField } from './TextField'
import { Icon } from '../Icon/Icon'
import styles from './TextField.module.css'

test('label이 input과 연결되고 onChange로 입력이 전달된다', async () => {
  const onChange = vi.fn()
  render(<TextField label="이름" onChange={onChange} />)
  const input = screen.getByLabelText('이름')
  await userEvent.type(input, '홍길동')
  expect(input).toHaveValue('홍길동')
  expect(onChange).toHaveBeenCalled()
})
```
### helperText가 aria-describedby로 연결된다
```tsx
test('helperText가 렌더되고 aria-describedby로 연결된다', () => {
  render(<TextField label="이메일" helperText="회사 이메일을 입력하세요" />)
  const input = screen.getByLabelText('이메일')
  const describedBy = input.getAttribute('aria-describedby')
  expect(describedBy).toBeTruthy()
  expect(document.getElementById(describedBy!)).toHaveTextContent('회사 이메일을 입력하세요')
  expect(input).not.toHaveAttribute('aria-invalid')
})
```
### error면 aria-invalid + 에러 메시지 + helper 대체
```tsx
test('error면 aria-invalid=true이고 helperText 대신 에러 메시지를 보여준다', () => {
  render(<TextField label="이메일" helperText="도움말" error="필수 항목입니다" />)
  const input = screen.getByLabelText('이메일')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText('필수 항목입니다')).toBeInTheDocument()
  expect(screen.queryByText('도움말')).not.toBeInTheDocument()
  const describedBy = input.getAttribute('aria-describedby')!
  expect(document.getElementById(describedBy)).toHaveTextContent('필수 항목입니다')
})
```
### disabled면 입력이 차단된다
```tsx
test('disabled면 input이 비활성이고 입력이 차단된다', async () => {
  const onChange = vi.fn()
  render(<TextField label="이름" disabled onChange={onChange} />)
  const input = screen.getByLabelText('이름')
  expect(input).toBeDisabled()
  await userEvent.type(input, '실패')
  expect(onChange).not.toHaveBeenCalled()
})
```
### forwardRef가 input을 가리킨다
```tsx
test('ref가 실제 input 요소로 전달되어 포커스 가능하다', () => {
  const ref = createRef<HTMLInputElement>()
  render(<TextField label="이름" ref={ref} />)
  expect(ref.current).toBe(screen.getByLabelText('이름'))
  ref.current?.focus()
  expect(ref.current).toHaveFocus()
})
```
### size 클래스가 inputWrap에 적용된다 (기본 md)
```tsx
test('size 클래스가 적용된다 (기본 md, lg 지정)', () => {
  const { rerender } = render(<TextField label="이름" />)
  expect(screen.getByLabelText('이름').parentElement?.className).toContain(styles.md)
  rerender(<TextField label="이름" size="lg" />)
  expect(screen.getByLabelText('이름').parentElement?.className).toContain(styles.lg)
})
```
### trailingIcon이 장식용(aria-hidden)으로 렌더된다
```tsx
test('trailingIcon이 렌더되고 장식용으로 aria-hidden 처리된다', () => {
  render(<TextField label="검색" trailingIcon={<Icon name="search" size={20} />} />)
  const iconText = screen.getByText('search')
  expect(iconText).toBeInTheDocument()
  expect(iconText).toHaveAttribute('aria-hidden', 'true')
})
```

## Story notes
Storybook 10, import { Meta, StoryObj } from '@storybook/react-vite'; title 'Components/TextField'; component TextField; default args { label: '이메일', placeholder: 'name@crefle.com', size: 'md' }.

Stories:
- Playground: {} (controls-driven).
- WithHelper: helperText '회사 이메일을 사용하세요'.
- ErrorState: error '올바른 이메일 형식이 아닙니다', value 'not-an-email'.
- Disabled: disabled + value '수정 불가'.
- WithIcons: leadingIcon <Icon name=\"mail\" size={20} />, trailingIcon <Icon name=\"cancel\" size={20} />.
- Matrix (render fn, the screenshot target): a grid iterating size ['sm','md','lg'] on rows × state columns [default, focus-hint, error, disabled], plus a row showing leading/trailing icons and an error row with a trailing 'error' icon. Use Korean copy throughout: 라벨 '이름', helper '표시 이름을 입력하세요', error '필수 항목입니다', placeholder '홍길동'. Wrap in a div with display:grid; gap:16 (inline style acceptable in stories, matching Button.stories). Include one fullWidth example in a constrained-width container to show expansion. Component/prop names stay English.

## Render-verify checklist (light + dark)
- Both themes: rest-state input border is visible and clearly distinct from the page surface (--outline, not the near-invisible --outline-variant)
- Keyboard focus (Tab into a field): 2px primary border + outer focus ring (var(--focus-ring)) both visible in light and dark
- Error state: input border is semantic-error red, and the error message text below is legibly red — on DARK it must be the lighter --semantic-error-text (readable), NOT the dim raw --semantic-error
- Error message text passes as clearly readable (AA) against the surface in both themes
- Disabled field: greyed border, greyed label, greyed input/placeholder text; visually distinct from enabled
- sm/md/lg rows show three distinct heights matching --control-height-sm/md/lg
- Leading/trailing icons are vertically centered, do not overlap the text, and are neutral (--on-surface-variant) in default state / red in error state
- Placeholder text is muted (--on-surface-muted) and lower-emphasis than typed text (--on-surface)
- Label sits above the input with consistent small gap; helper/error sits below
- fullWidth example stretches to its container width while fixed-width fields do not

## Risks / decisions
1) --semantic-error-text must be added in Task 0 (or alongside this component) or the token lint (check-tokens.mjs) fails — it is a hard dependency, same as --outline. 2) Decision to use :focus-within rather than :focus-visible for the ring is intentional (text fields want a persistent editing indicator); confirm this matches the DS's a11y stance — if the team insists on :focus-visible parity with Button, switch to `.inputWrap:has(input:focus-visible)` (native :has, zero-dep, but slightly narrower browser support). 3) className routes to the <input> and containerClassName to the wrapper — this differs from a naive 'className on root' expectation; documented but worth confirming with the API reviewer. 4) Error message uses aria-describedby (announced on focus) rather than role='alert'/live region to avoid announcing on every keystroke; if the team wants immediate announcement of validation errors, add aria-live='polite' to the error <p> — left out deliberately to prevent noise. 5) getByLabelText tests require label+htmlFor wiring to be exact; if label is omitted the consumer must supply aria-label or the field is unlabeled (acceptable, but lint/story should demonstrate the aria-label path)."
