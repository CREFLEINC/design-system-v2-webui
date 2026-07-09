# Phase 2 Component Spec — IconButton

- Directory: `src/components/IconButton/`

## Exports (append to src/index.ts)
```ts
export { IconButton } from './components/IconButton/IconButton'
export type { IconButtonProps, IconButtonVariant, IconButtonSize } from './components/IconButton/IconButton'
```

## Props interface
```tsx
import { forwardRef, useState, type ButtonHTMLAttributes, type MouseEvent } from 'react'

export type IconButtonVariant = 'standard' | 'filled' | 'tonal'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Material Symbols 아이콘 이름 (리가처). 예: 'settings', 'close' */
  icon: string
  /** toggle && pressed일 때 보여줄 대체 아이콘 (선택). 예: 'star' */
  selectedIcon?: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  /** true면 토글 버튼으로 동작 — aria-pressed를 노출한다 */
  toggle?: boolean
  /** 제어(controlled) 모드 pressed 상태 */
  pressed?: boolean
  /** 비제어(uncontrolled) 모드 초기 pressed 상태 */
  defaultPressed?: boolean
  /** pressed가 바뀌려 할 때 호출 (제어/비제어 공통) */
  onPressedChange?: (pressed: boolean) => void
  /**
   * 아이콘 전용 버튼은 보이는 텍스트가 없으므로 접근 가능한 이름이 필수.
   * ButtonHTMLAttributes의 optional 'aria-label'을 required로 좁힌다.
   */
  'aria-label': string
}

// 참고: aria-labelledby로 이름을 주고 싶은 소비자는 aria-label=""로 회피 가능하나,
// 기본 계약은 "aria-label 필수"로 타입에서 강제한다.
```

## Variants & API
VARIANTS (3): standard / filled / tonal — matches the icon-only subset of M3. (No 'outlined'/'text' — those are text-button concepts; keep IconButton to the three container treatments.)
SIZES (3): sm/md/lg → square box of --control-height-sm|md|lg (32/40/48). Circular via --radius-full. Icon glyph size mapped in TSX: `const ICON_SIZE = { sm: 20, md: 24, lg: 24 } as const` (all valid Icon `size` values 20|24).

ROOT: `<button>` via forwardRef<HTMLButtonElement>. `type` defaults to 'button' (form accidental-submit guard, exactly like Button). `...rest` spread onto the button. `disabled` respected (native).

ICON CONSUMPTION (reuses Icon internally, decorative): render `<Icon name={displayIcon} size={ICON_SIZE[size]} />` with NO `label` prop, so Icon sets `aria-hidden` + no role. The button's own `aria-label` is the sole accessible name. `displayIcon = toggle && isPressed && selectedIcon ? selectedIcon : icon`.

TOGGLE (controlled + uncontrolled, mirrors a standard React input pattern):
```tsx
const isControlled = pressed !== undefined
const [internal, setInternal] = useState(defaultPressed ?? false)
const isPressed = isControlled ? pressed : internal

function handleClick(e: MouseEvent<HTMLButtonElement>) {
  if (toggle) {
    const next = !isPressed
    if (!isControlled) setInternal(next)
    onPressedChange?.(next)
  }
  onClick?.(e)               // original handler still fires
}
```
Render `aria-pressed={toggle ? isPressed : undefined}` — non-toggle buttons emit NO aria-pressed attribute. Pass `onClick={handleClick}`; do NOT also spread a second onClick (destructure `onClick` out of rest).

CLASSNAME: `cx(styles.root, styles[variant], styles[size], className)` — same shape as Button. Selected/unselected visuals are driven by the `[aria-pressed]` attribute in CSS (no extra class needed), which keeps state and style in sync via one source of truth.

KEY DECISIONS grounded in Button/Icon: (1) state-layer ::before overlay identical to Button — never mutate background on hover/press. (2) `type='button'` default identical to Button. (3) Icon stays decorative because the button already names itself, avoiding a double-announced name. (4) aria-label required at the type level is the enforcement mechanism the task asks for; a Story also demonstrates it.

