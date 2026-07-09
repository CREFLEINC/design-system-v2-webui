# Phase 4 Component Spec — AppShell

- Directory: `/Users/rangkim/Documents/Claude/Projects/CREFLE Web Design System/src/components/AppShell`
- Reuses: Sidebar (Navigation) — passed into the `sidebar` slot; supplies the `nav` landmark, Topbar (Navigation) — passed into the `topbar` slot; its <header> supplies the `banner` landmark, cx (utils) — className merge, Stories only: SidebarItem, SidebarSection, Breadcrumb, Button, IconButton, Icon, Badge, StatCard

## Exports
```ts
export { AppShell, useAppShell } from './components/AppShell/AppShell'
export type { AppShellProps } from './components/AppShell/AppShell'
```

## Props interface
```tsx
import {
  forwardRef,
  createContext,
  useContext,
  useId,
  useState,
  type HTMLAttributes,
  type ReactNode
} from 'react'

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /** 상단 바 슬롯. 보통 <Topbar/>. 내부 <header>가 banner 랜드마크를 제공하므로 AppShell은 banner를 중복 생성하지 않는다. (선택) */
  topbar?: ReactNode
  /** 좌측 사이드바 슬롯. 보통 <Sidebar/>. 내부 <nav>가 navigation 랜드마크를 제공한다. (선택) */
  sidebar?: ReactNode
  /** 스크롤되는 <main> 본문 콘텐츠 */
  children: ReactNode
  /** 제어 모드: 사이드바 그리드 컬럼 접힘. 지정 시 내부 상태를 쓰지 않는다 (Sidebar와 동일 패턴) */
  collapsed?: boolean
  /** 비제어 초기 접힘. 기본 false */
  defaultCollapsed?: boolean
  /** 접힘이 바뀔 때 호출 — useAppShell().setCollapsed 또는 슬롯 토글에서 트리거 */
  onCollapsedChange?: (collapsed: boolean) => void
  /** <main> id 겸 skip-link 타깃. 미지정 시 useId로 생성 */
  mainId?: string
  /** skip-to-content 링크 텍스트. 기본 '본문으로 건너뛰기' */
  skipLinkLabel?: string
  /** <main>의 접근명(선택). 지정 시 aria-label 부여 → getByRole('main', { name }) 조회 가능 */
  mainLabel?: string
}

/** 슬롯(Topbar/Sidebar) 내부의 커스텀 토글이 접힘 상태를 읽고/바꾸기 위한 컨텍스트. AppShell 밖에서 호출 시 throw. */
export interface AppShellContextValue {
  collapsed: boolean
  setCollapsed: (next: boolean) => void
}
export function useAppShell(): AppShellContextValue { /* throws if used outside <AppShell> */ }

export const AppShell: React.ForwardRefExoticComponent<
  AppShellProps & React.RefAttributes<HTMLDivElement>
> = forwardRef<HTMLDivElement, AppShellProps>(function AppShell(props, ref) { /* … */ })
```

## Variants & API
SINGLE component (no split, no `type` prop) — AppShell is one layout container; there are no visual variants, so a dispatcher/subtype split would add surface for nothing. It is a composition shell: it renders NO Sidebar/Topbar itself, only slots + the <main> landmark.

LAYOUT: CSS Grid "T-shape", matching the existing Navigation `AppShell` story exactly.
  grid-template-areas: "topbar topbar" / "sidebar main"
  grid-template-columns: var(--sidebar-width) 1fr   (rows: auto 1fr)
Topbar spans both columns on top; Sidebar in the left track; scrollable <main> fills the rest. The left track width is the SINGLE layout authority and switches to var(--sidebar-width-collapsed) when the root carries data-collapsed='true'.

STRUCTURE (root → children):
  <div ref className=shell data-collapsed=…>            ← generic div, NOT a landmark
    <a className=skipLink href={'#'+mainId}>…</a>        ← first focusable; visually-hidden until focused
    <div className=topbarArea>{topbar}</div>             ← generic wrapper; banner comes from Topbar's <header>
    <div className=sidebarArea>{sidebar}</div>           ← generic wrapper; nav comes from Sidebar's <nav>
    <main id=mainId tabIndex={-1} aria-label={mainLabel} className=main>{children}</main>

