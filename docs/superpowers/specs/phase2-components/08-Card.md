# Phase 2 Component Spec — Card (+ CardHeader, CardBody, CardFooter)

- Directory: `src/components/Card/`

## Exports (append to src/index.ts)
```ts
export { Card, CardHeader, CardBody, CardFooter } from './components/Card/Card'
export type { CardProps, CardSectionProps, CardSurface, CardElevation } from './components/Card/Card'
```

## Props interface
```tsx
import { forwardRef, type HTMLAttributes, type Ref, type ReactNode } from 'react'

export type CardSurface = 'base' | 'low' | 'default' | 'high'
export type CardElevation = 0 | 1 | 2 | 3 | 4 | 5

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** 표면 사다리 매핑: base=--surface, low=--surface-container-low, default=--surface-container, high=--surface-container-high */
  surface?: CardSurface
  /** --elevation-0..5 그림자 레벨 (다크에서는 토큰이 자동으로 약화됨) */
  elevation?: CardElevation
  /** 1px --outline-variant 경계선 (장식용). elevation과 독립적으로 병용 가능 */
  bordered?: boolean
  /** true면 전체 카드가 클릭 가능한 <button>으로 렌더 — 상태 레이어 + 포커스 링 + 네이티브 키보드(Enter/Space) */
  interactive?: boolean
  /** interactive일 때만 유효 (button의 disabled로 전달) */
  disabled?: boolean
  children?: ReactNode
}

/** Header/Body/Footer 공통 — 순수 레이아웃 래퍼 (composition 슬롯) */
export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

// 루트 시그니처(참고): 
// export const Card = forwardRef<HTMLElement, CardProps>(function Card(
//   { surface = 'low', elevation = 0, bordered = false, interactive = false,
//     disabled = false, className, children, ...rest }, ref) { ... })
// interactive면 <button type="button" ref={ref as Ref<HTMLButtonElement>} disabled={disabled} {...rest}>,
// 아니면 <div ref={ref as Ref<HTMLDivElement>} {...rest}>. rest 타입이 HTMLAttributes<HTMLElement>라
// 두 엘리먼트 모두에 타입 안전하게 spread된다.
// CardHeader/CardBody/CardFooter는 각각 <div className={cx(styles.header|body|footer, className)} {...rest}>.
// DX용 정적 부착: Object.assign(Card, { Header: CardHeader, Body: CardBody, Footer: CardFooter })
```

## Variants & API
COMPOSITION API — subcomponents, NOT slot props. Justification: Button uses simple props because its content is a single label+optional icons. A Card's content is open-ended (title, media, arbitrary body, multiple action buttons). Slot props (header/footer as ReactNode) would cap structure and force prop drilling; subcomponents (CardHeader/CardBody/CardFooter) let consumers compose freely, omit any region, repeat regions, and nest real interactive children. Exported both as flat named exports (matches index.ts style: Icon, Button) AND attached as statics (Card.Header/Card.Body/Card.Footer via Object.assign) for discoverability. The subcomponents are thin layout wrappers (padding/typography/alignment only) with no required props — maximal flexibility, minimal surface.

INTERACTIVE = renders a real <button type="button">, not <div role="button" tabIndex={0}>. Justification: a native button gives free, already-correct keyboard semantics (Enter on keydown, Space on keyup), focus order, and disabled handling — zero hand-rolled keydown logic, and the behavior is genuinely testable with userEvent. Grounded in Button.tsx which also renders a native <button> and sets type="button" to avoid accidental form submit. TRADE-OFF (documented in stories + JSDoc): an interactive card must NOT contain other interactive descendants (nested buttons/links inside a button are invalid HTML). When the whole surface is the target, use interactive. When the card merely groups content with its own inner buttons/links, use a NON-interactive Card (div root) and nest a Button — the Footer test demonstrates exactly this.

Root element switches on `interactive`: div (default) vs button. forwardRef<HTMLElement> with the ref cast per branch; rest is HTMLAttributes<HTMLElement> so it spreads type-safely onto either. onClick lives in HTMLAttributes so it works on both, but is only meaningfully wired on the interactive button.

