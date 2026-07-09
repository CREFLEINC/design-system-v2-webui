# Phase 3 Component Spec — Navigation — 앱 내비게이션 셸. 한 디렉터리에 4개 컴포넌트 co-locate & export: **Sidebar**(세로 nav, 접힘/펼침), **SidebarItem**(Icon+라벨 nav 항목, active=aria-current), **SidebarSection**(그룹/섹션 라벨), **Topbar**(가로 바: brand/breadcrumb/actions 슬롯). Phase 1~2 패턴(Button 상태레이어·focus-ring, IconButton controlled/uncontrolled, Tabs 키보드 로빙, Card 컴포지션)을 그대로 계승.

- Directory: `src/components/Navigation`
- Reuses: Icon (항목 아이콘, 장식 aria-hidden), IconButton (접힘 토글 — aria-label + aria-expanded), Badge (SidebarItem badge/count 슬롯, 소비자가 주입 + stories에서 사용)

## Exports
```ts
export { Sidebar, SidebarItem, SidebarSection, Topbar } from './components/Navigation/Navigation'
export type { SidebarProps, SidebarItemProps, SidebarSectionProps, TopbarProps } from './components/Navigation/Navigation'
```

## Props interface
```tsx
// ---- Sidebar ----
export interface SidebarProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** nav 랜드마크 접근성 라벨. 페이지에 nav가 둘 이상일 때 필수적으로 권장 */
  'aria-label'?: string
  /** 상단 브랜드/로고 슬롯 (선택). collapsed일 때 소비자가 축약형을 렌더할 수 있게 collapsed도 함께 노출하려면 함수/노드 모두 허용하지 않고 단순 ReactNode로 둔다 */
  header?: ReactNode
  /** 하단 슬롯(사용자/설정 등, 선택) */
  footer?: ReactNode
  /** 접힘 토글(IconButton) 노출 여부. 기본 true */
  collapsible?: boolean
  /** 제어 모드 접힘 상태. 지정 시 내부 상태를 쓰지 않는다 (IconButton pressed 패턴) */
  collapsed?: boolean
  /** 비제어 초기 접힘 상태. 기본 false */
  defaultCollapsed?: boolean
  /** 접힘이 바뀌려 할 때 호출 (제어/비제어 공통) */
  onCollapsedChange?: (collapsed: boolean) => void
  /** SidebarItem / SidebarSection 들 */
  children: ReactNode
}

// ---- SidebarItem ----
export interface SidebarItemProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  /** Material Symbols 아이콘 이름(리가처). 예: 'dashboard'. 장식(aria-hidden) — 접근명은 라벨에서 온다 */
  icon: string
  /** 항목 라벨(가시 텍스트). collapsed에서도 접근명 보존 위해 visually-hidden 처리(display:none 아님) */
  children: ReactNode
  /** SPA 링크 href. 있으면 <a>, 없으면 <button type=button> 로 렌더 */
  href?: string
  /** 현재 페이지면 true → aria-current="page" + active 스타일(--primary-container) */
  active?: boolean
  /** 비활성 — tabIndex=-1, aria-disabled, 클릭/화살표 이동에서 제외 */
  disabled?: boolean
  /** 후행 배지/카운트(선택). 보통 <Badge>3</Badge>. collapsed에선 코너 dot로 축약 */
  badge?: ReactNode
}

// ---- SidebarSection ----
export interface SidebarSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** 섹션 라벨 텍스트. role="group"의 aria-label로도 쓰여 collapsed에서도 SR에 보존 */
  label: string
  children: ReactNode
}

// ---- Topbar ----
export interface TopbarProps extends HTMLAttributes<HTMLElement> {
  /** 좌측 브랜드/로고 슬롯 */
  brand?: ReactNode
  /** 좌중앙 브레드크럼 슬롯 — 제공 시 <nav aria-label="브레드크럼">로 래핑 */
  breadcrumb?: ReactNode
  /** 우측 액션/사용자 슬롯 */
  actions?: ReactNode
  /** banner 랜드마크 라벨(선택) */
  'aria-label'?: string
}
```