COLLAPSE STATE — mirrors the Sidebar controlled/uncontrolled pattern for API symmetry:
  isControlled = collapsed !== undefined; internal useState(defaultCollapsed); effective = isControlled ? collapsed : internal.
  setCollapsed(next) = { if (!isControlled) setInternal(next); onCollapsedChange?.(next) }.
  effective is written to data-collapsed on the root AND provided via AppShellContext.
AppShell renders NO toggle button of its own (the toggle UX belongs to the Sidebar's built-in IconButton, per Navigation). Two supported wirings:
  (1) CONTROLLED (canonical): consumer holds one useState, passes collapsed+onCollapsedChange to AppShell AND builds `sidebar={<Sidebar collapsed={c} onCollapsedChange={setC} …/>}`. The Sidebar's toggle flips both in sync — AppShell narrows the grid track while the Sidebar hides its labels.
  (2) CONTEXT: a custom toggle placed anywhere inside a slot calls useAppShell().setCollapsed(…); uncontrolled mode then self-drives and onCollapsedChange still fires.

REST / rest-order (per conventions §props): destructure the named props; spread {...rest} onto the root div so the consumer wins on generic attrs (id, data-*, style, className merged via cx). data-collapsed is COMPONENT-OWNED state → written AFTER {...rest} so a consumer can't desync layout from state. The root has no must-run handler to compose. main's id/role(implicit)/tabIndex/aria-label are component-owned and live on <main>, untouched by rest (rest targets the root).

forwardRef → root grid <div> (HTMLDivElement) so consumers can measure/observe the shell.

## Accessibility
Skip-to-content: a real <a> as the FIRST focusable node, href={'#'+mainId}, visually-hidden (absolute + translateY off-screen, NOT display:none so it stays focusable) and revealed on :focus with a focus ring. It targets <main id={mainId} tabIndex={-1}> — tabIndex=-1 makes the non-interactive main a programmatic focus target so activating the link moves focus into content (jsdom can't run native fragment focus, so tests assert href↔id wiring + tabIndex).

Landmark hygiene (the core a11y contract): AppShell contributes EXACTLY ONE landmark — <main>. It deliberately does NOT emit nav or banner; those come from the Sidebar (<nav>) and Topbar (<header> → banner, since the wrapping div is generic and not article/aside/main/nav/section). The topbarArea/sidebarArea wrappers are plain <div>s with no role, so no duplicate/blank landmarks are created. Result on a full page: 1 banner, 1 navigation, 1 main.

<main> gets aria-label only when `mainLabel` is provided (avoids an empty accessible name). Heading hierarchy is the consumer's (PageHeader) responsibility — AppShell adds no headings.

Keyboard: nothing traps focus; DOM order = skip-link → topbar → sidebar → main, giving a logical tab sequence. Contrast: skip link uses --surface-container-high bg + --primary-text (dark-AA-safe red) + --elevation-2; focus ring --focus-ring — verified-token combos, WCAG AA in light and dark. Responsive rail keeps the Sidebar's own accessible names intact (labels are clipped visually via overflow, not removed from the a11y tree).

## CSS notes
Tokens only; the only px are inside @media condition lines (linter exempts any line starting with @media) and 0/1/2 for borders. Every var() below exists in web-tokens.css / themes.css / foundation/tokens.css — no new token.

.shell — position: relative (anchors the absolute skip link); display: grid; grid-template-columns: var(--sidebar-width) 1fr; grid-template-rows: auto 1fr; grid-template-areas: "topbar topbar" "sidebar main"; height: 100%; min-height: 0; background: var(--surface); color: var(--on-surface); transition: grid-template-columns var(--motion-base) var(--ease-standard).
.shell[data-collapsed='true'] — grid-template-columns: var(--sidebar-width-collapsed) 1fr.  (Animating grid-template-columns is supported in current Chrome/Firefox/Safari when track count is stable; matches the Sidebar's own width transition (--motion-base/--ease-standard) so column + sidebar move together. Fallback = instant reflow, harmless.)
.topbarArea — grid-area: topbar; min-width: 0.
.sidebarArea — grid-area: sidebar; min-width: 0; min-height: 0; overflow: hidden (clips the Sidebar to the track when collapsed).
.main — grid-area: main; min-width: 0; min-height: 0; overflow: auto; outline: none (skip-target focus shows no ring on the region itself).

.skipLink — position: absolute; top: var(--space-2); left: var(--space-2); z-index: 1; transform: translateY(-200%) (hidden but focusable — NOT display:none); padding: var(--space-2) var(--space-4); border-radius: var(--radius-sm); background: var(--surface-container-high); color: var(--primary-text); font: var(--type-label-lg); text-decoration: none; box-shadow: var(--elevation-2); transition: transform var(--motion-fast) var(--ease-standard).
.skipLink:focus — transform: translateY(0); outline: none; box-shadow: var(--focus-ring), var(--elevation-2).

Responsive (zero-JS): @media (max-width: 768px) { .shell, .shell[data-collapsed='true'] { grid-template-columns: var(--sidebar-width-collapsed) 1fr } } — below the breakpoint the shell forces the icon rail so <main> gets width without JS. See risks for the label-clip caveat; a real mobile overlay drawer is future JS work.

reduced-motion — a single trailing block naming EVERY animated selector incl. the pseudo-free transitions and the skip-link (pseudo-elements aren't used here, but skipLink transition must be listed explicitly):
@media (prefers-reduced-motion: reduce) { .shell { transition: none } .skipLink { transition: none } }
(No ::before/::after transitions in this component; state-layer pattern is not used since the shell is not an interactive surface.)

## New tokens needed
- NONE — all values map to existing tokens (layout: --sidebar-width / --sidebar-width-collapsed; surfaces/text: --surface, --on-surface, --surface-container-high, --primary-text; shape/space: --space-2/--space-4, --radius-sm; type: --type-label-lg; elevation: --elevation-2; focus: --focus-ring; motion: --motion-base/--motion-fast/--ease-standard).
- Responsive breakpoint is the literal 768px inside a @media condition — it CANNOT be a CSS custom property (media-query conditions can't read var()), and the token linter already exempts @media lines. So no --breakpoint-* token is introduced; if a shared breakpoint scale is ever wanted it belongs in JS/build config, not CSS vars. Flagging for the Phase-4 reviewer.
- No content/topbar gap token needed — the grid areas abut with the existing inset seams already drawn by Topbar (inset bottom border) and Sidebar (inset right border); AppShell adds no gap.

## Acceptance tests
### exactly one main/nav/banner — no duplicated landmarks
```tsx
import { render, screen } from '@testing-library/react'
import { AppShell } from './AppShell'
import { Sidebar, SidebarItem, Topbar } from '../Navigation/Navigation'

test('AppShell가 main만 추가하고 nav/banner는 슬롯에서 온다', () => {
  render(
    <AppShell
      topbar={<Topbar aria-label="앱 바" brand={<span>CREFLE</span>} />}
      sidebar={
        <Sidebar aria-label="주요 탐색" collapsible={false}>
          <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
        </Sidebar>
      }
      mainLabel="본문"
    >
      <p>콘텐츠</p>
    </AppShell>
  )
  // 각 랜드마크가 정확히 하나
  expect(screen.getAllByRole('main')).toHaveLength(1)
  expect(screen.getAllByRole('navigation', { name: '주요 탐색' })).toHaveLength(1)
  expect(screen.getAllByRole('banner')).toHaveLength(1)
  // main은 skip 타깃: tabIndex=-1 + 접근명
  const main = screen.getByRole('main', { name: '본문' })
  expect(main).toHaveAttribute('tabindex', '-1')
  expect(main).toHaveTextContent('콘텐츠')
})
```
### skip 링크가 첫 포커스이고 main id를 가리킨다
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from './AppShell'

test('skip-to-content 링크가 mainId를 정확히 가리키고 첫 탭에서 포커스된다', async () => {
  const user = userEvent.setup()
  render(
    <AppShell mainId="main-content" skipLinkLabel="본문으로 건너뛰기"><p>본문</p></AppShell>
  )
  const link = screen.getByRole('link', { name: '본문으로 건너뛰기' })
  expect(link).toHaveAttribute('href', '#main-content')
  // main의 실제 id와 링크 타깃이 일치
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  // 문서의 첫 탭 정지점 = skip 링크
  await user.tab()
  expect(link).toHaveFocus()
})
```
### controlled collapsed가 data-collapsed를 구동
```tsx
import { render } from '@testing-library/react'
import { AppShell } from './AppShell'

test('collapsed prop이 루트 data-collapsed를 제어한다', () => {
  const { rerender, container } = render(
    <AppShell collapsed={false}><p>x</p></AppShell>
  )
  const root = container.firstElementChild as HTMLElement
  expect(root).toHaveAttribute('data-collapsed', 'false')
  rerender(<AppShell collapsed={true}><p>x</p></AppShell>)
  expect(root).toHaveAttribute('data-collapsed', 'true')
})
```
### useAppShell 토글이 비제어 상태와 onCollapsedChange를 구동
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AppShell, useAppShell } from './AppShell'

function RailToggle() {
  const { collapsed, setCollapsed } = useAppShell()
  return <button onClick={() => setCollapsed(!collapsed)}>토글</button>
}

test('슬롯 내부 커스텀 토글이 접힘을 뒤집고 콜백을 호출한다', async () => {
  const user = userEvent.setup()
  const onCollapsedChange = vi.fn()
  const { container } = render(
    <AppShell defaultCollapsed={false} onCollapsedChange={onCollapsedChange}
      topbar={<RailToggle />}><p>x</p></AppShell>
  )
  const root = container.firstElementChild as HTMLElement
  expect(root).toHaveAttribute('data-collapsed', 'false')
  await user.click(screen.getByRole('button', { name: '토글' }))
  expect(onCollapsedChange).toHaveBeenCalledWith(true)
  // 비제어이므로 내부 상태가 갱신되어 data-collapsed가 뒤집힌다
  expect(root).toHaveAttribute('data-collapsed', 'true')
})
```
### consumer가 이긴다: className/data-*는 루트에 합성, data-collapsed는 컴포넌트 소유로 보존
```tsx
import { render } from '@testing-library/react'
import { AppShell } from './AppShell'

test('rest는 루트에 스프레드되고 data-collapsed는 소비자가 덮지 못한다', () => {
  const { container } = render(
    <AppShell
      className="custom"
      data-testid="shell"
      id="my-shell"
      collapsed={true}
      // 소비자가 강제로 넣어도 컴포넌트 소유 속성이 뒤에 스프레드되어 이긴다
      data-collapsed={false as unknown as boolean}
    >
      <p>x</p>
    </AppShell>
  )
  const root = container.firstElementChild as HTMLElement
  expect(root).toHaveClass('custom')          // cx로 병합 (styles.shell + custom)
  expect(root).toHaveAttribute('data-testid', 'shell')
  expect(root).toHaveAttribute('id', 'my-shell')
  expect(root).toHaveAttribute('data-collapsed', 'true') // 상태가 소비자 값을 덮음
})
```

## Story notes
title 'Components/AppShell'; 카피 한국어, 이름 영어. 각 스토리는 고정 높이 컨테이너(예: height 480, 예: <div style={{height:480}}>)로 감싸 shell의 height:100%가 채우도록 한다.

- Playground: 제어 접힘. 하나의 useState(collapsed)를 AppShell(collapsed/onCollapsedChange)과 sidebar 슬롯의 <Sidebar collapsed onCollapsedChange …>에 함께 배선 → 사이드바 내장 토글이 그리드 컬럼과 라벨 숨김을 동시에 움직이는 정석 사용을 보여준다. topbar=<Topbar brand breadcrumb=<Breadcrumb/> actions=<IconButton 알림/> + <Button 프로필/>>; main엔 제목 + StatCard/문단 더미. 워크스페이스/설정 SidebarSection.
- Collapsed: defaultCollapsed로 아이콘 레일 초기 상태.
- ScrollingMain: main에 긴 더미 콘텐츠(문단 다수) → topbar/sidebar 고정, main만 독립 스크롤됨을 시연.
- SkipLink: 'Tab 키를 누르면 좌상단에 나타납니다' 안내 문단 + shell. 스크린샷용으로 링크 포커스 상태 캡션.
- Responsive: 좁은 컨테이너(예 width 420)로 감싸 @media 레일 강제를 시연(라벨 클립 캐비엇을 스토리 설명에 명시, 실제 모바일 드로어는 future).
- Matrix (id=components-appshell--matrix): [라이트/다크] × [펼침/접힘] 4개 풀 셸을 data-theme 래퍼(Navigation Matrix 패턴)로 배열. 각 셸: Topbar(brand+breadcrumb+actions) + Sidebar(active/badge/disabled 항목 + 섹션 라벨) + main(제목+StatCard). background: var(--surface). 라이트/다크 전수 스크린샷 타깃.

## Render-verify
- 라이트/다크 모두에서 T-레이아웃: Topbar가 상단 전폭, Sidebar가 좌측 256px 트랙, main이 나머지를 채움. 표면 사다리 — sidebar surface-container-low, topbar surface-container, main surface — 가 두 테마에서 위계로 읽힘.
- 접힘 상태(data-collapsed='true'): 좌측 트랙이 72px 레일로 좁아지고 main이 그만큼 넓어짐; 소비자가 Sidebar collapsed를 동기화하면 라벨이 사라지고 아이콘만 남음. 컬럼과 사이드바 폭이 어긋나지 않음(같은 --motion-base 전환).
- 이음새 정렬: Topbar 하단 inset 보더와 Sidebar 우측 inset 보더가 교차점에서 깔끔히 맞물림 — 라이트/다크 각각 --outline-variant 대비 확인, 이중 보더/틈 없음.
- Skip 링크: 평상시 화면 밖(비표시)이며 레이아웃을 밀지 않음. 키보드 포커스 시 좌상단에 surface-container-high 배경 + primary-text 텍스트 + elevation-2 + focus-ring으로 나타나고, 두 테마에서 텍스트 대비 AA 충족.
- 독립 스크롤: main에 긴 콘텐츠가 있을 때 main만 스크롤되고 Topbar/Sidebar는 고정. 가로 스크롤(바디 전체) 발생하지 않음.
- 반응형: 뷰포트 ≤768px에서 사이드바가 아이콘 레일로 강제 전환되고 main이 폭을 확보(라벨 클립은 알려진 zero-JS 한계).
- reduced-motion on: 접힘 시 컬럼/사이드바 폭 변화와 skip 링크 등장이 즉시(전환 없음) 처리됨.

## Risks
사이드바 폭 이중 소스: 그리드 좌측 트랙(AppShell 소유)과 슬롯 <Sidebar>의 자체 width가 둘 다 --sidebar-width(-collapsed)를 쓴다. 값이 동일해 시각적으로 일치하지만, 접힘 동기화는 소비자가 같은 collapsed를 양쪽에 배선해야 성립한다(정석 사용/스토리에서 시연). 미배선 시 트랙만 좁아지고 사이드바 콘텐츠는 overflow:hidden로 클립됨.

Zero-JS 반응형 한계: @media 레일 강제는 트랙만 72px로 줄인다. 슬롯 Sidebar의 라벨 숨김은 React 상태 기반이라 CSS만으로는 못 바꿔, 모바일에서 라벨이 레일 폭으로 클립된다(중간 단어 잘림). 정식 해법(햄버거→오버레이 드로어)은 JS가 필요한 future 작업으로 명시. 대안으로 소비자가 matchMedia로 Sidebar collapsed를 동기화하면 최소 JS로 깔끔한 레일이 된다.

grid-template-columns 트랜지션은 현행 Chrome/FF/Safari에서 동작하나 구형 브라우저는 즉시 리플로우(무해). 의미 전달 애니메이션이 아니므로 reduced-motion에서 none 처리.

useAppShell 컨텍스트는 옵트인 편의 API다. 출하된 Sidebar의 내장 토글은 이 컨텍스트를 소비하지 않으므로, Sidebar 토글로 접으려면 여전히 controlled 배선(collapsed 공유)이 canonical이다. 컨텍스트는 Topbar/본문 등에 놓인 커스텀 토글용.

skip 링크 href는 '#'+mainId. mainId 기본값은 useId(콜론 포함 문자열 가능)인데 getElementById/앵커 매칭은 정확 문자열 비교라 정상 동작한다. 결정성이 필요한 앱(테스트/딥링크)은 mainId를 명시 권장.
