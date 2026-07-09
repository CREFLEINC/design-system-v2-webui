# Phase 4 Component Spec — PageHeader — a single component (no type-prop dispatch, no sub-split). Unlike Chart, PageHeader has one fixed structure with optional slots; splitting would add ceremony with no payoff. It imports no other components: breadcrumb/actions/tabs are ReactNode slots (consumer passes <Breadcrumb/>, <Button/>, <Tabs/>), so PageHeader stays a pure layout+semantics block with zero component coupling — the same way StatCard treats its `children` sparkline slot. forwardRef target is the semantic <header> (HTMLElement).

- Directory: `src/components/PageHeader/ — PageHeader.tsx, PageHeader.module.css, PageHeader.stories.tsx, PageHeader.test.tsx (one dir, single component). Add exports to src/index.ts.`
- Reuses: Breadcrumb (composed into the breadcrumb slot in stories/consumers — not imported by PageHeader.tsx), Tabs (composed into the tabs slot), Button (composed into the actions slot)

## Exports
```ts
export { PageHeader } from './components/PageHeader/PageHeader'
export type { PageHeaderProps, PageHeaderSize, HeadingLevel } from './components/PageHeader/PageHeader'
```

## Props interface
```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export type PageHeaderSize = 'compact' | 'default'
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  /** 페이지 제목 (필수). 실제 heading 요소로 렌더된다. */
  title: ReactNode
  /**
   * 제목 heading 레벨 (1~6). 문서 아웃라인/계층용 — 기본 1(h1).
   * 시각적 크기는 `size`가 결정하며 레벨과 분리(h2여도 default 크기 유지 가능).
   */
  headingLevel?: HeadingLevel
  /** 제목 위 경로 슬롯. 보통 기존 <Breadcrumb/>. 자체 nav+aria-current 시맨틱을 그대로 사용. */
  breadcrumb?: ReactNode
  /** 제목 아래 보조 설명(평문 텍스트). */
  description?: ReactNode
  /** 우측 정렬 액션 슬롯 — 보통 <Button/> 그룹. 좁은 폭에서 제목 블록 아래로 래핑. */
  actions?: ReactNode
  /** 헤더 하단 탭 슬롯. 보통 기존 <Tabs/>. */
  tabs?: ReactNode
  /** 밀도 프리셋 — 제목 타입 스케일 + 수직 간격 조절. 기본 'default'. */
  size?: PageHeaderSize
}

// 구현 골자 (rest = consumer-wins, header는 네이티브 시맨틱이라 컴포넌트 소유 role/aria 없음):
// const { title, headingLevel = 1, breadcrumb, description, actions, tabs,
//         size = 'default', className, ...rest } = props
// const Heading = `h${headingLevel}` as 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'
// return (
//   <header ref={ref} data-size={size} className={cx(styles.root, className)} {...rest}>
//     {breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
//     <div className={styles.titleRow}>
//       <div className={styles.headingBlock}>
//         <Heading className={styles.title}>{title}</Heading>
//         {description && <p className={styles.description}>{description}</p>}
//       </div>
//       {actions && <div className={styles.actions}>{actions}</div>}
//     </div>
//     {tabs && <div className={styles.tabs}>{tabs}</div>}
//   </header>
// )
```

