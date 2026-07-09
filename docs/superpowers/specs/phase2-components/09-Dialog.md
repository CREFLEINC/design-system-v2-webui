# Phase 2 Component Spec — Dialog

- Directory: `src/components/Dialog/`

## Exports (append to src/index.ts)
```ts
export { Dialog } from './components/Dialog/Dialog'
export type { DialogProps, DialogSize } from './components/Dialog/Dialog'
```

## Props interface
```tsx
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, type DialogHTMLAttributes, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react'

export type DialogSize = 'sm' | 'md' | 'lg'

// native title/onClose/onCancel 시그니처와 충돌하므로 걷어내고 우리 의미로 재정의한다.
export interface DialogProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title' | 'onClose' | 'onCancel' | 'open'> {
  /** 컨트롤드 표시 상태. true → showModal(), false → close(). open이 단일 진실원(source of truth). */
  open: boolean
  /** 닫기 "요청" 콜백. Escape / 스크림 클릭 / X 버튼이 모두 여기로 라우팅된다.
   *  부모가 이 콜백에서 open=false로 내려야 실제로 닫힌다. */
  onClose: () => void
  /** 헤더 제목. 주어지면 aria-labelledby로 <dialog>에 연결된다. */
  title?: ReactNode
  /** max-width 프리셋. 기본 md. */
  size?: DialogSize
  /** 스크림(백드롭) 클릭으로 닫기 허용. 기본 true. false면 스크림 클릭 무시(파괴적 확인 등). */
  closeOnBackdropClick?: boolean
  /** 우상단 X 닫기 버튼 표시. 기본 true. */
  showCloseButton?: boolean
  /** 하단 액션 영역 — 보통 <Button> 들. 없으면 footer 미렌더. */
  footer?: ReactNode
  /** 본문. aria-describedby로 연결된다. */
  children?: ReactNode
}
```

## Variants & API
SIZES: sm/md/lg → max-width only (--dialog-max-sm/md/lg). Height is content-driven; panel caps at calc(100dvh - var(--space-8)) and the body scrolls. Width is calc(100vw - var(--space-8)) capped by the size token, so it is responsive on narrow viewports.

BUILD ON NATIVE <dialog> + showModal() (per recommendation). We get for free, with ZERO runtime deps: real focus trap, :modal top-layer stacking (renders above everything, no z-index war), the ::backdrop pseudo-element for the scrim, Escape-to-close, and focus restoration to the invoker on close. Hand-rolling any of these (react-focus-lock / portals / floating-ui) is explicitly banned, so native is the correct call.

CONTROLLED, single source of truth = `open`:
- innerRef (useRef) is the real handle; useImperativeHandle(ref, () => innerRef.current) forwards it so consumers can attach a ref (forwardRef<HTMLDialogElement>). This matches Button's forwardRef posture for interactive roots.
- Effect [open]: `const d = innerRef.current; if (!d) return; if (open && !d.open) d.showModal(); else if (!open && d.open) d.close();`. Guarding on d.open makes it idempotent and prevents "showModal on an open dialog" throws.
- We NEVER call d.close() from event handlers. Escape / scrim / X all call props.onClose only; the parent flips open→false, and the [open] effect performs the actual close(). This keeps native state and React state from diverging.

DISMISS ROUTING:
- Escape: native fires a `cancel` event before closing. onCancel={(e) => { e.preventDefault(); onClose() }} — preventDefault stops the native auto-close so the controlled effect owns it, and routes intent through onClose.
- Scrim click: onClick on the <dialog>; when a user clicks the ::backdrop, the event target IS the dialog element itself (documented behavior), whereas clicks on content target the inner panel/children. Handler: `if (closeOnBackdropClick && e.target === innerRef.current) onClose()`. The two-layer structure (transparent <dialog> sized to the panel + inner .panel holding bg/padding) is what makes this reliable — the dialog has padding:0 so there is no dialog-owned area except the backdrop.
- X button: type="button", onClick={onClose}, reuses <Icon name="close" size={24} /> with aria-label="닫기".