## Variants & API
컴포지션 모델(Card/CardHeader 계열). items 배열이 아니라 children으로 조립:

  <Sidebar aria-label="주요 탐색" header={<Brand/>} defaultCollapsed={false} onCollapsedChange={...}>
    <SidebarSection label="워크스페이스">
      <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
      <SidebarItem icon="inbox" href="/inbox" badge={<Badge>3</Badge>}>받은함</SidebarItem>
      <SidebarItem icon="lock" href="/admin" disabled>관리(권한 없음)</SidebarItem>
    </SidebarSection>
  </Sidebar>

- **접힘 상태**: Sidebar가 SidebarContext={{collapsed}}를 제공. IconButton 컨트롤드/언컨트롤드 패턴 그대로(collapsed / defaultCollapsed / onCollapsedChange). 루트에 data-collapsed로 CSS 훅. width는 --sidebar-width ↔ --sidebar-width-collapsed 사이 transition.
- **접힘 토글**: collapsible일 때 IconButton(icon 'menu_open' ↔ 'menu', aria-label '사이드바 접기'/'사이드바 펼치기'), aria-expanded={!collapsed}, aria-controls=항목 리스트 id.
- **SidebarItem 엘리먼트 선택**: href 있으면 <a>, 없으면 <button type="button">. active→aria-current="page". badge는 기존 Badge 컴포넌트 재사용(소비자가 넘김). collapsed에서 라벨 span은 visually-hidden(clip)으로 접근명 보존, 아이콘만 중앙.
- **SidebarSection**: <div role="group" aria-label={label}> + 가시 라벨 <div aria-hidden>(--type-label-sm, --on-surface-muted). collapsed에선 텍스트 라벨 숨김(구분 여백만).
- **Topbar**: <header className> flex-row — brand(좌) · breadcrumb(<nav aria-label="브레드크럼">) · flex spacer · actions(우). 배경 --surface-container, 하단 1px --outline-variant. 높이 --space-10(64px, 재사용).
- **키보드**: Sidebar nav의 onKeyDown이 ArrowDown/Up/Home/End로 `[data-sidebar-item]:not([aria-disabled="true"])` 사이 포커스 이동(Tabs.moveTo 로직 축소판, preventDefault). Enter/Space는 링크/버튼 네이티브. 각 항목은 자연 Tab stop(nav 랜드마크는 링크 다중 tab stop이 표준 — 화살표는 부가 편의). disabled는 tabIndex=-1로 Tab/화살표 모두 제외.

## Accessibility
- Sidebar 루트 = 네이티브 <nav>(role navigation 암시) + aria-label. 항목 리스트는 <ul>/<li> 없이 flex 컨테이너로 두되 항목은 링크/버튼(랜드마크 내 링크 목록은 role=list 불필요).
- SidebarItem: active→aria-current="page"(a/button 모두 유효). disabled→aria-disabled="true"+tabIndex=-1, onClick에서 e.preventDefault(). 아이콘은 <Icon>(label 없음→aria-hidden), 접근명은 라벨 텍스트에서만.
- collapsed 접근명 보존: 라벨을 display:none이 아닌 visually-hidden(position/clip)으로 처리 → getByRole('link',{name}) 이 두 상태 모두에서 성립.
- SidebarSection: role="group" + aria-label로 항목과 섹션명을 연결(가시 라벨은 aria-hidden 중복 방지).
- 접힘 토글: IconButton(aria-label 필수 충족), aria-expanded + aria-controls.
- Topbar: <header>(top-level 시 banner 랜드마크). breadcrumb 슬롯은 <nav aria-label="브레드크럼">로 래핑해 별도 랜드마크화. actions는 소비자 노드 그대로.
- 키보드: ArrowUp/Down/Home/End 로빙(disabled skip) + 네이티브 Tab/Enter. focus-visible → var(--focus-ring)(항목·토글 공통).
- WCAG AA: active 라벨 --on-primary-container(8.1:1 light/10.3:1 dark), 비활성 라벨 --on-surface-variant. 아이콘/2px 인디케이터는 --primary-text(≥3:1 UI 요건 충족).

