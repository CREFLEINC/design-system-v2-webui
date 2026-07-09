# Phase 2 Component Spec — Chip + Badge

- Directory: `src/components/Chip/ (contains Chip.tsx, Chip.module.css, Chip.stories.tsx, Chip.test.tsx — Badge is co-located in the same directory: Badge.tsx, Badge.module.css, Badge.stories.tsx, Badge.test.tsx)`

## Exports (append to src/index.ts)
```ts
export { Chip } from './components/Chip/Chip'
export type { ChipProps, StatusChipProps, FilterChipProps, ChipStatus, ChipSize } from './components/Chip/Chip'
export { Badge } from './components/Chip/Badge'
export type { BadgeProps, BadgeTone } from './components/Chip/Badge'
```

## Props interface
```tsx
// ---------- Chip.tsx ----------
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, type Ref } from 'react'

export type ChipStatus = 'success' | 'error' | 'warning' | 'info' | 'idle'
export type ChipSize = 'sm' | 'md'

interface ChipCommon {
  size?: ChipSize
  /** 선행 아이콘 — 소비자가 <Icon name="..." size={16} /> 전달 (Button.leadingIcon과 동일 패턴) */
  leadingIcon?: ReactNode
  children: ReactNode
}

/** 상태/표시용 칩 — 비대화형. 루트 <span>. removable(후행 X) 지원. */
export interface StatusChipProps extends ChipCommon, Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  variant?: 'status'
  /** 시맨틱 상태 → soft container 배경 (기본 'idle') */
  status?: ChipStatus
  /** 지정 시 후행 X 제거 버튼을 렌더하고 클릭 시 호출 */
  onRemove?: () => void
  /** 제거 버튼 aria-label (기본 '제거') */
  removeLabel?: string
}

/** 필터/선택용 칩 — 토글. 루트 <button aria-pressed>. */
export interface FilterChipProps extends ChipCommon, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant: 'filter'
  /** 선택 상태 (aria-pressed로 노출, controlled) */
  selected?: boolean
  /** 토글 콜백 — 다음 선택값(!selected)을 전달 */
  onSelectedChange?: (selected: boolean) => void
}

export type ChipProps = StatusChipProps | FilterChipProps

export const Chip = forwardRef<HTMLButtonElement | HTMLSpanElement, ChipProps>(function Chip(props, ref) {
  const { size = 'md', leadingIcon, children, className } = props

  if (props.variant === 'filter') {
    const { variant: _v, selected = false, onSelectedChange, onClick, size: _s, leadingIcon: _li, children: _c, className: _cn, ...rest } = props
    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        aria-pressed={selected}
        className={cx(styles.chip, styles.filter, selected && styles.selected, styles[size], className)}
        onClick={(e) => { onSelectedChange?.(!selected); onClick?.(e) }}
        {...rest}
      >
        {leadingIcon}
        <span className={styles.label}>{children}</span>
      </button>
    )
  }

  const { variant: _v, status = 'idle', onRemove, removeLabel = '제거', size: _s, leadingIcon: _li, children: _c, className: _cn, ...rest } = props
  return (
    <span
      ref={ref as Ref<HTMLSpanElement>}
      className={cx(styles.chip, styles.status, styles[`status-${status}`], styles[size], className)}
      {...rest}
    >
      {leadingIcon}
      <span className={styles.label}>{children}</span>
      {onRemove && (
        <button type="button" className={styles.remove} aria-label={removeLabel} onClick={() => onRemove()}>
          <Icon name="close" size={size === 'sm' ? 16 : 18} />
        </button>
      )}
    </span>
  )
})

// ---------- Badge.tsx ----------
import { type HTMLAttributes } from 'react'

export type BadgeTone = 'primary' | 'neutral' | 'error'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** 표시할 수치 */
  count?: number
  /** 초과 시 'max+' 표기 (기본 99 → 100은 '99+') */
  max?: number
  /** 점 표시 모드 — count 무시, 텍스트 없음 */
  dot?: boolean
  /** count가 0이어도 표시 (기본 false → null 반환) */
  showZero?: boolean
  tone?: BadgeTone
}

// Icon 선례를 따라 비대화형: forwardRef 없이 순수 함수 컴포넌트, ...rest 스프레드.
export function Badge({ count, max = 99, dot = false, showZero = false, tone = 'primary', className, ...rest }: BadgeProps) {
  const labelled = (rest as Record<string, unknown>)['aria-label'] != null
  if (dot) {
    return <span className={cx(styles.badge, styles.dot, styles[tone], className)} aria-hidden={labelled ? undefined : true} {...rest} />
  }
  if (count == null || (count === 0 && !showZero)) return null
  const text = count > max ? `${max}+` : String(count)
  return <span className={cx(styles.badge, styles.count, styles[tone], className)} {...rest}>{text}</span>
}
```