SCROLL LOCK: separate effect [open]: on open, snapshot document.body.style.overflow, set it to 'hidden'; cleanup restores the snapshot. Native modal does not lock body scroll, so this is required.

STRUCTURE:
<dialog ref aria-labelledby={title?titleId:undefined} aria-describedby={bodyId} className={cx(styles.dialog, styles[size], className)} onClick={onBackdrop} onCancel={onCancel} {...rest}>
  <div className={styles.panel}>
    {(title || showCloseButton) && <header className={styles.header}>{title && <h2 id={titleId} className={styles.title}>{title}</h2>}{showCloseButton && <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}><Icon name="close" size={24} /></button>}</header>}
    <div id={bodyId} className={styles.body}>{children}</div>
    {footer && <footer className={styles.footer}>{footer}</footer>}
  </div>
</dialog>

titleId/bodyId via useId(). DECISION: aria-labelledby only wired when `title` is present; if a consumer renders a title-less dialog they supply aria-label through ...rest (spread onto <dialog>). This mirrors Icon's "label present → semantic, absent → caller's problem" split.

## Accessibility
- Role/modality: native <dialog> opened via showModal() exposes role="dialog" and is implicitly aria-modal (the :modal state) — do NOT hand-set aria-modal. Content outside is inert automatically.
- Name: aria-labelledby points at the <h2 id={titleId}>. Title-less dialogs must get aria-label via ...rest (documented). Never leave a modal unnamed.
- Description: body wrapper carries id={bodyId} and <dialog aria-describedby={bodyId}> so SRs announce body context after the name.
- Keyboard: focus trap, Tab/Shift+Tab cycling, and Escape are all native to showModal(). Initial focus goes to the first focusable descendant (or an element with autofocus) per the platform; no JS needed. On close, native returns focus to the element that was focused when showModal() ran (the invoking trigger).
- Focus visibility: the X close button and every focusable get box-shadow: var(--focus-ring) on :focus-visible (identical pattern to Button). No focus ring on plain :focus (mouse).
- Escape is guarded through onCancel→preventDefault→onClose so it works even though open is controlled.
- Contrast (both themes): title uses --on-surface, body uses --on-surface-variant, close icon uses --on-surface-variant — all AA+ on --surface-container-high in light and dark. Scrim provides a dim underlay; no text sits on the scrim.
- The <h2> is a real heading (dialog title), giving SR heading navigation.

## CSS notes
TOKENS ONLY. px allowed only for the 1px footer divider border. Every value below is an existing token except the three proposed in newTokensNeeded (--scrim, --dialog-max-*), which will be defined in the token layer (Task 0 / web-tokens.css) so they resolve at lint time (check-tokens.mjs verifies var() references exist).

.dialog (the transparent shell, sized to the panel — this is what makes backdrop-target detection work):
  padding: 0; border: 0; background: transparent; color: var(--on-surface);
  width: calc(100vw - var(--space-8)); max-height: calc(100dvh - var(--space-8));
  margin: auto;  /* native centers modal via auto margins */
  (vw/vh/dvh are not px — lint only flags \bpx\b.)
.sm { max-width: var(--dialog-max-sm) }
.md { max-width: var(--dialog-max-md) }
.lg { max-width: var(--dialog-max-lg) }

::backdrop scrim: `.dialog::backdrop { background: var(--scrim) }`. --scrim is a token (defined with a light default + [data-theme='dark'] override) because ::backdrop lives in the module.css and raw rgba() is banned there.

.panel (the visible elevated card; holds bg + radius + shadow + padding):
  display: flex; flex-direction: column; min-height: 0; max-height: 100%;
  background: var(--surface-container-high);  /* elevated surface; steps above --surface in both themes */
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-4);  /* elevation tokens already carry the dark-mode softening */
  overflow: hidden;  /* clip children to the rounded corners; body scrolls internally */