## CSS notes
토큰 전용, px는 0/1/2만.
- **폭**: .sidebar { width: var(--sidebar-width); } .sidebar[data-collapsed="true"] { width: var(--sidebar-width-collapsed); } transition: width var(--motion-base) var(--ease-standard). 두 폭은 신규 토큰(아래) — px 리터럴 금지 규칙 때문에 반드시 토큰화.
- **배경**: Sidebar --surface-container-low, 우측 1px border --outline-variant. Topbar --surface-container, 하단 1px --outline-variant. (프롬프트 "both use surface-container tokens" 충족.)
- **항목 상태레이어(M3 ::before 레시피)**: .item { position:relative; isolation:isolate } .item::before{content:'';position:absolute;inset:0;border-radius:inherit;background:transparent;transition:background var(--motion-fast) var(--ease-standard);pointer-events:none}. 비활성(중립 표면)→ hover --state-hover-neutral / active --state-press-neutral. active 항목(primary-container tonal 표면)→ hover --state-hover / active --state-press(레드 틴트) — Button.tonal과 동일 규칙.
- **active 항목**: background var(--primary-container); 라벨 color var(--on-primary-container)[AA 안전]; 아이콘 color var(--primary-text); 좌측 2px 인디케이터 = box-shadow inset 2px 0 0 var(--primary-text) 또는 ::after 폭 2px. border-radius --radius-md. ※ 프롬프트의 "--primary-container / --primary-text"를 따르되, light에서 primary-text on primary-container=4.30:1(AA<4.5) 이므로 라벨 텍스트만 --on-primary-container로 승격(컨벤션 "container 위 텍스트→on-*-container" 준수), primary-text는 아이콘+인디케이터(≥3:1)로 한정.
- **비활성 항목**: 라벨 --on-surface-variant, 아이콘 --on-surface-variant. 높이 --control-height-lg(48px), gap --space-3, 좌우 padding --space-3. collapsed: justify-content center, 라벨 visually-hidden(position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)), 아이콘만.
- **섹션 라벨**: font var(--type-label-sm); letter-spacing var(--type-label-sm-tracking); color var(--on-surface-muted); padding --space-2 --space-3. collapsed에서 opacity/높이 축소 또는 숨김.
- **badge**: 확장 시 후행 inline(margin-left auto). collapsed 시 코너 dot로 축약(절대배치, 장식). Badge 컴포넌트 자체 색은 그대로.
- **focus-ring**: .item:focus-visible, 토글은 IconButton 자체 처리. outline:none + box-shadow var(--focus-ring).
- **Topbar**: display:flex; align-items:center; gap --space-4; height var(--space-10); padding 0 --space-4. brand 다음 breadcrumb, 그 뒤 flex:1 spacer, actions 우측 gap --space-2.
- **reduced-motion(파일 맨 아래 단일 블록, ::before 명시)**: @media (prefers-reduced-motion: reduce){ .sidebar{transition:none} .item, .item::before{transition:none} } — width/상태레이어 트랜지션 무력화, 의미 애니메이션 없음.

## New tokens needed
- --sidebar-width: 256px / 256px (테마 무관 레이아웃 값) — 펼친 사이드바 폭. M3 nav drawer(256–360) 계열. .module.css가 px 0/1/2만 허용하므로 폭은 반드시 토큰이어야 함(lint가 존재 강제). styles/web-tokens.css :root에 추가.
- --sidebar-width-collapsed: 72px / 72px (테마 무관 레이아웃 값) — 접힌 레일 폭(아이콘 전용). M3 nav rail(72–80) 계열. 48px 아이콘 항목 + 좌우 --space-3 패딩 수용. web-tokens.css :root에 추가.

## Acceptance tests
### nav 랜드마크와 항목을 렌더하고 active 항목에 aria-current=page를 준다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar, SidebarItem, SidebarSection, Topbar } from './Navigation'