## Variants & API
Two co-located components. Discriminated union on `variant` (chosen over Button's single interface because the two chip roles render DIFFERENT root elements and must not share invalid props).

CHIP — two variants:
- `variant='status'` (default): non-interactive display chip, root `<span>`, forwardRef→HTMLSpanElement. `status` prop maps to a soft semantic container background (success/error/warning/info/idle). `onRemove` renders a trailing X `<button>` nested inside the span (valid: button-in-span). This is the M3 "input/assist chip" removable pattern.
- `variant='filter'`: selectable toggle, root `<button type="button" aria-pressed>`, forwardRef→HTMLButtonElement. Controlled via `selected` + `onSelectedChange(next)`. Selected state uses `--primary-container`/`--on-primary-container` (tonal, same as Button.tonal); unselected uses a `--outline` (Task 0) inset border + `--on-surface-variant` text. Full M3 state-layer `::before` overlay + focus ring.
- Design decision: `onRemove` lives ONLY on the status (span-root) variant, and `onSelectedChange` ONLY on filter (button-root). This is enforced by the union so a removable chip never nests a button inside a button (invalid HTML / a11y trap). Filter chips are not removable by type — if a removable+selectable chip is ever needed it would be a separate composed component.
- Two sizes `sm`/`md` implemented via padding + line-height (NOT fixed heights) so no new height tokens are needed: sm = `--space-1 --space-2` padding + `--type-label-sm` (→~24px tall), md = `--space-1 --space-3` + `--type-label-lg` (→~28px tall). Radius `--radius-full`. `leadingIcon` is a `ReactNode` (consumer passes `<Icon .../>`) exactly like Button.

BADGE — count/dot indicator, plain function component (follows non-interactive Icon precedent, no forwardRef):
- `count` numeric with `max` cap (default 99 → renders `99+` when exceeded).
- `count===0` renders `null` unless `showZero`. `count==null` renders null (nothing to show).
- `dot` mode: small circle, no text, `aria-hidden` unless an `aria-label` is supplied.
- `tone`: `primary` (default, `--primary`/`--on-primary`) | `neutral` (`--surface-container-high`/`--on-surface-variant`) | `error` (`--semantic-error` solid + white). Scoped to these three because white-on-`--semantic-success` (#1F883D, ~3.9:1) and white-on-`--semantic-warning` (#E8A100) FAIL AA as solid fills; for soft success/warning status use Chip, not Badge. This scoping is a deliberate AA-driven decision, documented in the component.

## Accessibility
CHIP:
- Filter chip: real `<button type="button">` → native keyboard operability (Enter/Space activate, tab-focusable). Toggle state exposed via `aria-pressed={selected}`. Accessible name from `children`. `:focus-visible` shows `box-shadow: var(--focus-ring)` combined with the inset outline border (mirrors Button.outlined focus rule).
- Status chip: `<span>` conveys meaning through its visible text; no role added (role="status" would wrongly create a live region). Consumers may pass `aria-label` via `...rest` if the visual text is insufficient. Non-interactive → no focus/state layer.
- Remove button: nested `<button type="button">` (type set to avoid form submit), required `aria-label` (default '제거' / overridable via `removeLabel`), independently tab-focusable with its own `:focus-visible` ring. `onClick` calls `onRemove` only. Its Icon is decorative (`<Icon name="close">` with no label → aria-hidden). Valid nesting: button inside span (not inside another button).
- Contrast: every status container/on-container pair is specified to meet WCAG AA (≥4.5:1) in BOTH themes (see newTokensNeeded ratios). Filter selected uses `--on-primary-container` (AA-verified in existing DS).

BADGE:
- Numeric text is real DOM text (screen-reader readable). For meaningful counts consumers pass `aria-label` (e.g. '읽지 않음 3개') to give context beyond the bare number.
- Dot mode has no text → `aria-hidden={true}` by default (purely decorative) unless an `aria-label` is supplied, matching Icon's decorative-vs-labelled convention.
- Tones chosen so foreground/background meet AA (primary red-on-white ~4.9:1, error ~6.3:1, neutral on-surface-variant on container-high AA).

## CSS notes
Chip.module.css (TOKENS ONLY; px only 0/1/2 for borders/rings):
- `.chip`: position relative; isolation isolate; inline-flex; align-items center; gap `var(--space-1)`; border-radius `var(--radius-full)`; font `var(--type-label-lg)` + letter-spacing `var(--type-label-lg-tracking)`; white-space nowrap.
- Sizes: `.md { padding: var(--space-1) var(--space-3) }` ; `.sm { padding: var(--space-1) var(--space-2); font: var(--type-label-sm); letter-spacing: var(--type-label-sm-tracking) }`. No height declarations → height derives from line-height + padding (avoids inventing 24/28px tokens).
- Status colors (proposed Task-0-style tokens): `.status-success { background: var(--semantic-success-container); color: var(--on-semantic-success-container) }` and likewise error/warning/info/idle. Leading Icon inherits `currentColor` (Icon sets no color) → icon = on-container color. `.status` base sets `cursor: default`.
- Filter: `.filter { background: transparent; color: var(--on-surface-variant); box-shadow: inset 0 0 0 1px var(--outline); cursor: pointer; border: 0; outline: none; transition: box-shadow var(--motion-fast) var(--ease-standard) }`. `.selected { background: var(--primary-container); color: var(--on-primary-container); box-shadow: none }`.
- M3 state layer on filter only: `.filter::before { content:''; position:absolute; inset:0; border-radius:inherit; background:transparent; transition: background var(--motion-fast) var(--ease-standard); pointer-events:none }`; `.filter:hover::before { background: var(--state-hover) }`; `.filter:active::before { background: var(--state-press) }`.
- Focus: `.filter:focus-visible { box-shadow: inset 0 0 0 1px var(--outline), var(--focus-ring) }`; `.selected:focus-visible { box-shadow: var(--focus-ring) }`.
- Remove button: `.remove { display:inline-flex; align-items:center; justify-content:center; margin-inline-start: var(--space-1); padding:0; border:0; background:transparent; color:inherit; border-radius: var(--radius-full); cursor:pointer; position:relative; isolation:isolate; outline:none }` + `::before` overlay using `--state-hover-neutral`/`--state-press-neutral` (neutral overlay because the X sits on a colored chip); `.remove:focus-visible { box-shadow: var(--focus-ring) }`.
- `@media (prefers-reduced-motion: reduce) { .chip, .filter::before, .remove::before { transition: none } }`.

Badge.module.css:
- `.badge`: inline-flex; align-items center; justify-content center; font `var(--type-label-sm)`; letter-spacing `var(--type-label-sm-tracking)`; border-radius `var(--radius-full)`; box-sizing border-box.
- `.count`: min-width `var(--space-4)`; padding `0 var(--space-1)`; (single digit → circle via min-width==line box, multi-digit → pill).
- `.dot`: width `var(--space-2)`; height `var(--space-2)`; padding 0.
- Tones: `.primary { background: var(--primary); color: var(--on-primary) }` ; `.neutral { background: var(--surface-container-high); color: var(--on-surface-variant) }` ; `.error { background: var(--semantic-error); color: var(--on-primary) }` (--on-primary is #FFFFFF; white on #B3261E ≈6.3:1 AA).
- No animation → no motion block needed (dot does not pulse, per DS restraint).
- Both themes work through tokens: surface/on-surface/primary swap in themes.css; semantic containers get dark overrides (see newTokensNeeded); `--semantic-error` is theme-fixed per foundation rule.

## New tokens needed (Task 0 provides these)
- --outline: (provided by Phase 2 Task 0) — used for the unselected filter chip border; ≥3:1 vs surface, light+dark. Referenced, not defined here.
- --semantic-success-container: #E6F4EA (light) / #17311F (dark) — soft success chip bg; rationale: no soft semantic bg exists, mirrors --primary-container split.
- --on-semantic-success-container: #0E5223 (light, ~7.5:1 on light container) / #A6D9B6 (dark, ~7:1 on dark container) — AA text/icon on success chip.
- --semantic-error-container: #FBEAE8 (light) / #3A1512 (dark) — soft error chip bg.
- --on-semantic-error-container: #8C1D18 (light, ~7:1) / #F2B8B5 (dark, ~7:1) — AA text/icon on error chip.
- --semantic-warning-container: #FBF0D0 (light) / #362B04 (dark) — soft warning chip bg (warning is the hardest; deep brown-amber text used to reach AA).
- --on-semantic-warning-container: #6B4E00 (light, ~6.5:1) / #F2D48F (dark, ~8:1) — AA text/icon on warning chip.
- --semantic-info-container: #E5EDFB (light) / #14243F (dark) — soft info chip bg.
- --on-semantic-info-container: #0A458F (light, ~7:1) / #AEC9F5 (dark, ~7:1) — AA text/icon on info chip.
- --semantic-idle-container: #ECEDEF (light) / #2A2D33 (dark) — neutral idle chip bg (dark value == existing --surface-container).
- --on-semantic-idle-container: #3B4147 (light, ~9:1) / #C4C6CC (dark, ~8:1) — AA text/icon on idle chip.
- NOTE: container hex values are proposals; exact values to be AA-validated (contrast + check-tokens) when added to styles/foundation/tokens.css (light) and styles/themes.css (dark), following the existing --on-primary-container precedent. Light values live in :root, dark overrides in [data-theme='dark']; --semantic-*-container containers DO get dark overrides (unlike solid --semantic-* which are theme-fixed) because they are surface-relative tints.

## Acceptance tests (implement as written; these define behavior)
### Chip.test.tsx — status 칩은 텍스트와 status 클래스를 렌더한다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from './Chip'
import { Icon } from '../Icon/Icon'
import styles from './Chip.module.css'

test('status 칩은 텍스트와 시맨틱 클래스를 렌더한다', () => {
  render(<Chip status="success">양품</Chip>)
  const el = screen.getByText('양품').closest('span')!.parentElement!
  expect(screen.getByText('양품')).toBeInTheDocument()
  expect(el.className).toContain(styles['status-success'])
  expect(el.className).toContain(styles.status)
})
```
### Chip.test.tsx — filter 칩은 aria-pressed를 토글하고 onSelectedChange에 다음 값을 전달한다
```tsx
test('filter 칩은 클릭 시 aria-pressed 토글 + onSelectedChange(!selected)', async () => {
  const onChange = vi.fn()
  render(<Chip variant="filter" selected={false} onSelectedChange={onChange}>진행중</Chip>)
  const btn = screen.getByRole('button', { name: '진행중' })
  expect(btn).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(btn)
  expect(onChange).toHaveBeenCalledWith(true)
})
```
### Chip.test.tsx — selected filter 칩은 selected 클래스와 aria-pressed=true를 가진다
```tsx
test('selected filter 칩은 selected 클래스 + aria-pressed=true', () => {
  render(<Chip variant="filter" selected>선택됨</Chip>)
  const btn = screen.getByRole('button', { name: '선택됨' })
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  expect(btn.className).toContain(styles.selected)
})
```
### Chip.test.tsx — removable 칩의 X 버튼은 onRemove를 호출하고 type=button이다
```tsx
test('removable 칩의 X는 onRemove 호출 + type=button, 라벨 텍스트는 유지', async () => {
  const onRemove = vi.fn()
  render(<Chip status="info" onRemove={onRemove}>필터: 서울</Chip>)
  const x = screen.getByRole('button', { name: '제거' })
  expect(x).toHaveAttribute('type', 'button')
  await userEvent.click(x)
  expect(onRemove).toHaveBeenCalledOnce()
  expect(screen.getByText('필터: 서울')).toBeInTheDocument()
})
```
### Chip.test.tsx — leadingIcon으로 전달된 라벨 아이콘이 접근 가능하게 렌더된다
```tsx
test('leadingIcon(label 있는 Icon)은 role=img로 렌더된다', () => {
  render(<Chip status="success" leadingIcon={<Icon name="check_circle" label="완료" size={16} />}>완료</Chip>)
  expect(screen.getByRole('img', { name: '완료' })).toBeInTheDocument()
})
```
### Badge.test.tsx — count와 max 캡, showZero, dot 동작을 검증한다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'
import styles from './Badge.module.css'

test('count를 그대로 렌더한다', () => {
  render(<Badge count={3} aria-label="알림 3개" />)
  expect(screen.getByText('3')).toBeInTheDocument()
  expect(screen.getByLabelText('알림 3개')).toBeInTheDocument()
})

test('max를 초과하면 99+로 캡한다', () => {
  render(<Badge count={150} max={99} />)
  expect(screen.getByText('99+')).toBeInTheDocument()
})

test('count=0은 기본적으로 렌더하지 않는다', () => {
  const { container } = render(<Badge count={0} />)
  expect(container.firstChild).toBeNull()
})

test('showZero면 0을 렌더한다', () => {
  render(<Badge count={0} showZero />)
  expect(screen.getByText('0')).toBeInTheDocument()
})
```
### Badge.test.tsx — dot 모드는 텍스트 없이 aria-hidden이고 tone 클래스를 적용한다
```tsx
test('dot 모드는 숫자 없이 aria-hidden + dot/tone 클래스', () => {
  const { container } = render(<Badge dot tone="error" />)
  const el = container.firstChild as HTMLElement
  expect(el).toHaveAttribute('aria-hidden', 'true')
  expect(el.textContent).toBe('')
  expect(el.className).toContain(styles.dot)
  expect(el.className).toContain(styles.error)
})

test('aria-label이 있는 dot은 aria-hidden이 아니다', () => {
  render(<Badge dot aria-label="온라인" />)
  expect(screen.getByLabelText('온라인')).toBeInTheDocument()
})
```

## Story notes
Two story files. Import `Meta`/`StoryObj` from '@storybook/react-vite' (Storybook 10). Korean copy throughout; component/prop names English.

Chip.stories.tsx (title 'Components/Chip'):
- Playground: `args: { children: '진행중', variant: 'status', status: 'idle', size: 'md' }`.
- StatusMatrix: grid enumerating all 5 statuses × both sizes, each row with a plain status chip, one with `leadingIcon={<Icon name="circle" size={16} />}`, and one removable (`onRemove={() => {}}`). Copy examples: success '양품', error '불량', warning '주의', info '정보', idle '대기'.
- FilterRow: several `variant="filter"` chips, a mix of `selected` true/false (e.g. '전체', '카메라', '센서', '로봇'), demonstrating aria-pressed + focus ring. Use a small `useState` set wrapper or uncontrolled visual states (both selected states shown side by side for the Matrix screenshot).
- Matrix (the screenshot target): a single grid combining the status matrix (all semantics, both sizes, removable + leadingIcon columns) AND a filter row with both selected and unselected chips, so light+dark verification covers every color path in one shot.

Badge.stories.tsx (title 'Components/Badge'):
- Playground: `args: { count: 3, tone: 'primary' }`.
- Matrix: rows for each tone (primary/neutral/error) × states: single digit (count 5), capped (count 150 → '99+'), and dot mode. Include a labelled example (`aria-label="읽지 않음 8개"`). Show a Badge overlaid on a Button/Icon in one cell to demonstrate real usage (e.g. an inbox icon with a count).

## Render-verify checklist (light + dark)
- Status chips: each of success/error/warning/info/idle shows a SOFT tinted background (not a solid saturated fill) with clearly readable same-hue dark text — confirm in BOTH light and dark (dark uses deep-tint bg + light text).
- Status text/icon contrast passes AA visually — warning chip (hardest) text must be a deep brown-amber, legible on the pale amber background, not low-contrast yellow-on-yellow.
- Filter chip UNSELECTED: transparent bg with a visible 1px --outline border and --on-surface-variant text; SELECTED: filled --primary-container (soft red) with --on-primary-container text and no border.
- Keyboard focus on a filter chip shows the 2px focus ring (box-shadow var(--focus-ring)) around the pill in both themes; the remove X button shows its own focus ring when tabbed to.
- Filter chip hover shows the M3 state-layer darkening overlay without changing the base background color.
- Removable chip: trailing X (close icon) is vertically centered, tappable, inherits the chip's text color, and does not overflow the pill radius.
- Badge count: single digit renders as a circle, 'sm' text; '99+' renders as a wider pill; count=0 renders nothing.
- Badge tones: primary=brand red w/ white text, error=semantic red w/ white text, neutral=surface-container-high w/ muted text — all legible in light and dark; dot mode is a small filled circle with no text.
- No horizontal page scroll in the Matrix story; chips wrap/align on the 4px spacing grid.
- prefers-reduced-motion: state-layer/focus transitions are disabled (no visible fade) when reduced motion is on.

## Risks / decisions
1) The status chip's soft backgrounds REQUIRE 10 new tokens (5 container + 5 on-container, each light+dark). These must be added by an implementer/Task-0-style step to styles/foundation/tokens.css (light in :root) and styles/themes.css (dark overrides) BEFORE Chip.module.css passes check-tokens.mjs (it verifies every var(--x) is defined). The proposed hex values are AA-targeted but must be contrast-verified; treat them as starting points. 2) --outline is assumed from Phase 2 Task 0; if Task 0 slips, the filter unselected border falls back to --outline-variant (decorative, ~1.6:1) which would be a visible regression — flag ordering dependency. 3) Discriminated-union ChipProps means forwardRef targets two element types; the `ref as Ref<...>` casts are intentional. Confirm the plan owner is comfortable with the union API vs Button's single-interface style (chosen deliberately to prevent invalid button-in-button nesting). 4) Badge intentionally omits success/warning tones (white-on-those-solids fails AA) — confirm product doesn't need a solid green/amber count badge; if so, it must use the soft container tokens instead of white foreground.