surface (4 levels) and elevation (0–5) are ORTHOGONAL and both map straight to existing tokens — in dark mode the surface ladder carries hierarchy while elevation shadows soften, exactly as themes.css intends. Defaults: surface='low', elevation=0, bordered=false, interactive=false — a flat, subtly-tinted card that reads against the page --surface. bordered uses the CSS `border` property (1px allowed by the lint) so it never collides with the box-shadow channel reserved for elevation + focus ring.

## Accessibility
- Non-interactive Card: renders a plain <div> (generic role) — a passive grouping container. No tabindex, no role invented. Consumers may pass role/aria-* via ...rest (e.g. role="group" aria-labelledby pointing at a CardHeader id).
- Interactive Card: native <button type="button"> ⇒ role=button, tab-focusable by default, activates on both Enter (keydown) and Space (keyup) with ZERO custom JS. `disabled` maps to the native button disabled attribute, which removes it from the tab order and blocks click+keyboard — no manual guarding.
- Visible focus: on interactive cards, :focus-visible sets box-shadow: var(--focus-ring), var(--_elev) so the 2px surface-gap + 2px primary ring composes on top of whatever elevation shadow is active (single rule, works for all 6 elevation levels). Matches Button's :focus-visible box-shadow contract.
- Hover/press affordance uses the M3 state-layer ::before overlay (neutral tint), never a color mutation of the surface — preserving contrast of content.
- Interactive cards should not contain other focusable controls (enforced by convention + docs); the accessible name comes from the card's text content or an explicit aria-label passed through ...rest.
- Contrast: body text --on-surface-variant and header --on-surface both clear WCAG AA on all four surface levels in light and dark (foundation-verified surface/on-surface pairs). Border --outline-variant is decorative only (allowed here per task).

## CSS notes
TOKENS ONLY; the only literal px are 1px (bordered border) and the 0/2px inside var(--focus-ring)/box-shadow, all in the lint allowlist. Elevation is routed through a self-defined local custom property so focus composes cleanly:
- .card { position: relative; isolation: isolate; display: flex; flex-direction: column; border-radius: var(--radius-lg); color: var(--on-surface); --_elev: var(--elevation-0); box-shadow: var(--_elev); transition: box-shadow var(--motion-base) var(--ease-standard); }
  (--_elev is DEFINED in this file, so the token-existence lint passes; it lets one focus rule layer the ring over any elevation.)
- Surface classes: .base{background:var(--surface)} .low{background:var(--surface-container-low)} .default{background:var(--surface-container)} .high{background:var(--surface-container-high)}
- Elevation classes only override the local var: .elev1{--_elev:var(--elevation-1)} … .elev5{--_elev:var(--elevation-5)} (.elev0 needs no rule; base default is elevation-0=none).
- .bordered { border: 1px solid var(--outline-variant) } — uses the CSS border property, kept OUT of the box-shadow channel so it stacks with elevation and focus without merge conflicts.
- State layer (interactive only), mirrors Button's ::before pattern: .card::before{content:'';position:absolute;inset:0;border-radius:inherit;background:transparent;pointer-events:none;transition:background var(--motion-fast) var(--ease-standard)} then .interactive:hover::before{background:var(--state-hover-neutral)} and .interactive:active::before{background:var(--state-press-neutral)} — neutral (not red) because a surface, not a primary control. Both neutral tokens are defined in light (web-tokens.css) and dark (themes.css).
- .interactive { cursor: pointer; text-align: inherit; border-width: 0; font: inherit; outline: none; } (reset native button chrome; re-add border only via .bordered). appearance reset via background from surface class.
- .interactive:focus-visible { box-shadow: var(--focus-ring), var(--_elev) }
- Optional hover lift: .interactive:hover { --_elev: var(--elevation-2) } — the box-shadow transition animates it. This is the non-trivial motion, so: @media (prefers-reduced-motion: reduce){ .card{ transition: none } } disables the shadow tween (per Task 0 reduced-motion convention).
- Interactive disabled: .interactive:disabled{cursor:default} and .interactive:disabled::before{background:transparent} (kill the state layer). Do NOT gray the content — a disabled card still displays its info.
- Subcomponents (spacing/typography/layout only): .header{padding:var(--space-5) var(--space-5) var(--space-4);font:var(--type-title-lg);letter-spacing:var(--type-title-lg-tracking);color:var(--on-surface)} .body{padding:0 var(--space-5) var(--space-5);font:var(--type-body-lg);color:var(--on-surface-variant)} .footer{display:flex;justify-content:flex-end;gap:var(--space-2);padding:var(--space-4) var(--space-5)} — Card root has no padding so the state layer/border/radius span the full surface and regions own their spacing.
Light+dark both work purely through tokens: surface ladder, on-surface pairs, elevation shadows, and neutral state layers all have dark overrides in themes.css; no color is hard-coded.