test('nav 랜드마크 + active 항목 aria-current', () => {
  render(
    <Sidebar aria-label="주요 탐색">
      <SidebarItem icon="dashboard" href="/dash" active>대시보드</SidebarItem>
      <SidebarItem icon="inbox" href="/inbox">받은함</SidebarItem>
    </Sidebar>
  )
  expect(screen.getByRole('navigation', { name: '주요 탐색' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '대시보드' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: '받은함' })).not.toHaveAttribute('aria-current')
})
```
### 비제어 접힘 토글 — data/aria-expanded 반전, 접힌 뒤에도 접근명 보존
```tsx
test('비제어 접힘 토글 + 접근명 보존', async () => {
  const user = userEvent.setup()
  render(
    <Sidebar aria-label="탐색" defaultCollapsed={false}>
      <SidebarItem icon="dashboard" href="/d">대시보드</SidebarItem>
    </Sidebar>
  )
  const toggle = screen.getByRole('button', { name: /접기|펼치기/ })
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument()
  await user.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  // collapsed: 라벨은 visually-hidden(clip)이라 접근명은 그대로 조회된다
  expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument()
})
```
### 제어 접힘 — onCollapsedChange만 알리고 스스로 바뀌지 않는다
```tsx
test('제어 접힘', async () => {
  const user = userEvent.setup()
  const onCollapsedChange = vi.fn()
  render(
    <Sidebar aria-label="탐색" collapsed={false} onCollapsedChange={onCollapsedChange}>
      <SidebarItem icon="dashboard" href="/d">대시보드</SidebarItem>
    </Sidebar>
  )
  const toggle = screen.getByRole('button', { name: /접기|펼치기/ })
  await user.click(toggle)
  expect(onCollapsedChange).toHaveBeenCalledWith(true)
  // 부모가 collapsed를 갱신하지 않았으므로 여전히 펼침 상태
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
})
```
### 화살표/Home/End로 항목 포커스 이동, disabled는 건너뛴다
```tsx
test('화살표 로빙 + disabled skip', async () => {
  const user = userEvent.setup()
  render(
    <Sidebar aria-label="탐색">
      <SidebarItem icon="a" href="/a">가</SidebarItem>
      <SidebarItem icon="b" href="/b" disabled>나</SidebarItem>
      <SidebarItem icon="c" href="/c">다</SidebarItem>
    </Sidebar>
  )
  const first = screen.getByRole('link', { name: '가' })
  first.focus()
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('link', { name: '다' })).toHaveFocus() // 나(disabled) 건너뜀
  await user.keyboard('{ArrowUp}')
  expect(first).toHaveFocus()
  await user.keyboard('{End}')
  expect(screen.getByRole('link', { name: '다' })).toHaveFocus()
  await user.keyboard('{Home}')
  expect(first).toHaveFocus()
})
```
### disabled 항목 — aria-disabled/tabindex=-1, 클릭 시 onClick 미호출
```tsx
test('disabled 항목 클릭 차단', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(
    <Sidebar aria-label="탐색">
      <SidebarItem icon="a" href="/a" disabled onClick={onClick}>가</SidebarItem>
    </Sidebar>
  )
  const link = screen.getByRole('link', { name: '가' })
  expect(link).toHaveAttribute('aria-disabled', 'true')
  expect(link).toHaveAttribute('tabindex', '-1')
  await user.click(link)
  expect(onClick).not.toHaveBeenCalled()
})
```
### 활성 항목은 소비자 onClick을 합성 호출한다 (rest-spread 규칙)
```tsx
test('소비자 onClick 합성', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(
    <Sidebar aria-label="탐색">
      <SidebarItem icon="a" href="#" onClick={onClick}>가</SidebarItem>
    </Sidebar>
  )
  await user.click(screen.getByRole('link', { name: '가' }))
  expect(onClick).toHaveBeenCalledTimes(1)
})
```
### SidebarSection이 role=group + aria-label로 항목을 묶는다
```tsx
test('섹션 그룹핑', () => {
  render(
    <Sidebar aria-label="탐색">
      <SidebarSection label="관리">
        <SidebarItem icon="a" href="/a">가</SidebarItem>
      </SidebarSection>
    </Sidebar>
  )
  const group = screen.getByRole('group', { name: '관리' })
  expect(within(group).getByRole('link', { name: '가' })).toBeInTheDocument()
})
```
### Topbar가 brand/breadcrumb(nav 랜드마크)/actions 슬롯을 배치한다
```tsx
test('Topbar 슬롯', () => {
  render(
    <Topbar
      aria-label="앱 바"
      brand={<span>CREFLE</span>}
      breadcrumb={<a href="/">홈</a>}
      actions={<button>프로필</button>}
    />
  )
  expect(screen.getByText('CREFLE')).toBeInTheDocument()
  const bc = screen.getByRole('navigation', { name: '브레드크럼' })
  expect(within(bc).getByRole('link', { name: '홈' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '프로필' })).toBeInTheDocument()
})
```

## Story notes
title 'Components/Navigation'. 카피 한국어, 이름 영어. 스토리: (1) SidebarPlayground — header 브랜드 + 2개 섹션(워크스페이스/설정), active 항목, badge(<Badge>3</Badge>), footer 사용자 슬롯. (2) Collapsed — defaultCollapsed로 아이콘 레일. (3) ControlledCollapse — useState로 접힘 제어 + 상태 표기. (4) TopbarPlayground — brand(로고 텍스트) + breadcrumb(홈/프로젝트/상세 링크) + actions(IconButton 알림 + 프로필 Button). (5) AppShell — Topbar + Sidebar 조합(실사용 셸 미리보기, 우측에 더미 본문). (6) **Matrix** (id=components-navigation--matrix): 좌우 그리드에 [펼침 + 접힘] × [기본/active/badge/disabled 항목]과 섹션 라벨을 전수 배열, 하단에 Topbar 1행. 라이트/다크 스크린샷 타깃. 각 스토리 render 컨테이너는 height 지정(예: 360px)해 사이드바 세로 채움을 보이게 한다. 다크는 story 데코레이터의 data-theme='dark' 컨테이너로 확인.

## Render-verify
- 펼침 사이드바: 아이콘+라벨 항목, active 항목이 --primary-container 소프트 레드 pill + 좌측 2px --primary-text 인디케이터 + 라벨(--on-primary-container)로 명확히 읽힘(라이트/다크 모두 AA).
- 접힘 사이드바: 폭이 --sidebar-width-collapsed로 줄고 라벨 사라지고 아이콘만 중앙 정렬, 토글 아이콘 menu_open↔menu 반전, active 인디케이터 유지.
- 섹션 라벨이 --on-surface-muted 소형 캡션으로 보이고, 접힘 시 숨김/여백만 남음.
- badge(<Badge>3</Badge>)가 펼침에서 항목 후행에, 접힘에서 코너 dot로 축약.
- 비활성 항목 hover 시 중립 상태레이어(--state-hover-neutral), active 항목 hover 시 레드 틴트(--state-hover) — 배경 자체는 안 바뀜.
- Topbar: 좌측 brand, 그 옆 breadcrumb, 우측 actions, 하단 1px --outline-variant, 배경 --surface-container. 라이트/다크 표면 사다리 위계 유지.
- 항목·토글 keyboard focus 시 --focus-ring(2px surface + 2px primary) 이중 링 보임.
- 다크: active 라벨/아이콘 대비 충분(#E8878B 아이콘 / --on-primary-container 라벨), 순수 검정 없음.
- reduced-motion: 접힘 width 전환이 점프(트랜지션 제거)로 처리되고 잔여 애니메이션 없음.

## Risks
1) 프롬프트가 지정한 active "--primary-container / --primary-text" 중, light에서 primary-text on primary-container=4.30:1로 AA(4.5) 미달 → 라벨 텍스트만 --on-primary-container로 승격(컨벤션 준수), primary-text는 아이콘+2px 인디케이터(UI 3:1 충족)로 한정. 신규 텍스트 토큰 불필요. 2) 신규 레이아웃 토큰 2개(--sidebar-width, --sidebar-width-collapsed)를 web-tokens.css에 추가하지 않으면 lint:tokens 실패 — 구현 전 선행 필요. 3) 키보드는 '다중 Tab stop(nav 표준) + 화살표 부가'를 채택(Tabs식 단일 roving tabindex 아님) — nav 랜드마크 관례상 적절하나, 단일 tab stop을 원하면 SidebarContext 등록 기반 roving으로 승급 가능. 4) SidebarItem은 href 유무로 <a>/<button>을 바꾸므로 소비자 라우터 통합 시 href 기반 사용을 권장(문서화). 5) collapsed 라벨은 display:none이 아닌 visually-hidden이어야 접근명 보존 — 구현 시 clip 규칙 준수 필수.
