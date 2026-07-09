# Phase 2 Component Spec — Tooltip

- Directory: `src/components/Tooltip/`

## Exports (append to src/index.ts)
```ts
export { Tooltip } from './components/Tooltip/Tooltip'
export type { TooltipProps, TooltipPlacement } from './components/Tooltip/Tooltip'
```

## Props interface
```tsx
import {
  cloneElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'content'> {
  /** 툴팁에 표시할 비대화형 내용 (짧은 라벨 권장) */
  content: ReactNode
  /** 앵커(트리거) 대비 배치. 기본 'top' */
  placement?: TooltipPlacement
  /** hover/focus 후 표시까지 지연(ms). 기본 400 */
  delay?: number
  /**
   * 단일 트리거 엘리먼트. cloneElement로 aria-describedby가 주입되므로
   * 반드시 하나의 포커스 가능한 엘리먼트여야 한다 (button, a, input 등).
   */
  children: ReactElement
}

// forwardRef<HTMLSpanElement, TooltipProps> — ref는 position:relative 앵커 래퍼(span)에 붙는다.
// ...rest는 앵커 래퍼 span에 스프레드한다 (Button이 button에 스프레드하는 것과 동일 패턴).
// 이벤트 핸들러(onMouseEnter/onMouseLeave/onFocus/onBlur/onKeyDown)는 래퍼에 부착한다:
//   - onFocus/onBlur는 focusin/focusout 기반이라 자식 트리거에서 버블링되어 래퍼가 수신한다.
//   - onKeyDown에서 e.key === 'Escape'면 즉시 hide.
// 타이머: useRef로 setTimeout id 보관, show()는 delay 후 setOpen(true), hide()는 타이머 클리어 + setOpen(false).
// useEffect(() => () => clearTimeout(...), []) 로 언마운트 시 타이머 정리 (누수/경고 방지).
// tooltipId = useId(). 열렸을 때만 자식에 aria-describedby를 주입(기존 값과 병합)하고, role="tooltip" 노드를 렌더한다.
```

## Variants & API
Anchor-wrapper positioning, zero deps, no positioning library — exactly as the constraints require.