## Accessibility
ROLE: native `<button>` (role=button implicit). Keyboard operability is native (Enter/Space activate, Tab focus) — no custom key handlers needed.
NAME: `aria-label` is required in the props type; the internal Icon is aria-hidden so the label is the only accessible name. getByRole('button', { name: <label> }) must resolve.
TOGGLE STATE: `aria-pressed` present only when `toggle` — value tracks `isPressed`. Non-toggle buttons omit the attribute entirely (announced as a plain button, not a toggle). onPressedChange fires on every activation; in controlled mode the DOM state does not change until the parent updates `pressed` (correct controlled semantics).
FOCUS: `:focus-visible { box-shadow: var(--focus-ring) }` — visible ring on keyboard focus only, matching Button. `outline: none` with the token ring replacing it.
DISABLED: native `disabled` blocks pointer + keyboard activation and removes it from tab order; overlay suppressed and colors switch to --state-disabled-*.
CONTRAST (AA): standard icon color --on-surface-variant on --surface (both themes) ≥ 4.5:1; filled --on-primary on --primary; tonal --on-primary-container on --primary-container (light 8.1:1 / dark 10.3:1). Toggle-unselected filled/tonal use --on-surface-variant on --surface-container-high (AA both themes). Selected standard uses --primary-text (the AA-safe red, not --primary).

## CSS notes
TOKENS ONLY. px used only for the 0-radius/none cases — none needed here (all radius via --radius-full, all sizing via --control-height-*). Full IconButton.module.css:

```css
.root {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  cursor: pointer;
  outline: none;
  transition: box-shadow var(--motion-fast) var(--ease-standard);
}

/* 상태 레이어 — 배경을 건드리지 않고 오버레이만 얹는다 (M3, Button과 동일) */
.root::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  transition: background var(--motion-fast) var(--ease-standard);
  pointer-events: none;
}

.root:focus-visible { box-shadow: var(--focus-ring); }

/* -------- sizes (정사각형) -------- */
.sm { width: var(--control-height-sm); height: var(--control-height-sm); }
.md { width: var(--control-height-md); height: var(--control-height-md); }
.lg { width: var(--control-height-lg); height: var(--control-height-lg); }

/* -------- variants (기본/토글 selected 룩) -------- */
.standard { background: transparent; color: var(--on-surface-variant); }
.standard:hover::before { background: var(--state-hover-neutral); }
.standard:active::before { background: var(--state-press-neutral); }
.standard[aria-pressed='true'] { color: var(--primary-text); }

.filled { background: var(--primary); color: var(--on-primary); }
.filled:hover::before { background: var(--state-hover-on-primary); }
.filled:active::before { background: var(--state-press-on-primary); }
/* 토글 unselected — 눌리지 않은 상태를 중립 컨테이너로 구분 */
.filled[aria-pressed='false'] { background: var(--surface-container-high); color: var(--on-surface-variant); }
.filled[aria-pressed='false']:hover::before { background: var(--state-hover-neutral); }
.filled[aria-pressed='false']:active::before { background: var(--state-press-neutral); }

.tonal { background: var(--primary-container); color: var(--on-primary-container); }
.tonal:hover::before { background: var(--state-hover); }
.tonal:active::before { background: var(--state-press); }
.tonal[aria-pressed='false'] { background: var(--surface-container-high); color: var(--on-surface-variant); }
.tonal[aria-pressed='false']:hover::before { background: var(--state-hover-neutral); }
.tonal[aria-pressed='false']:active::before { background: var(--state-press-neutral); }

/* -------- disabled -------- */
.root:disabled { cursor: default; color: var(--state-disabled-text); }
.filled:disabled, .tonal:disabled { background: var(--state-disabled-fill); }
.root:disabled::before { background: transparent; }

/* -------- reduced motion (Task 0 관례) -------- */
@media (prefers-reduced-motion: reduce) {
  .root, .root::before { transition: none; }
}
```
Light/dark both work purely through tokens: every color is a themed var, and themes.css swaps --surface-container-high, --on-surface-variant, --primary-text, --state-* under [data-theme='dark']. Motion via --motion-fast/--ease-standard, disabled under prefers-reduced-motion. Every var() referenced exists in foundation/tokens.css, web-tokens.css, or themes.css (verified) — no --outline needed (icon buttons have no border).