## Variants & API
Two axes, deliberately decoupled:
- size: 'compact' | 'default' (default 'default') — VISUAL density only. default → title=--type-headline-lg (28px), description=--type-body-lg, generous --space gaps. compact → title=--type-headline-sm (24px), description=--type-body-sm, tighter gaps. Applied via data-size on root + `.root[data-size='compact']` attribute selectors (like StatCard's data-status/data-direction), so tests assert a stable attribute, not a hashed class.
- headingLevel: 1-6 (default 1) — SEMANTIC document-outline level only, rendered as a real h1..h6 via `const Heading = \`h${headingLevel}\``. Decoupling means a sub-page can use h2 while keeping the large default visual size.
Slots (all optional ReactNode except title): breadcrumb (above title), description (under title), actions (right of title, wraps below on narrow), tabs (below the block). title is required. PageHeader imports none of these — pure composition via slots, matching the conventions' "consumer wins" spread (rest spread last on <header>; header carries no component-owned role/aria to place after rest).

## Accessibility
- Real heading element: title renders as h1..h6 chosen by headingLevel, so it participates in the document outline. Visual size (size prop) is intentionally separate from semantic level — a designer can shrink the type without demoting the heading, or demote to h2 under an AppShell that owns the h1, without changing size. This is the core a11y decision.
- <header> element wraps the block. Critical landmark note for the implementer: a <header> is the `banner` landmark ONLY when it is NOT scoped inside main/article/aside/nav/section. PageHeader is page-CONTENT level and in real apps sits inside AppShell's <main>, where it is a generic grouping element — so it will NOT create a duplicate `banner` alongside AppShell's Topbar. PageHeader must add NO role of its own (do not force role="banner"/region); let the host context decide. (In isolated RTL render at body root it resolves to `banner`; tests query the element via container.querySelector('header') to stay context-independent.)
- Composed slots keep their own semantics untouched: Breadcrumb supplies nav[aria-label]+aria-current="page"; Tabs supplies role="tablist"/tab/tabpanel roving focus; actions are real <button>s. PageHeader adds nothing on top and never intercepts their handlers (consumer-wins spread; no synthetic onClick to compose because the root <header> has no internal handler).
- description is plain <p> text (not wired into aria) — the heading text is the accessible name source.
- WCAG AA: title=--on-surface, description=--on-surface-variant, all on --surface/--surface-container* pass AA in light and dark (both theme values verified present in themes.css / foundation tokens.css).

## CSS notes
Flexbox-only responsive header; no runtime deps, no layout libs.
- .root: display flex, flex-direction column, gap between sections from --space (default: --space-4 breadcrumb→titleRow and titleRow→tabs; compact: --space-2/--space-3). color base --on-surface.
- .titleRow: display flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-4) (column-gap between headingBlock and actions, row-gap when wrapped). This is what makes actions drop below on narrow widths.
- .headingBlock: flex: 1 1 20rem; min-width: 0; (min-width:0 lets long titles wrap instead of overflowing; 20rem basis is the wrap threshold — rem, not px, so token rules OK). display flex column, gap var(--space-1)/(--space-2).
- .actions: flex: 0 0 auto; margin-left: auto; display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: flex-end — stays right-aligned even when wrapped onto its own row.
- .title: font: var(--type-headline-lg); letter-spacing: var(--type-headline-lg-tracking); color: var(--on-surface); margin: 0. Under .root[data-size='compact'] → --type-headline-sm + its tracking.
- .description: font: var(--type-body-lg) (compact → --type-body-sm); color: var(--on-surface-variant); margin: 0.
- .breadcrumb / .tabs: plain flow wrappers (the composed components own their look); tabs wrapper may add margin/negative-inset? No — keep neutral, no borders.
- px only 0/1/2 everywhere (margins/paddings/gaps via --space tokens; only 0 for margin resets). No raw colors — only --on-surface*/--type-*/--space-*.
- NO @media (prefers-reduced-motion) block: PageHeader defines zero transitions/animations of its own (all motion lives in composed Breadcrumb/Tabs/Button, each already guarded). Do not add empty motion just to have something to guard.

## New tokens needed
- none

