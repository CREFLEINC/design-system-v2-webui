# Phase 3 Component Spec — Toast (ToastProvider + useToast)

- Directory: `src/components/Toast/`
- Reuses: Icon, IconButton, Button

## Exports
```ts
export { ToastProvider, useToast } from './components/Toast/Toast'
export type { ToastProviderProps, ToastVariant, ToastOptions, ToastInstance, ToastPosition, ToastApi } from './components/Toast/Toast'
```

## Props interface
```tsx
// ---- Toast.tsx public surface ----
export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'idle'
export type ToastPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface ToastAction { label: string; onClick: () => void }

export interface ToastOptions {
  /** 기본 idle. 컨테이너 채움 + on-container 텍스트로 매핑. */
  variant?: ToastVariant
  /** 강조 제목(선택). 굵게. */
  title?: ReactNode
  /** 본문 메시지. show('문자열')로 넘기면 이 필드가 된다. */
  description?: ReactNode
  /** 자동 사라짐(ms). 0 또는 Infinity → 자동 dismiss 안 함. Provider의 duration을 덮어씀. */
  duration?: number
  /** 선택 액션 버튼(Button text/sm 재사용). */
  action?: ToastAction
  /** 수동 닫기(X) 버튼 표시. 기본 true. */
  dismissible?: boolean
}

/** show()가 배열에 넣는 내부 인스턴스(공개 read 타입). */
export interface ToastInstance extends ToastOptions {
  id: string
  /** 종료 애니메이션 진행 중(제거 예약됨). */
  leaving?: boolean
}

/** useToast() 반환값. */
export interface ToastApi {
  /** 토스트를 띄우고 생성된 id를 반환. 문자열이면 { description } 로 승격. */
  show: (options: ToastOptions | string) => string
  /** id로 특정 토스트를 종료(종료 애니메이션 후 제거). */
  dismiss: (id: string) => void
}

export interface ToastProviderProps {
  children: ReactNode
  /** 스택 코너 위치. 기본 'bottom-right'. */
  position?: ToastPosition
  /** 개별 duration 미지정 시 기본 자동 dismiss(ms). 기본 5000. */
  duration?: number
  /** 동시 표시 최대 개수. 초과 시 가장 오래된 것 즉시 제거. 기본 4. */
  max?: number
  /** 라이브 region 랜드마크의 접근 이름. 기본 '알림'. */
  label?: string
}

// useToast(): Provider 밖에서 호출 시 throw. context 미존재 = 개발 실수.
export function useToast(): ToastApi
```