STRUCTURE (grounded in Button/Icon's cx + module.css pattern):
- Root = a `span.root` (position: relative; display: inline-flex) that hugs the trigger. It is the ref target and the ...rest spread target — mirrors Button spreading onto its control. Wrapping in a span (not cloning handlers onto the child) keeps the child's own handlers untouched and lets focusin/focusout bubbling do the work.
- Trigger = `children` (a single ReactElement), rendered via cloneElement ONLY to inject `aria-describedby` (merged with any existing value) when open. No handler injection.
- Bubble = `span[role=tooltip][id=useId()]` rendered conditionally (`{open && ...}`) so aria-describedby never dangles at a non-existent id, and the fade-in keyframe fires on mount.

API DECISIONS:
- `content: ReactNode` (not children) so children stays the trigger — parallels how Button separates `leadingIcon`/`children`.
- `placement?: TooltipPlacement = 'top'` → maps to `styles[placement]` class, same string-union→class mapping Button uses for variant/size (`styles[variant]`). Pure-CSS absolute positioning per side using `calc(100% + var(--space-2))` offsets + `translate(-50%)`/`translateY(-50%)` centering. No JS measurement, no flip.
- `delay?: number = 400` applied uniformly to hover AND focus via a single setTimeout code path (one show()); hide is always immediate (clears the pending timer, so a quick in-out never flashes). Cleanup on unmount via useEffect return.
- Uncontrolled only (internal useState open) — matches Button's stateless-but-self-contained ergonomics (Button owns its loading/disabled visual state without a controlled API). No open/onOpenChange to keep surface minimal and dependency-free.
- forwardRef to HTMLSpanElement: a consumer may sensibly attach a ref to the anchor (e.g. measuring, portaling later) — same rationale Button uses forwardRef for its control.
- Non-interactive: bubble has `pointer-events: none`, so the tooltip cannot trap the mouse and mouseleave from the trigger always resolves to hide.

## Accessibility
- role="tooltip" on the bubble; wired to the trigger via aria-describedby (id from useId), set only while open so it never references a missing node. Existing aria-describedby on the trigger is preserved (merged, space-joined).
- Keyboard operable without a pointer: focus of the trigger opens (onFocus bubbles to the wrapper), blur closes (onBlur bubbles). Escape closes while focus stays on the trigger (onKeyDown on wrapper, key === 'Escape'). Matches WAI-ARIA APG tooltip dismiss requirement.
- The trigger keeps its own :focus-visible ring (Tooltip adds no focus styling and does not steal focus — the bubble is never focusable, correct for role=tooltip).
- Contrast: bubble uses --on-surface text on --surface-container-high (AA in both themes) plus a --outline border for a >=3:1 boundary against the page surface.
- Reduced motion: fade is disabled under prefers-reduced-motion (content appears instantly, never hidden by animation).
- Content is non-interactive (pointer-events: none) — no focusable elements inside a tooltip, per APG.

## CSS notes
TOKENS ONLY (passes scripts/check-tokens.mjs; every var() below is defined in tokens.css/web-tokens.css/themes.css, except --outline from Task 0):

.root — position: relative; display: inline-flex; (no tokens; hugs trigger so mouseenter/leave bounds == trigger)

.tooltip — position: absolute; z-index: 1;
  padding: var(--space-1) var(--space-2);
  font: var(--type-body-sm); letter-spacing: var(--type-body-sm-tracking);
  color: var(--on-surface); background: var(--surface-container-high);
  border-radius: var(--radius-sm);
  border: 1px solid var(--outline);        /* 1px allowed by lint; real boundary → --outline (Task 0) */
  box-shadow: var(--elevation-2);
  white-space: nowrap;                     /* short-label tooltip; avoids needing a width token */
  pointer-events: none;
  animation: tooltip-in var(--motion-fast) var(--ease-standard);

Placement (offset = var(--space-2); percentages/translate only, no raw px):
  .top    { bottom: calc(100% + var(--space-2)); left: 50%; transform: translateX(-50%) }
  .bottom { top:    calc(100% + var(--space-2)); left: 50%; transform: translateX(-50%) }
  .left   { right:  calc(100% + var(--space-2)); top: 50%; transform: translateY(-50%) }
  .right  { left:   calc(100% + var(--space-2)); top: 50%; transform: translateY(-50%) }

@keyframes tooltip-in { from { opacity: 0 } to { opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .tooltip { animation: none } }

Light/dark: --surface-container-high, --on-surface, --outline, --elevation-2 all resolve per theme via themes.css dark overrides — no theme-specific CSS needed. Do NOT use --primary for any text here (not applicable) and never a raw hex. Motion strictly via --motion-fast + --ease-standard, guarded by reduced-motion.

## New tokens needed (Task 0 provides these)
- --outline: (provided by Phase 2 Task 0) — form-control/boundary border color, >=3:1 vs --surface in light+dark. Tooltip relies on it for the bubble's 1px border so the surface-colored bubble reads as a distinct layer against the page. No other new tokens required.

## Acceptance tests (implement as written; these define behavior)
### hover하면 delay 후 tooltip이 열린다 (delay 전에는 안 열림)
```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Tooltip } from './Tooltip'

test('hover하면 delay 후 tooltip이 열린다', async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<Tooltip content="저장합니다"><button>저장</button></Tooltip>)
  await user.hover(screen.getByRole('button', { name: '저장' }))
  expect(screen.queryByRole('tooltip')).toBeNull()
  act(() => { vi.advanceTimersByTime(400) })
  expect(screen.getByRole('tooltip')).toHaveTextContent('저장합니다')
  vi.useRealTimers()
})
```
### 열리면 트리거에 aria-describedby가 tooltip id로 연결된다
```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Tooltip } from './Tooltip'

test('열리면 aria-describedby가 tooltip id로 연결된다', async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<Tooltip content="도움말"><button>도움</button></Tooltip>)
  const btn = screen.getByRole('button', { name: '도움' })
  expect(btn).not.toHaveAttribute('aria-describedby')
  await user.hover(btn)
  act(() => { vi.advanceTimersByTime(400) })
  const tip = screen.getByRole('tooltip')
  expect(tip.id).not.toBe('')
  expect(btn).toHaveAttribute('aria-describedby', tip.id)
  vi.useRealTimers()
})
```
### mouseleave하면 즉시 닫히고 aria-describedby가 제거된다
```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Tooltip } from './Tooltip'

test('mouseleave하면 즉시 닫힌다', async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<Tooltip content="도움말"><button>도움</button></Tooltip>)
  const btn = screen.getByRole('button', { name: '도움' })
  await user.hover(btn)
  act(() => { vi.advanceTimersByTime(400) })
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  await user.unhover(btn)
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(btn).not.toHaveAttribute('aria-describedby')
  vi.useRealTimers()
})
```
### 키보드 focus에서 열리고 blur에서 닫힌다
```tsx
import { act, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Tooltip } from './Tooltip'

test('focus에서 열리고 blur에서 닫힌다', () => {
  vi.useFakeTimers()
  render(<Tooltip content="도움말"><button>도움</button></Tooltip>)
  const btn = screen.getByRole('button', { name: '도움' })
  act(() => { btn.focus() })
  act(() => { vi.advanceTimersByTime(400) })
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  act(() => { btn.blur() })
  expect(screen.queryByRole('tooltip')).toBeNull()
  vi.useRealTimers()
})
```
### Escape를 누르면 닫힌다
```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Tooltip } from './Tooltip'

test('Escape를 누르면 닫힌다', async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<Tooltip content="도움말"><button>도움</button></Tooltip>)
  const btn = screen.getByRole('button', { name: '도움' })
  act(() => { btn.focus() })
  act(() => { vi.advanceTimersByTime(400) })
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('tooltip')).toBeNull()
  vi.useRealTimers()
})
```
### placement 클래스가 적용되고 delay prop을 존중한다
```tsx
import { act, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Tooltip } from './Tooltip'
import styles from './Tooltip.module.css'

test('placement 클래스 적용 + delay 존중', () => {
  vi.useFakeTimers()
  render(
    <Tooltip content="도움말" placement="bottom" delay={100}>
      <button>도움</button>
    </Tooltip>,
  )
  act(() => { screen.getByRole('button', { name: '도움' }).focus() })
  act(() => { vi.advanceTimersByTime(99) })
  expect(screen.queryByRole('tooltip')).toBeNull()
  act(() => { vi.advanceTimersByTime(1) })
  const tip = screen.getByRole('tooltip')
  expect(tip.className).toContain(styles.bottom)
  vi.useRealTimers()
})
```

## Story notes
Storybook 10, import { Meta, StoryObj } from '@storybook/react-vite' (same as Button.stories). title: 'Components/Tooltip', component: Tooltip. Use Button as the trigger inside stories to show real usage and reuse the existing focus-ring/hover pattern.

- Playground: args { content: '저장합니다', placement: 'top', delay: 400 }, render wraps a <Button>저장</Button>. Expose placement/delay as controls (argTypes select for placement).
- Matrix (required, enumerates all placements): a centered grid with generous padding (so top/left bubbles are not clipped) rendering one Tooltip per placement, each wrapping a Button with Korean copy:
    top → content '확인' on <Button>확인</Button>
    bottom → content '취소' on <Button variant=\"outlined\">취소</Button>
    left → content '설정' on <Button variant=\"tonal\">설정</Button>
    right → content '삭제합니다' on <Button variant=\"text\">삭제</Button>
  Set delay={0} in the Matrix story ONLY so the screenshot tool captures bubbles open without waiting; note in a comment that 400ms is the real default. Since tooltips are hover/focus-gated, add a small helper in the Matrix render that force-opens by focusing each trigger, OR document that the screenshot step must hover/focus each trigger. Simplest: a story variant AlwaysOpen is unnecessary — instead the Matrix render focuses triggers on mount via autoFocus is not viable for 4; recommend the render just lays them out and the screenshot harness tab-focuses each. Keep copy in Korean; component/prop names English.
- Add a KeyboardAndEscape story demonstrating Tab-to-focus opens and Escape closes (documentation via story description).

## Render-verify checklist (light + dark)
- Matrix story in BOTH light and dark: all 4 placements (top/bottom/left/right) render the bubble on the correct side of its trigger with an even gap (var(--space-2)).
- Bubble text (--on-surface) on bubble background (--surface-container-high) is clearly legible in both themes; the 1px --outline border makes the bubble read as a distinct layer above the page surface (not blending in).
- Elevation shadow (--elevation-2) is visible in light and appropriately subdued in dark.
- Keyboard focus on a trigger (Tab to it) shows its own :focus-visible red ring AND opens the tooltip; the tooltip bubble itself shows no focus ring.
- top/bottom bubbles are horizontally centered on the trigger; left/right bubbles are vertically centered.
- With prefers-reduced-motion enabled, the tooltip appears instantly (no fade) and is fully visible — confirm it is not stuck at opacity 0.
- Corner/edge triggers: bubble content is not clipped by its own border-radius and text stays on a single line (white-space: nowrap).

## Risks / decisions
["Force-opening for screenshots: tooltips only appear on hover/focus, so the Matrix story needs the screenshot harness to focus each trigger (or a story-local mechanism). Flagging so the plan owner confirms how renderVerify screenshots are captured — no controlled `open` prop is provided by design.", "cloneElement requires children to be a SINGLE focusable element. If a consumer passes a plain text node, a Fragment, or a non-focusable element (e.g. a bare <span>), aria-describedby is dropped or focus-open never fires. Implementer should keep the ReactElement type and consider a dev-time warning; document the single-trigger contract.", "No collision/flip handling (constraint: no positioning library). A tooltip near a viewport edge can overflow. This is accepted scope for Phase 2; note it for future (a --outline-based arrow / flip could come later).", "useId() gives an SSR-stable id; fine here. If the trigger already sets aria-describedby, the merge logic (space-join, and restore original on close) must be implemented carefully — covered by the mouseleave test asserting the attribute is removed when there was none originally.", "Delay applies to focus too (uniform code path). If APG-strict 'immediate on focus' is desired, that is a one-line change; confirm the 400ms-on-focus behavior is acceptable."]