## Acceptance tests
### 제목은 기본 h1로 렌더되고 텍스트를 노출한다
```tsx
import { expect, test } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageHeader } from './PageHeader'

test('제목은 기본 h1로 렌더되고 텍스트를 노출한다', () => {
  render(<PageHeader title="대시보드" />)
  const h = screen.getByRole('heading', { level: 1, name: '대시보드' })
  expect(h.tagName).toBe('H1')
})
```
### headingLevel은 시맨틱 레벨만 바꾸고 size(시각)와 분리된다
```tsx
test('headingLevel은 시맨틱 레벨만 바꾸고 size(시각)와 분리된다', () => {
  render(<PageHeader title="설비 현황" headingLevel={2} size="compact" />)
  const h = screen.getByRole('heading', { level: 2, name: '설비 현황' })
  expect(h.tagName).toBe('H2')
  // 레벨을 2로 내려도 h1은 존재하지 않음 (시각/시맨틱 분리)
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
})
```
### 선택 슬롯이 header 안에 모두 렌더된다
```tsx
test('선택 슬롯이 header 안에 모두 렌더된다', () => {
  const { container } = render(
    <PageHeader
      title="주문"
      breadcrumb={<nav aria-label="탐색 경로">경로</nav>}
      description="최근 30일 주문 내역"
      actions={<button>새 주문</button>}
      tabs={<div role="tablist" aria-label="주문 보기">탭</div>}
    />
  )
  const header = container.querySelector('header') as HTMLElement
  expect(header).toBeInTheDocument()
  expect(within(header).getByRole('navigation', { name: '탐색 경로' })).toBeInTheDocument()
  expect(within(header).getByText('최근 30일 주문 내역')).toBeInTheDocument()
  expect(within(header).getByRole('button', { name: '새 주문' })).toBeInTheDocument()
  expect(within(header).getByRole('tablist', { name: '주문 보기' })).toBeInTheDocument()
})
```
### 선택 슬롯 미지정 시 해당 요소가 렌더되지 않는다
```tsx
test('선택 슬롯 미지정 시 해당 요소가 렌더되지 않는다', () => {
  render(<PageHeader title="빈 헤더" />)
  expect(screen.queryByRole('navigation')).toBeNull()
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.getByRole('heading', { name: '빈 헤더' })).toBeInTheDocument()
})
```
### ref는 header 요소로 전달되고 rest(data-*, aria-label)가 스프레드된다
```tsx
test('ref는 header 요소로 전달되고 rest가 스프레드된다', () => {
  const ref = { current: null as HTMLElement | null }
  const { container } = render(
    <PageHeader ref={ref} title="설비" data-testid="ph" aria-label="설비 페이지 헤더" />
  )
  const header = container.querySelector('header') as HTMLElement
  expect(ref.current).toBe(header)
  expect(header.tagName).toBe('HEADER')
  expect(header).toHaveAttribute('data-testid', 'ph')
  expect(header).toHaveAttribute('aria-label', '설비 페이지 헤더')
})
```
### actions 슬롯 버튼의 onClick이 삼켜지지 않고 동작한다
```tsx
test('actions 슬롯 버튼의 onClick이 삼켜지지 않고 동작한다', async () => {
  const user = userEvent.setup()
  let clicked = 0
  render(
    <PageHeader title="주문" actions={<button onClick={() => { clicked++ }}>내보내기</button>} />
  )
  await user.click(screen.getByRole('button', { name: '내보내기' }))
  expect(clicked).toBe(1)
})
```
### size가 root의 data-size로 반영된다
```tsx
test('size가 root의 data-size로 반영된다', () => {
  const { container, rerender } = render(<PageHeader title="x" size="compact" />)
  expect(container.querySelector('header')).toHaveAttribute('data-size', 'compact')
  rerender(<PageHeader title="x" />)
  expect(container.querySelector('header')).toHaveAttribute('data-size', 'default')
})
```

## Story notes
title: 'Components/PageHeader'. Story copy Korean, story/export names English. Composes the REAL Breadcrumb, Tabs, Button imports (proves the slot contract end-to-end).
- Playground: full composition — <Breadcrumb items=[홈→제품→CX-500]/> + title "CX-500 센서 상세" + description + actions=(<Button variant="outlined">내보내기</Button> + <Button>편집</Button>) + tabs=<Tabs items=[개요/사양/이력]/>.
- Compact: size="compact" with the same slots to show tighter density + smaller title.
- TitleOnly: just title (+ headingLevel demo, e.g. 2) to show the minimal shape.
- ActionsWrap: render inside a `<div style={{ maxWidth: 420 }}>` wrapper so the actions visibly wrap below the title block — demonstrates the responsive requirement in Storybook.
- Matrix (REQUIRED, story id components-pageheader--matrix): a grid crossing {default, compact} × {title-only, title+description, full-with-all-slots}, each labelled with a Korean <strong> caption, so the light/dark backgrounds addon shows every combination at once. Reuse real Breadcrumb/Tabs/Button.

## Render-verify
- default vs compact side-by-side: title type scale differs (headline-lg 28px vs headline-sm 24px) and vertical gaps tighten in compact — in BOTH light and dark.
- Full composition stacking order top→bottom: breadcrumb, then title+description on the left with actions on the right of the same row, then tabs row below — vertical rhythm from --space tokens looks even.
- Narrow width (ActionsWrap / Matrix full cell in a constrained column): actions drop to their own row BELOW the title block and stay right-aligned; nothing overflows and the page body does not scroll horizontally; a very long title wraps rather than clipping.
- Text contrast: title=--on-surface, description=--on-surface-variant are legible and AA in both light (#FBF8FD surface) and dark (#1B1D21 surface).
- Composed children theme correctly and own their styling: Breadcrumb links/current color, Tabs active underline, Button variants — no double borders, no PageHeader-added background; the block reads as one unit in both themes.

## Risks
- Landmark trap: if the implementer reflexively adds role="banner" or renders PageHeader as a direct body child in the AppShell demo, it duplicates the Topbar's banner landmark. Keep <header> bare and nest it inside AppShell's <main>. (Documented in a11y.)
- Wrap threshold is a single flex-basis (20rem); at mid widths a long single-word title + many action buttons can look tight one frame before wrapping — acceptable, no JS/container-query needed. min-width:0 on headingBlock is load-bearing to avoid horizontal overflow; do not drop it.
- headingLevel must render a real tag (template-literal tag name), NOT aria-level on a div — an aria-only heading loses native semantics and the h1 default requirement.