## Variants & API
ARCHITECTURE (zero-dep, portal-free):
- `ToastProvider` holds `const [toasts, setToasts] = useState<ToastInstance[]>([])` and renders `<ToastContext.Provider value={api}>{children}<ToastRegion .../></ToastContext.Provider>`. Because the region is `position: fixed`, it anchors to the viewport regardless of DOM depth — no `ReactDOM.createPortal` needed (matches Dialog's portal-free stance). The region is ALWAYS mounted (even when empty) so it exists as a live landmark before the first insertion.
- `api` is memoized (`useMemo`/`useCallback`) so `show`/`dismiss` identities are stable → child effects don't re-fire.
- `show(opts|string)`: normalize string → `{ description }`; generate id via `useId()`-seeded counter ref (`` `toast-${++seq.current}` ``, zero-dep, deterministic); if `toasts.length >= max`, drop the oldest immediately (hard remove, no exit anim — forced eviction); append new. Returns id.
- `dismiss(id)`: set that toast `leaving: true`, then `setTimeout(() => hardRemove(id), EXIT_MS)` (EXIT_MS ≈ 150). Removal is driven by a timeout, NOT `onAnimationEnd`, so it stays deterministic AND correct under reduced-motion (where the exit animation is `none` and `animationend` would never fire).

ToastItem (one per toast) — owns its own timer + pause:
- Auto-dismiss effect keyed on `[paused, duration, id, dismiss]`:
  ```
  useEffect(() => {
    if (paused || duration === 0 || duration === Infinity) return
    startRef.current = Date.now()
    const t = setTimeout(() => dismiss(id), remainingRef.current)
    return () => { clearTimeout(t); remainingRef.current -= Date.now() - startRef.current }
  }, [paused, duration, id, dismiss])
  ```
  PAUSE on hover/focus: `onMouseEnter/onFocus → setPaused(true)` (cleanup subtracts elapsed into `remainingRef`); RESUME on `onMouseLeave/onBlur → setPaused(false)` (effect re-runs with the leftover remaining). `onFocus`/`onBlur` bubble in React so focusing the close button or action pauses too. Works under `vi.useFakeTimers()` since vitest fake-timers also mock `Date.now`.

VARIANT → TOKEN MAP (container fill + on-container text; both AA-paired tokens already exist, so NO surface *-text token is needed):
- success → bg `--semantic-success-container`, fg `--on-semantic-success-container`, icon `check_circle`
- error   → bg `--semantic-error-container`,   fg `--on-semantic-error-container`,   icon `error`   (role=alert)
- warning → bg `--semantic-warning-container`, fg `--on-semantic-warning-container`, icon `warning`
- info    → bg `--semantic-info-container`,     fg `--on-semantic-info-container`,     icon `info`
- idle    → bg `--semantic-idle-container`,      fg `--on-semantic-idle-container`,      icon `info`
Icon color + text + close-button all inherit `currentColor` = the on-container fg, guaranteeing the AA pairing holds.

REUSE: `Icon` (leading variant icon, decorative/aria-hidden), `IconButton` (X close: `icon="close"` `size="sm"` `variant="standard"` `aria-label="알림 닫기"`, className tints it to `currentColor`), `Button` (optional `action` → `variant="text"` `size="sm"`, tinted to currentColor). This matches the "AlertBanner→IconButton for close" reuse guidance.

...REST / forwardRef: The public API is imperative (context + hook), not a DOM-spreading element, so the `...rest` "consumer wins / component-owned role after rest" rule and `forwardRef` are N/A at the Provider surface — documented deviation. Component-owned a11y (role/aria-live) lives on each ToastItem where consumers can't override it (correct-by-construction). No public ref target exists.

## Accessibility
- Region wrapper: always-mounted `role="region"` landmark with `aria-label={label}` (default '알림') so assistive tech has a stable live container present at load (before any toast is inserted).
- Per-toast live semantics (task-mandated): non-error → `role="status"` + `aria-live="polite"`; error → `role="alert"` + `aria-live="assertive"`. `aria-atomic="true"` so the whole toast is announced as one unit. Roles imply the politeness but aria-live is set explicitly for cross-AT reliability.
- Close button: `IconButton` requires `aria-label` — set to '알림 닫기'. Focus-visible ring comes from IconButton's own `:focus-visible { box-shadow: var(--focus-ring) }`.
- Keyboard: X and action buttons are native `<button>` → Tab-reachable + Enter/Space. Focusing any control inside a toast PAUSES its auto-dismiss (via bubbling `onFocus`) so keyboard users aren't raced by the timer; blur resumes.
- Hover pauses the timer (WCAG 2.2.1 — user can extend time before content disappears).
- Decorative leading icon is `aria-hidden` (Icon auto-hides when no `label`); meaning is carried by the text, not color alone.
- Contrast: every variant uses an AA-verified container/on-container token pair from web-tokens.css + themes.css (both light & dark defined) — no surface-relative red text, no new *-text token required.

## CSS notes
Toast.module.css — tokens only, px limited to 0/1/2 (all sizing via space/radius/type tokens).
- `.region { position: fixed; z-index: var(--z-toast); display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); pointer-events: none; }` — `pointer-events: none` so the (often empty) full-corner region never eats clicks; each `.toast` sets `pointer-events: auto`.
- Corner via `data-position`: `[data-position^=top]{top:0} [data-position^=bottom]{bottom:0} [data-position$=right]{right:0;align-items:flex-end} [data-position$=left]{left:0;align-items:flex-start} [data-position$=center]{left:0;right:0;align-items:center}`; top-* adds `flex-direction: column-reverse` so newest sits nearest the corner.
- `.toast { position: relative; isolation: isolate; display: flex; align-items: flex-start; gap: var(--space-3); max-width: var(--dialog-max-sm); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); box-shadow: var(--elevation-3); font: var(--type-body-sm); pointer-events: auto; }`
- Variant classes set only `background` (--semantic-*-container) + `color` (--on-semantic-*-container); `.icon/.title/.close/.action { color: currentColor }` inherit fg so the AA pair always holds. `.title { font: var(--type-label-lg); letter-spacing: var(--type-label-lg-tracking) }`.
- Enter: `.toast { animation: toast-in var(--motion-base) var(--ease-emphasized) }`; Exit: `.leaving { animation: toast-out var(--motion-fast) var(--ease-standard) forwards }`. Keyframes touch only opacity + transform (translateX from ±var(--space-4) for right/left; translateY for center/top).
- Reduced-motion (file bottom, targets the animating classes explicitly per docs/reduced-motion.md): `@media (prefers-reduced-motion: reduce) { .toast, .leaving { animation: none } }`. Removal still fires via the JS EXIT_MS timeout, so nothing is stranded when the exit animation is suppressed. IconButton/Button own their own reduced-motion + state-layer pseudos, so no `::before` needs listing here.
- Only one previously-undefined token is referenced: `--z-toast` (see newTokensNeeded). All others (--space-*, --radius-md, --elevation-3, --type-*, --semantic-*-container, --on-semantic-*-container, --dialog-max-sm, --motion-*, --ease-*) exist and pass lint:tokens.

## New tokens needed
- --z-toast: 1100 / 1100 (theme-agnostic, single value) — no z-index scale token exists today (Select hard-codes 20, Dialog relies on the native <dialog> top layer). Toast must stack above everything including dialogs, so it needs a named z above app content and any Select popover. CAVEAT documented in risks: a native modal <dialog> lives in the browser TOP LAYER, which sits above ALL z-index; to guarantee toasts render over an open modal, the region additionally opts into the top layer via the `popover="manual"` attribute (zero-dep, no createPortal). --z-toast still governs stacking vs. non-top-layer content and Select.

## Acceptance tests
### 0) File preamble — imports + test harnesses (prepended to Toast.test.tsx; the following test() blocks reference these)
```tsx
import { useRef } from 'react'
import { expect, test, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast, type ToastOptions, type ToastProviderProps } from './Toast'

// src/test/setup.ts already installs the fake-timers jest shim, so vi.useFakeTimers() + userEvent cooperate.
const EXIT_MS = 150 // must match Toast.tsx EXIT_MS

function Trigger({ options }: { options?: ToastOptions }) {
  const { show } = useToast()
  return <button onClick={() => show(options ?? { description: '저장되었습니다' })}>알림</button>
}

function setup(providerProps: Partial<ToastProviderProps> = {}, options?: ToastOptions) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<ToastProvider {...providerProps}><Trigger options={options} /></ToastProvider>)
  return { user, click: () => user.click(screen.getByRole('button', { name: '알림' })) }
}

// 증가 카운터로 서로 다른 토스트를 쌓는 하네스 (max 테스트용)
function Counter() {
  const { show } = useToast()
  const n = useRef(0)
  return <button onClick={() => { n.current += 1; show({ description: `토스트 ${n.current}`, duration: 0 }) }}>추가</button>
}
```
### 1) show()는 role=status 토스트를, error 변형은 role=alert를 렌더한다
```tsx
test('show()는 role=status 토스트를 렌더하고 error 변형은 role=alert가 된다', async () => {
  vi.useFakeTimers()
  try {
    const a = setup({}, { description: '저장되었습니다' })
    await a.click()
    expect(screen.getByRole('status')).toHaveTextContent('저장되었습니다')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})

test('error 변형은 role=alert(assertive)로 announce된다', async () => {
  vi.useFakeTimers()
  try {
    const a = setup({}, { variant: 'error', description: '업로드 실패' })
    await a.click()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('업로드 실패')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
  } finally { vi.useRealTimers() }
})
```
### 2) duration 경과 후 자동으로 제거된다
```tsx
test('duration 경과 후 종료 애니메이션 시간까지 지나면 자동 제거된다', async () => {
  vi.useFakeTimers()
  try {
    const a = setup({}, { description: '자동 사라짐', duration: 3000 })
    await a.click()
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(3000) })       // duration 만료 → leaving 표시 + 제거 예약
    act(() => { vi.advanceTimersByTime(EXIT_MS) })     // 종료 애니메이션 시간 후 실제 제거
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})
```
### 3) 호버하면 타이머가 멈추고, 벗어나면 재개된다
```tsx
test('호버 중에는 자동 dismiss가 일시정지되고 벗어나면 재개된다', async () => {
  vi.useFakeTimers()
  try {
    const a = setup({}, { description: '호버 유지', duration: 3000 })
    await a.click()
    const toast = screen.getByRole('status')
    await a.user.hover(toast)
    act(() => { vi.advanceTimersByTime(6000) })        // 일시정지 → 만료 시간 한참 지나도 유지
    expect(screen.getByRole('status')).toBeInTheDocument()
    await a.user.unhover(toast)
    act(() => { vi.advanceTimersByTime(3000 + EXIT_MS) }) // 남은 시간 재개 → 제거
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})
```
### 4) 닫기(X) 버튼 클릭이 토스트를 제거한다
```tsx
test('닫기 버튼 클릭이 토스트를 수동 제거한다', async () => {
  vi.useFakeTimers()
  try {
    const a = setup({}, { description: '수동 닫기', duration: 0 }) // 자동 dismiss 없음
    await a.click()
    expect(screen.getByRole('status')).toBeInTheDocument()
    await a.user.click(screen.getByRole('button', { name: '알림 닫기' }))
    act(() => { vi.advanceTimersByTime(EXIT_MS) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})
```
### 5) max 초과 시 가장 오래된 토스트를 즉시 제거한다
```tsx
test('max를 넘기면 가장 오래된 토스트가 즉시 제거된다', async () => {
  vi.useFakeTimers()
  try {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ToastProvider max={2}><Counter /></ToastProvider>)
    const add = screen.getByRole('button', { name: '추가' })
    await user.click(add); await user.click(add); await user.click(add)
    expect(screen.queryByText('토스트 1')).not.toBeInTheDocument() // 강제 축출은 애니메이션 없이 즉시
    expect(screen.getByText('토스트 2')).toBeInTheDocument()
    expect(screen.getByText('토스트 3')).toBeInTheDocument()
  } finally { vi.useRealTimers() }
})
```

## Story notes
title 'Components/Toast'. Stories in English names, Korean copy. Every interactive story wraps content in `<ToastProvider position="bottom-right">`. A small `useToast()`-driven trigger component (`function Demo(){ const {show}=useToast(); return <Button onClick={()=>show({variant:'success',title:'저장됨',description:'변경 사항이 저장되었습니다.'})}>성공 토스트</Button> }`) provides the buttons.
Stories: Playground (buttons firing each variant), AutoDismiss (short duration to watch it fade), PersistentWithAction (duration:0 + action button '실행 취소'), ErrorAssertive (error variant), Positions (a control cycling all 6 positions).
Matrix (id `components-toast--matrix`): renders ALL FIVE variants at once, statically, so a single screenshot verifies every container/on-container pairing in light and dark. Because real toasts are transient, the Matrix story mounts a provider and, on mount (`useEffect(()=>{...},[])`), calls `show` for each variant with `duration: 0` and `dismissible: true` — they persist for the screenshot. Give the Matrix its own ToastProvider so the stack renders in-corner; a note comment explains this mirrors Dialog.stories' Matrix which also side-steps transience.

## Render-verify
- 5개 변형(success/error/warning/info/idle) 토스트가 코너 스택에 각기 다른 --semantic-*-container 채움 + --on-semantic-*-container 텍스트/아이콘으로 렌더되고, 라이트/다크 각각 대비가 AA를 만족한다 (다크에서 themes.css의 어두운 틴트 컨테이너로 스왑, 순수 화이트/블랙 없음).
- 각 토스트 좌측에 변형별 아이콘(check_circle/error/warning/info/info)이 currentColor로 표시되고 우측에 X(IconButton) 닫기 버튼이 보인다.
- region이 지정 코너(기본 bottom-right)에 --space-4 여백으로 고정되고, 토스트 간 --space-3 간격, max-width 360px(--dialog-max-sm)로 폭이 제한된다.
- X 버튼에 키보드 포커스 시 --focus-ring이 컨테이너 채움 위에서 또렷하게 보인다.
- action 버튼이 있는 토스트(PersistentWithAction)에서 액션 텍스트가 on-container 색으로 읽히고 elevation-3 그림자로 표면에서 떠 보인다.
- 다크 스크린샷에서 컨테이너/텍스트가 라이트의 단순 반전이 아니라 themes.css 다크 오버라이드 값으로 렌더된다.

## Risks
- TOP LAYER: a native modal `<dialog>` (our Dialog) renders in the browser top layer, above ANY z-index. `--z-toast` alone will NOT float a toast over an open modal. Mitigation (zero-dep): give the region the `popover="manual"` attribute and call `.showPopover()` on mount so the region itself joins the top layer; `--z-toast` then governs ordering vs. Select/other non-top-layer UI. Implementer must feature-detect `showPopover` (jsdom lacks it — guard so tests don't throw) and keep the region visible via CSS if popover is unsupported.
- Fake timers depend on vitest mocking `Date.now` (it does by default) for the pause/remaining bookkeeping; if a future config sets `toFake` without `Date`, the pause math breaks — tests would catch it.
- `IconButton` standard variant uses neutral state-layer tokens (`--state-*-neutral`, translucent) which read fine over colored containers, but verify the hover overlay is visible on the darkest container (error/dark). If too subtle, add a toast-scoped `.close:hover::before` override — but that duplicates IconButton's owned pseudo, so prefer leaving IconButton intact.
- Announcing order: rapidly firing many toasts can flood an assertive live region; `max` eviction bounds the DOM but screen-reader verbosity for bursts of errors is inherent to aria-live=assertive — acceptable per task spec.
- `duration: 0`/`Infinity` toasts never auto-dismiss; ensure `dismissible` defaults true so they're always closable (guard against a stuck non-dismissible persistent toast).