## New tokens needed (Task 0 provides these)
- none

## Acceptance tests (implement as written; these define behavior)
### aria-label을 접근 가능한 이름으로 노출하고 클릭을 전달한다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'
import styles from './IconButton.module.css'

test('aria-label을 접근 가능한 이름으로 노출하고 클릭을 전달한다', async () => {
  const onClick = vi.fn()
  render(<IconButton icon="settings" aria-label="설정" onClick={onClick} />)
  await userEvent.click(screen.getByRole('button', { name: '설정' }))
  expect(onClick).toHaveBeenCalledOnce()
})
```
### variant/size 클래스가 적용된다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IconButton } from './IconButton'
import styles from './IconButton.module.css'

test('variant/size 클래스가 적용된다', () => {
  render(<IconButton icon="add" aria-label="추가" variant="filled" size="lg" />)
  const el = screen.getByRole('button')
  expect(el.className).toContain(styles.filled)
  expect(el.className).toContain(styles.lg)
})
```
### 내부 아이콘은 장식용(aria-hidden)이고 이름은 aria-label에서만 온다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IconButton } from './IconButton'

test('내부 아이콘은 장식용(aria-hidden)이고 이름은 aria-label에서만 온다', () => {
  render(<IconButton icon="delete" aria-label="삭제" />)
  const btn = screen.getByRole('button', { name: '삭제' })
  // 리가처 텍스트는 DOM엔 있으나 접근성 트리에서는 숨겨진다
  expect(btn.textContent).toContain('delete')
  expect(btn.querySelector('[aria-hidden="true"]')).not.toBeNull()
})
```
### disabled면 클릭이 차단된다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'

test('disabled면 클릭이 차단된다', async () => {
  const onClick = vi.fn()
  render(<IconButton icon="star" aria-label="즐겨찾기" disabled onClick={onClick} />)
  await userEvent.click(screen.getByRole('button'))
  expect(onClick).not.toHaveBeenCalled()
})
```
### 기본 type은 button (form 우발 제출 방지)
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IconButton } from './IconButton'

test('기본 type은 button (form 우발 제출 방지)', () => {
  render(<IconButton icon="close" aria-label="닫기" />)
  expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
})
```
### 토글이 아니면 aria-pressed 속성이 없다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IconButton } from './IconButton'

test('토글이 아니면 aria-pressed 속성이 없다', () => {
  render(<IconButton icon="close" aria-label="닫기" />)
  expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed')
})
```
### 비제어 토글: 클릭하면 aria-pressed가 뒤집히고 onPressedChange가 호출된다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'

test('비제어 토글: 클릭하면 aria-pressed가 뒤집히고 onPressedChange가 호출된다', async () => {
  const onPressedChange = vi.fn()
  render(
    <IconButton icon="star_border" selectedIcon="star" aria-label="즐겨찾기"
      toggle defaultPressed={false} onPressedChange={onPressedChange} />
  )
  const btn = screen.getByRole('button', { name: '즐겨찾기' })
  expect(btn).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(btn)
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  expect(onPressedChange).toHaveBeenCalledWith(true)
})
```
### 비제어 토글: pressed면 selectedIcon으로 스왑된다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'

test('비제어 토글: pressed면 selectedIcon으로 스왑된다', async () => {
  render(
    <IconButton icon="star_border" selectedIcon="star" aria-label="즐겨찾기"
      toggle defaultPressed={false} />
  )
  const btn = screen.getByRole('button')
  expect(btn.textContent).toContain('star_border')
  await userEvent.click(btn)
  // 스왑되면 star_border 리가처는 사라지고 star만 남는다
  expect(btn.textContent).not.toContain('star_border')
  expect(btn.textContent).toContain('star')
})
```
### 제어 토글: pressed prop이 소스오브트루스 — 부모가 갱신하지 않으면 안 바뀐다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'