.header: display:flex; align-items:flex-start; justify-content:space-between; gap: var(--space-4); padding: var(--space-5) var(--space-5) var(--space-3).
.title: margin:0; font: var(--type-title-lg); letter-spacing: var(--type-title-lg-tracking); color: var(--on-surface).
.body: padding: 0 var(--space-5) var(--space-5); overflow-y: auto; color: var(--on-surface-variant); font: var(--type-body-lg); letter-spacing: var(--type-body-lg-tracking). (overflow-y:auto + panel max-height = long content scrolls while header/footer stay put.)
.footer: display:flex; justify-content:flex-end; gap: var(--space-2); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--outline-variant). (Divider reuses --outline-variant exactly as Button reuses it for its 1px boundaries — consistent. If Task 0's stronger --outline lands, implementer may swap; not required.)
.close: appearance:none; border:0; background:transparent; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width: var(--space-7); height: var(--space-7); border-radius: var(--radius-full); color: var(--on-surface-variant); outline:none.
  .close::before M3 state layer (copy Button's overlay pattern): absolute inset:0; border-radius:inherit; background:transparent; transition: background var(--motion-fast) var(--ease-standard); .close:hover::before{ background: var(--state-hover-neutral) } .close:active::before{ background: var(--state-press-neutral) } (neutral, not on-primary — the close sits on a neutral surface).
  .close:focus-visible { box-shadow: var(--focus-ring) }

MOTION (reduced-motion-guarded enter):
  .dialog[open] { animation: dialog-in var(--motion-base) var(--ease-emphasized) }
  .dialog[open]::backdrop { animation: scrim-in var(--motion-base) var(--ease-standard) }
  @keyframes dialog-in { from { opacity: 0; transform: translateY(var(--space-2)) } to { opacity: 1; transform: translateY(0) } }
  @keyframes scrim-in { from { opacity: 0 } to { opacity: 1 } }
  @media (prefers-reduced-motion: reduce) { .dialog[open], .dialog[open]::backdrop { animation: none } }
  (translateY uses --space-2, not a raw px; animation targets the [open] attribute which native sets on showModal.)

Both themes work purely through tokens: surface-container-high, on-surface(-variant), outline-variant, elevation-4, and --scrim all have light values + dark overrides in the token layer. No component-level theme branching.

## New tokens needed (Task 0 provides these)
- --scrim: light `rgba(27, 27, 31, 0.45)` in :root, dark `rgba(0, 0, 0, 0.60)` under [data-theme='dark'] — modal backdrop scrim. No scrim/overlay token exists today, and the ::backdrop rule lives in a .module.css where raw rgba() is lint-banned, so it MUST be a token. Values chosen to dim underlying content while keeping the elevated panel legible in both themes (define in styles/web-tokens.css + styles/themes.css).
- --dialog-max-sm: 360px — sm dialog max-width (alerts / confirmations). Define in styles/web-tokens.css. The system has no width tokens and the largest spacing token is --space-12 (96px), too small for a dialog, so new max-width tokens are required rather than reusing spacing.
- --dialog-max-md: 512px — md dialog max-width (default; forms, settings). Define in styles/web-tokens.css.
- --dialog-max-lg: 720px — lg dialog max-width (rich/long content). Define in styles/web-tokens.css.

## Acceptance tests (implement as written; these define behavior)
### open이면 showModal되고 title이 접근가능한 이름이 된다 (aria-labelledby)
```tsx
import { createRef } from 'react'
import { beforeAll, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from './Dialog'
import { Button } from '../Button/Button'

// jsdom(29)에는 <dialog> 모달 API가 없다(showModal/close === undefined).
// 컨트롤드 open→showModal/close 경로를 실제로 태우기 위한 최소 폴리필.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.open = true }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.open = false
      this.dispatchEvent(new Event('close'))
    }
  }
})

test('open이면 열리고 title이 dialog의 접근가능한 이름이 된다', () => {
  render(<Dialog open onClose={() => {}} title="설정">본문 내용</Dialog>)
  const dlg = screen.getByRole('dialog', { name: '설정' })
  expect(dlg).toHaveAttribute('open')
  expect(screen.getByText('본문 내용')).toBeInTheDocument()
})
```
### open=false면 모달이 열리지 않는다 (forwardRef로 확인)
```tsx
test('open=false면 showModal되지 않고 ref가 forward된다', () => {
  const ref = createRef<HTMLDialogElement>()
  render(<Dialog ref={ref} open={false} onClose={() => {}} title="설정">본문</Dialog>)
  expect(ref.current).not.toBeNull()
  expect(ref.current!.open).toBe(false)
})
```
### 닫기(X) 버튼이 onClose를 호출한다
```tsx
test('닫기 버튼 클릭이 onClose를 호출한다', async () => {
  const onClose = vi.fn()
  render(<Dialog open onClose={onClose} title="설정">본문</Dialog>)
  await userEvent.click(screen.getByRole('button', { name: '닫기' }))
  expect(onClose).toHaveBeenCalledOnce()
})
```
### 스크림 클릭은 닫고 내용 클릭은 닫지 않는다
```tsx
test('스크림(dialog 자체) 클릭은 닫고, 내용 클릭은 무시한다', async () => {
  const onClose = vi.fn()
  render(<Dialog open onClose={onClose} title="설정">본문</Dialog>)
  const dlg = screen.getByRole('dialog')
  // 내용(제목) 클릭 → 타깃이 dialog가 아니므로 닫히지 않음
  await userEvent.click(screen.getByText('설정'))
  expect(onClose).not.toHaveBeenCalled()
  // 스크림 = dialog 엘리먼트 자체가 event.target → 닫힘
  await userEvent.click(dlg)
  expect(onClose).toHaveBeenCalledOnce()
})
```
### closeOnBackdropClick=false면 스크림 클릭을 무시한다
```tsx
test('closeOnBackdropClick=false면 스크림 클릭을 무시한다', async () => {
  const onClose = vi.fn()
  render(<Dialog open onClose={onClose} closeOnBackdropClick={false} title="설정">본문</Dialog>)
  await userEvent.click(screen.getByRole('dialog'))
  expect(onClose).not.toHaveBeenCalled()
})
```
### Escape(cancel)가 onClose로 라우팅되고 native 기본닫힘을 막는다
```tsx
test('cancel(Escape) 이벤트가 preventDefault되고 onClose로 라우팅된다', () => {
  const onClose = vi.fn()
  render(<Dialog open onClose={onClose} title="설정">본문</Dialog>)
  const dlg = screen.getByRole('dialog')
  const cancel = new Event('cancel', { cancelable: true, bubbles: true })
  dlg.dispatchEvent(cancel)
  expect(onClose).toHaveBeenCalledOnce()
  expect(cancel.defaultPrevented).toBe(true)
})
```
### 열리면 body 스크롤을 잠그고 닫히면 복구한다
```tsx
test('open 동안 body overflow를 hidden으로 잠그고 닫히면 복구한다', () => {
  const { rerender } = render(<Dialog open onClose={() => {}} title="설정">본문</Dialog>)
  expect(document.body.style.overflow).toBe('hidden')
  rerender(<Dialog open={false} onClose={() => {}} title="설정">본문</Dialog>)
  expect(document.body.style.overflow).toBe('')
})
```
### footer 액션(Button)이 렌더된다
```tsx
test('footer에 넘긴 Button 액션이 렌더된다', () => {
  render(
    <Dialog open onClose={() => {}} title="삭제" footer={<Button variant="filled">확인</Button>}>
      정말 삭제할까요?
    </Dialog>
  )
  expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()
})
```

## Story notes
Import Meta/StoryObj from '@storybook/react-vite'; reuse <Button> for footer actions and <Icon> is used internally for the X. Korean copy throughout.

- meta: { title: 'Components/Dialog', component: Dialog }. Because a modal needs a live open/close cycle, wrap interactive stories in a small stateful render (useState) rather than driving via args alone.
- Playground: stateful — a <Button>열기</Button> trigger sets open=true; Dialog title=\"설정\", body \"알림을 받을 방법을 선택하세요.\", footer={<><Button variant=\"text\">취소</Button><Button variant=\"filled\">확인</Button></>}. Demonstrates real showModal focus-trap + Escape + focus-return-to-trigger.
- OpenSm / OpenMd / OpenLg: each renders the Dialog with open=true (via a wrapper that opens on mount) at the corresponding size, so the shoot/screenshot pipeline captures each size's panel width. Copy: Sm = 파괴적 확인 (\"이 항목을 삭제할까요?\" / 취소·삭제), Md = 폼/설정, Lg = 긴 본문(스크롤 확인용, 여러 문단).
- ConfirmDestructive: closeOnBackdropClick={false}, showCloseButton={false}, footer 취소 + 삭제(filled) — shows the guardable-dismiss path where only explicit buttons close.
- Matrix note: a single screenshot cannot stack three modals — only one element may occupy the top layer (a second showModal throws). So the size \"matrix\" is expressed as the three separate Open{Sm,Md,Lg} stories; renderVerify targets those. Do NOT try to render multiple open Dialogs in one story.
- Storybook renders modals into the top layer over the preview iframe body; that is expected. A stateful wrapper keeps stories from getting stuck open.

## Render-verify checklist (light + dark)
- Light AND dark: scrim (--scrim) visibly dims the page behind the panel; panel reads as an elevated card (--surface-container-high) clearly above the background surface
- OpenSm / OpenMd / OpenLg show three distinct panel widths (~360 / 512 / 720px caps), each centered and, on a narrow viewport, inset by --space-8 from both edges (never touching screen edge)
- Title uses title-lg weight/size in --on-surface; body text in --on-surface-variant; both pass AA against the panel in both themes
- Footer actions are right-aligned with a 1px --outline-variant divider above them; the reused Buttons render at their normal filled/text styling
- Keyboard-focus the X close button → visible focus ring (box-shadow var(--focus-ring)) in both themes; hover shows a neutral state-layer, not a red one
- OpenLg with long body: body area scrolls internally while header and footer stay pinned (panel does not exceed viewport height, capped at 100dvh - --space-8)
- Panel shadow reads as elevation-4: a soft shadow in light, and in dark the shadow is subtler but the surface ladder still separates panel from scrim
- prefers-reduced-motion: reduce → dialog appears with no enter/translate animation (compare against default which slides up ~8px and fades)

## Risks / decisions
1) jsdom 29 verified to lack HTMLDialogElement.showModal/close (both undefined) — the test file MUST install the beforeAll polyfill shown, or every open-path test throws. This is real and included; the implementer must not drop it.\n2) onCancel (Escape) test dispatches a synthetic 'cancel' event because jsdom does not translate Escape keydown into a native cancel/close. React 19 does attach onCancel for <dialog>, so the handler fires; if a future React drops that, fall back to fireEvent or a manual keydown listener. Production Escape still relies on the browser's native cancel event.\n3) Backdrop detection uses event.target === dialogElement, which depends on the two-layer structure (transparent <dialog> padding:0 + inner .panel). If an implementer adds padding to the <dialog> or removes the inner panel, clicks on the padding area will falsely close. Keep padding on .panel only.\n4) Proposed tokens (--scrim, --dialog-max-sm/md/lg) must be added to the token layer in the SAME change (Task 0 or alongside), or check-tokens.mjs fails on unknown var() references.\n5) Native focus-return-to-invoker only works if the trigger was the focused element when showModal ran; documented for consumers. Not unit-testable in jsdom.\n6) Confirm React types expose onCancel/onClose/open on DialogHTMLAttributes so the Omit compiles cleanly under this repo's TS/React 19; adjust the Omit key list if tsc complains."