## New tokens needed (Task 0 provides these)
- none

## Acceptance tests (implement as written; these define behavior)
### 비-interactive Card는 button이 아니라 컨테이너로 렌더한다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card, CardHeader, CardBody, CardFooter } from './Card'
import styles from './Card.module.css'

test('비-interactive Card는 button이 아니라 컨테이너로 렌더한다', () => {
  render(<Card>본문</Card>)
  expect(screen.getByText('본문')).toBeInTheDocument()
  expect(screen.queryByRole('button')).toBeNull()
})
```
### surface/elevation/bordered 클래스가 적용된다
```tsx
test('surface/elevation/bordered 클래스가 적용된다', () => {
  render(<Card surface="high" elevation={3} bordered data-testid="c">카드</Card>)
  const el = screen.getByTestId('c')
  expect(el.className).toContain(styles.high)
  expect(el.className).toContain(styles.elev3)
  expect(el.className).toContain(styles.bordered)
})
```
### interactive면 button으로 렌더되고 클릭을 전달한다
```tsx
test('interactive면 button으로 렌더되고 클릭을 전달한다', async () => {
  const onClick = vi.fn()
  render(<Card interactive onClick={onClick}>클릭</Card>)
  const el = screen.getByRole('button', { name: '클릭' })
  expect(el).toHaveAttribute('type', 'button')
  await userEvent.click(el)
  expect(onClick).toHaveBeenCalledOnce()
})
```
### interactive 카드는 탭 포커스 + 키보드(Enter/Space)로 활성화된다
```tsx
test('interactive 카드는 탭 포커스 + 키보드(Enter/Space)로 활성화된다', async () => {
  const onClick = vi.fn()
  render(<Card interactive onClick={onClick}>확인</Card>)
  await userEvent.tab()
  expect(screen.getByRole('button', { name: '확인' })).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  await userEvent.keyboard(' ')
  expect(onClick).toHaveBeenCalledTimes(2)
})
```
### interactive + disabled면 클릭이 차단된다
```tsx
test('interactive + disabled면 클릭이 차단된다', async () => {
  const onClick = vi.fn()
  render(<Card interactive disabled onClick={onClick}>비활성</Card>)
  const el = screen.getByRole('button')
  expect(el).toBeDisabled()
  await userEvent.click(el)
  expect(onClick).not.toHaveBeenCalled()
})
```
### ref를 루트에 전달하고 rest를 spread한다
```tsx
test('ref를 루트에 전달하고 rest를 spread한다', () => {
  const ref = { current: null as HTMLElement | null }
  render(<Card ref={ref} aria-label="요약 카드">x</Card>)
  expect(ref.current).not.toBeNull()
  expect(ref.current).toHaveAttribute('aria-label', '요약 카드')
})
```
### Header/Body/Footer 서브컴포넌트가 각 클래스와 children을 렌더한다
```tsx
test('Header/Body/Footer 서브컴포넌트가 각 클래스와 children을 렌더한다', () => {
  render(
    <Card>
      <CardHeader>제목</CardHeader>
      <CardBody>본문</CardBody>
      <CardFooter>
        <button>확인</button>
      </CardFooter>
    </Card>
  )
  expect(screen.getByText('제목').className).toContain(styles.header)
  expect(screen.getByText('본문').className).toContain(styles.body)
  // 비-interactive Card(div) 안에 실제 button을 중첩하는 정상 케이스
  const footerBtn = screen.getByRole('button', { name: '확인' })
  expect(footerBtn.parentElement?.className).toContain(styles.footer)
})
```

## Story notes
Stories in Storybook 10, import Meta/StoryObj from '@storybook/react-vite' (per Button.stories.tsx). Korean copy throughout.
- meta: title 'Components/Card', component Card, default args { surface: 'low', elevation: 0 }.
- Playground: a Card composing CardHeader('월간 검사 요약'), CardBody('총 1,240건 중 불량 32건이 검출되었습니다.'), CardFooter with a real <Button variant="text">자세히</Button> + <Button>확인</Button> — shows the non-interactive-card-with-inner-buttons pattern.
- Interactive: <Card interactive onClick={...}> whole-surface clickable ('설비 A · 가동중' with an <Icon name="factory" size={24} />) — note in docs it must not contain nested buttons.
- Matrix (REQUIRED, enumerates the axes): a grid iterating surface ['base','low','default','high'] on one axis and elevation [0,1,2,3] on the other, each cell a small Card with a CardHeader('카드') + CardBody('본문 텍스트'); plus a trailing row of interactive cards showing rest/hover/disabled ('클릭 가능' / '비활성'). Render the whole Matrix once on --surface page bg and rely on the Storybook theme toggle so a reviewer can screenshot light and dark. Include one bordered example per surface to verify the 1px --outline-variant boundary in both themes.

## Render-verify checklist (light + dark)
- Each of the 4 surface levels (base/low/default/high) is visibly distinguishable from the page --surface background in BOTH light and dark (surface ladder reads as hierarchy in dark where shadows are faint)
- Elevation 0–3 shadows increase in depth in light; in dark the shadows are subtle and hierarchy is carried mainly by the surface tint (matches themes.css elevation softening)
- Radius is --radius-lg (16px) on every card corner, including the state-layer overlay and border
- bordered cards show a crisp 1px --outline-variant edge in both themes, and the border coexists with elevation shadow (not overridden)
- Interactive card on keyboard focus (Tab) shows the focus ring — 2px surface gap + 2px primary red ring — layered on top of its elevation shadow, visible in both themes
- Interactive card hover shows a neutral state-layer tint (not a red tint, not a surface color change) and a subtle elevation lift
- Interactive disabled card shows no hover/press state layer and default cursor; its text content stays fully legible (not grayed out)
- Header title uses title-lg on --on-surface; body uses body-lg on --on-surface-variant — both clearly readable (AA) on every surface level in light and dark
- Footer actions are right-aligned with consistent gap

## Risks / decisions
1) Static subcomponent attach: Object.assign(Card, {Header,Body,Footer}) on a forwardRef exotic needs a small typed cast (e.g. `type CardComponent = typeof CardRoot & { Header: typeof CardHeader; ... }`). Both flat named exports and statics are provided so consumers are unaffected if the implementer drops the statics. 2) The div-vs-button ref cast (Ref<HTMLDivElement>|Ref<HTMLButtonElement>) is a deliberate, contained `as` cast — acceptable given ZERO-dep polymorphism, but the implementer should keep CardProps on HTMLAttributes<HTMLElement> so ...rest stays type-safe on both branches. 3) Space-key test relies on native button firing click on keyup for ' ' via userEvent — verify jsdom emits it; if flaky, split Enter/Space into separate awaits (already sequential). 4) Confirm --type-body-lg is the intended body size (no --type-body-md exists in web-tokens.css). 5) Reduced-motion: assumes Task 0 establishes the @media (prefers-reduced-motion: reduce) convention; the hover elevation tween is the only motion and is disabled there. 6) Decision to make interactive a native <button> (vs div+role) forbids nested interactive children — this is documented in JSDoc + stories and is the intended constraint, but the plan owner should confirm no design requires a clickable card WITH inner buttons (that case = non-interactive Card + inner Button).