test('제어 토글: pressed prop이 소스오브트루스 — 부모가 갱신하지 않으면 안 바뀐다', async () => {
  const onPressedChange = vi.fn()
  render(
    <IconButton icon="mic" aria-label="음소거" toggle pressed={false}
      onPressedChange={onPressedChange} />
  )
  const btn = screen.getByRole('button')
  await userEvent.click(btn)
  expect(onPressedChange).toHaveBeenCalledWith(true)
  // 부모가 pressed를 갱신하지 않았으므로 DOM 상태는 그대로 false
  expect(btn).toHaveAttribute('aria-pressed', 'false')
})
```

## Story notes
title 'Components/IconButton', component IconButton. meta.args = { icon: 'settings', 'aria-label': '설정', variant: 'standard', size: 'md' }. Stories:
- Playground: {} (argTypes로 variant/size/toggle 노출).
- Matrix (required, Button.stories 스타일 그대로): variants ['standard','filled','tonal'] 바깥 루프, 각 행에서 sizes ['sm','md','lg'] map + disabled 예시. 한국어 aria-label 사용 (예: '추가','삭제','설정'). 예:
  {(['standard','filled','tonal'] as const).map(v => (
    <div key={v} style={{display:'flex',gap:12,alignItems:'center'}}>
      {(['sm','md','lg'] as const).map(s => (
        <IconButton key={s} icon=\"settings\" aria-label={`설정 ${s}`} variant={v} size={s} />
      ))}
      <IconButton icon=\"settings\" aria-label=\"비활성\" variant={v} disabled />
    </div>
  ))}
- Toggle story: 비제어 토글 한 줄 — <IconButton toggle defaultPressed icon=\"star_border\" selectedIcon=\"star\" aria-label=\"즐겨찾기\" variant='filled' /> 등 3 variant × (unselected/selected) 매트릭스로 selected/unselected 대비를 보여준다.
- (선택) AccessibleName note story: aria-label이 필수임을 주석/문서로 강조.

## Render-verify checklist (light + dark)
- Matrix 각 행이 standard/filled/tonal 3개 variant, 열이 sm/md/lg 3개 사이즈로 정사각형+원형(radius-full)으로 렌더된다 (라이트/다크 모두)
- 키보드 Tab 포커스 시 --focus-ring이 보인다 (standard 투명 배경에서도 링이 표면 대비 보임), 라이트/다크 모두
- filled 아이콘은 --on-primary(흰색)로 레드 원 위에 AA 대비, tonal 아이콘은 --on-primary-container로 연한 레드 컨테이너 위에 표시 — 다크에서도 대비 유지
- standard 아이콘은 --on-surface-variant(중립)이며 --primary(레드 채움)가 아니다
- 토글 행: unselected(aria-pressed=false)는 --surface-container-high 중립 배경 + 중립 아이콘, selected(aria-pressed=true)는 filled=레드/tonal=레드컨테이너/standard=레드 아이콘(--primary-text)으로 명확히 구분된다
- selectedIcon 지정 토글은 pressed일 때 아이콘 글리프가 바뀐다 (예: star_border → star)
- disabled 버튼은 --state-disabled-fill 배경 + --state-disabled-text 아이콘이고 hover 오버레이가 뜨지 않는다, 라이트/다크 모두
- hover 시 배경이 어두워지지 않고 상태 레이어 오버레이만 얹힌다 (M3)

## Risks / decisions
1) aria-label required in the type: consumers who prefer aria-labelledby must pass aria-label=\"\" (empty) — acceptable, but note it in JSDoc so it isn't surprising. 2) `[aria-pressed='false']` selectors only style the toggle-unselected look; non-toggle buttons never get that attribute so base variant styles apply — confirm the check-tokens lint and CSS-module scoping handle attribute selectors on a class (they do; it's plain CSS). 3) Icon size union is 20|24|40|48; the sm/md/lg → 20/24/24 map stays within it — do NOT map lg to a non-member value. 4) Must destructure `onClick` out of `...rest` and route through the toggle wrapper, otherwise a spread onClick would double-fire or bypass toggle logic. 5) --focus-ring inner layer is var(--surface); on a standard (transparent) IconButton sitting on a non--surface parent the inner ring gap may not perfectly match the backdrop — same tradeoff Button already accepts, flag only if placed on colored bars. 6) Toggle-unselected filled/tonal contrast relies on --surface-container-high existing in both themes (it does).
