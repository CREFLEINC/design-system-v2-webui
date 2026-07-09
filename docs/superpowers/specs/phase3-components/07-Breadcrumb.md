# Phase 3 Component Spec — Breadcrumb

- Directory: `src/components/Breadcrumb`
- Reuses: Icon (구분자 chevron + 생략 more_horiz 아이콘)

## Exports
```ts
export { Breadcrumb } from './components/Breadcrumb/Breadcrumb'
export type { BreadcrumbProps, BreadcrumbItem } from './components/Breadcrumb/Breadcrumb'
```

## Props interface
```tsx
import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react'

export interface BreadcrumbItem {
  /** 표시 라벨 */
  label: ReactNode
  /** 링크 대상. 생략 시 링크가 아닌 텍스트로 렌더. 배열의 마지막 항목은 href가 있어도 현재 위치(비링크)로 렌더된다 */
  href?: string
}

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  /** 경로 항목. 배열 순서 = 계층 순서. 마지막 항목은 항상 현재 페이지(aria-current="page", 비링크) */
  items: BreadcrumbItem[]
  /**
   * 항목 수가 이 값을 초과하면 가운데를 접어 "첫 항목 + … + 마지막 2개"로 축약한다.
   * 미지정(또는 <= 3, 또는 items.length 이상)이면 접지 않는다. 축약이 의미 있으려면 4 이상 권장.
   */
  maxItems?: number
  /** 구분자 Material Symbols 아이콘 이름. 기본 'chevron_right' */
  separatorIcon?: string
  /** 생략(…) 트리거 접근 라벨. 기본 '생략된 경로 펼치기' */
  expandLabel?: string
  /** nav 접근성 라벨. 기본 '탐색 경로' */
  'aria-label'?: string
}

// forwardRef 대상 = <nav> (HTMLElement). ...rest는 nav에 마지막 스프레드(consumer wins).
// aria-label은 destructure 기본값으로 흡수 후 명시 지정하므로 소비자 override가 자연히 이긴다.
// role/aria가 소비자를 이겨야 하는 커스텀 위젯이 아니라(네이티브 nav/a 시맨틱) 기본 "consumer wins" 규칙 적용.
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  { items, maxItems, separatorIcon = 'chevron_right', expandLabel = '생략된 경로 펼치기',
    'aria-label': ariaLabel = '탐색 경로', className, ...rest },
  ref
) { /* … 본문은 variantsAndApi 참조 … */ })
```

## Variants & API
시각 variant/size 없음 — 단일 형태의 내비게이션 경로. 상태(controlled/uncontrolled) 개념도 없음; 유일한 내부 상태는 생략 확장 여부다.

렌더 구조:
- 루트 <nav ref aria-label className {...rest}> → <ol class=list> → 항목마다 <li class=item>.
- 각 항목 노드 앞(idx>0)에는 구분자 <span class=separator data-crefle-separator aria-hidden="true"><Icon name={separatorIcon} size={18} /></span>.
- 항목 렌더 규칙:
  - isCurrent(= 전체 items의 마지막 항목)  → <span class="item현재" aria-current="page"> (링크 아님). 마지막은 href가 있어도 링크로 만들지 않는다.
  - href 있음 & 비현재      → <a class=link href={href}>{label}</a>.
  - href 없음 & 비현재      → <span class=link data-static> (비링크 텍스트).

오버플로 축약 — 결정: "첫 항목 + … + 마지막 2개", 생략 기호는 인라인 확장 버튼(디스클로저).
- shouldCollapse = maxItems != null && items.length > maxItems && items.length > 3 (숨길 항목이 최소 1개일 때만). 이때 hidden = items.slice(1, -2).
- 접힘 표시 노드: [items[0], {ellipsis}, items[len-2], items[len-1](current)]. 사이사이 구분자가 들어가 "홈 › … › CX-500 › 사양" 형태.
- ellipsis 노드 = <li><button type="button" class=ellipsis aria-label={expandLabel} aria-expanded={false} onClick={()=>setExpanded(true)}><Icon name="more_horiz" size={18} /></button></li>. 아이콘은 장식(aria-hidden 기본), 버튼의 접근 이름은 aria-label로 제공.
- 확장 정당화: 플로팅 팝오버 메뉴는 위치계산 + 포커스 트랩(Dialog급 기계장치)이 필요해 "keep simple" + 런타임 의존성 0 원칙과 충돌한다. 인라인 확장은 (a) 추가 의존성 없음, (b) 모든 링크가 단일 선형 탭 순서에 유지, (c) 클릭·Enter·Space로 조작되는 네이티브 <button> 하나로 접근성 완결, (d) 테스트가 관찰 가능. 따라서 …를 "비인터랙티브 문자"가 아니라 "인라인 디스클로저 트리거"로 구현한다. 한 번 펼치면 접는 UI는 두지 않는다(경로 탐색 UX상 재접힘 니즈가 낮음 → 단순 유지).

data-crefle-separator 속성은 테스트가 구분자 개수/aria-hidden을 안정적으로 조회하기 위한 훅.

라우터 링크 통합(next/link 등)은 이번 스펙 범위 밖 — risks 참조.

## Accessibility
- APG Breadcrumb 패턴: <nav aria-label> 래핑 + <ol>/<li> 리스트. 스크린리더가 "탐색, 목록 N개 항목"으로 읽는다.
- 현재 위치: 마지막 항목에 aria-current="page", 링크가 아닌 <span>으로 렌더(현재 페이지로의 링크는 혼란 유발 → 비링크가 정석).
- 구분자: 순수 장식. <span data-crefle-separator aria-hidden="true"> 안의 Icon도 label 미지정이라 aria-hidden(Icon 기본 동작) → a11y 트리에서 완전히 제외.
- 생략 트리거: 네이티브 <button type="button">, 접근 이름 aria-label(expandLabel), aria-expanded로 상태 노출. 아이콘 전용 버튼이므로 IconButton과 동일하게 보이는 텍스트 없이 aria-label 필수(more_horiz 아이콘은 장식).
- 키보드: 링크·생략 버튼 모두 네이티브 포커서블 → Tab 선형 이동, Enter(링크·버튼)·Space(버튼)로 작동. 별도 로빙/화살표 로직 불필요(tablist 아님).
- 포커스 링: .link:focus-visible / .ellipsis:focus-visible → box-shadow: var(--focus-ring), outline:none. border-radius: var(--radius-sm)로 링이 라벨을 감싸도록.
- 대비(WCAG AA): 링크 var(--on-surface-variant)(#2D2C33 light / #C4C6CC dark), 현재 var(--on-surface)(최고 대비), 구분자 var(--on-surface-muted). 호버 시 링크는 var(--primary-text)로 전환(레드 텍스트 → primary-text 규칙; 다크에서 밝은 톤으로 스왑되어 AA 안전).

## CSS notes
클래스: .root(nav), .list(ol), .item(li), .link(a/정적 span), .current(현재 span), .separator(구분자 span), .ellipsis(button).

- .root: font: var(--type-body-sm); color: var(--on-surface-muted).
- .list: display:flex; flex-wrap:wrap; align-items:center; gap: var(--space-1); list-style:none; margin:0; padding:0. (긴 경로 줄바꿈 허용; 페이지 가로 스크롤 금지)
- .item: display:inline-flex; align-items:center; gap: var(--space-1).
- .separator: display:inline-flex; color: var(--on-surface-muted); (Icon size는 JS prop=18이라 CSS px 아님).
- .link: color: var(--on-surface-variant); text-decoration:none; border-radius: var(--radius-sm); outline:none; transition: color var(--motion-fast) var(--ease-standard). a.link만 cursor:pointer(정적 span은 기본). .link[href]:hover(또는 a.link:hover) { color: var(--primary-text); text-decoration:underline }.
- .link:focus-visible { box-shadow: var(--focus-ring) } (정적 span은 tabindex 없어 포커스 안 됨).
- .current: color: var(--on-surface); (비링크, 커서 기본). 시각적 강조는 색 대비로만 — 굵기 변경 불필요.
- .ellipsis: 상태레이어 recipe 적용 — position:relative; isolation:isolate; display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; color: var(--on-surface-variant); cursor:pointer; outline:none; border-radius: var(--radius-sm); padding:0; height는 아이콘에 맞춤(1em 기반, px 없이). .ellipsis::before { content:''; position:absolute; inset:0; border-radius:inherit; background:transparent; transition: background var(--motion-fast) var(--ease-standard); pointer-events:none } / .ellipsis:hover::before { background: var(--state-hover-neutral) } / .ellipsis:active::before { background: var(--state-press-neutral) } (중립 표면 → neutral 상태토큰). .ellipsis:hover { color: var(--primary-text) }. .ellipsis:focus-visible { box-shadow: var(--focus-ring) }.

토큰만 사용, raw 색상 없음, px는 0만. 모든 var(--x) 존재 확인: type-body-sm, on-surface, on-surface-variant, on-surface-muted, primary-text, space-1, radius-sm, focus-ring, motion-fast, ease-standard, state-hover-neutral, state-press-neutral — 전부 존재.

reduced-motion(파일 맨 아래, ::before 유사요소 명시 나열):
@media (prefers-reduced-motion: reduce) { .link, .ellipsis, .ellipsis::before { transition: none } }

## New tokens needed
- none

## Acceptance tests
### nav[aria-label]과 ordered list로 렌더하고 마지막 항목만 현재 위치(비링크, aria-current=page)로 표시한다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const items: BreadcrumbItem[] = [
  { label: '홈', href: '/' },
  { label: '제품', href: '/products' },
  { label: '센서', href: '/products/sensors' },
  { label: 'CX-500', href: '/products/sensors/cx-500' },
  { label: '사양' }
]

test('nav[aria-label]과 ordered list로 렌더하고 마지막 항목만 현재 위치(비링크)로 표시한다', () => {
  const { container } = render(<Breadcrumb items={items} />)
  const nav = screen.getByRole('navigation', { name: '탐색 경로' })
  expect(nav).toBeInTheDocument()
  expect(container.querySelector('ol')).toBeTruthy()
  const current = screen.getByText('사양')
  expect(current).toHaveAttribute('aria-current', 'page')
  expect(current.closest('a')).toBeNull()
  expect(screen.queryByRole('link', { name: '사양' })).toBeNull()
})
```
### 현재가 아닌 href 항목은 href를 가진 링크로 렌더된다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const items: BreadcrumbItem[] = [
  { label: '홈', href: '/' },
  { label: '제품', href: '/products' },
  { label: '센서', href: '/products/sensors' },
  { label: 'CX-500', href: '/products/sensors/cx-500' },
  { label: '사양' }
]

test('현재가 아닌 href 항목은 href를 가진 링크로 렌더된다', () => {
  render(<Breadcrumb items={items} />)
  expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: '제품' })).toHaveAttribute('href', '/products')
  // 4개 링크(마지막 현재 항목 제외)
  expect(screen.getAllByRole('link')).toHaveLength(4)
})
```
### 구분자 아이콘은 항목 사이에만 있고 aria-hidden이다
```tsx
import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const items: BreadcrumbItem[] = [
  { label: '홈', href: '/' },
  { label: '제품', href: '/products' },
  { label: '센서', href: '/products/sensors' },
  { label: 'CX-500', href: '/products/sensors/cx-500' },
  { label: '사양' }
]

test('구분자는 항목 사이(N-1개)에만 있고 aria-hidden이다', () => {
  const { container } = render(<Breadcrumb items={items} />)
  const seps = container.querySelectorAll('[data-crefle-separator]')
  expect(seps).toHaveLength(items.length - 1)
  seps.forEach((s) => expect(s).toHaveAttribute('aria-hidden', 'true'))
})
```
### maxItems를 초과하면 가운데를 접어 첫 항목 + … + 마지막 2개만 노출한다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const items: BreadcrumbItem[] = [
  { label: '홈', href: '/' },
  { label: '제품', href: '/products' },
  { label: '센서', href: '/products/sensors' },
  { label: 'CX-500', href: '/products/sensors/cx-500' },
  { label: '사양' }
]

test('maxItems 초과 시 첫 항목 + … + 마지막 2개로 축약한다', () => {
  render(<Breadcrumb items={items} maxItems={3} />)
  // 노출: 홈, (…), CX-500, 사양
  expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'CX-500' })).toBeInTheDocument()
  expect(screen.getByText('사양')).toHaveAttribute('aria-current', 'page')
  // 숨김: 제품, 센서
  expect(screen.queryByRole('link', { name: '제품' })).toBeNull()
  expect(screen.queryByRole('link', { name: '센서' })).toBeNull()
  // 생략 트리거
  const trigger = screen.getByRole('button', { name: '생략된 경로 펼치기' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
})
```
### 생략 버튼을 누르면 전체 경로가 인라인으로 펼쳐진다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const items: BreadcrumbItem[] = [
  { label: '홈', href: '/' },
  { label: '제품', href: '/products' },
  { label: '센서', href: '/products/sensors' },
  { label: 'CX-500', href: '/products/sensors/cx-500' },
  { label: '사양' }
]

test('생략 버튼 클릭 시 숨은 항목이 모두 펼쳐지고 트리거가 사라진다', async () => {
  render(<Breadcrumb items={items} maxItems={3} />)
  await userEvent.click(screen.getByRole('button', { name: '생략된 경로 펼치기' }))
  expect(screen.getByRole('link', { name: '제품' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '센서' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '생략된 경로 펼치기' })).toBeNull()
  expect(screen.getAllByRole('link')).toHaveLength(4)
})
```
### 생략 버튼은 키보드로 포커스·확장할 수 있다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const items: BreadcrumbItem[] = [
  { label: '홈', href: '/' },
  { label: '제품', href: '/products' },
  { label: '센서', href: '/products/sensors' },
  { label: 'CX-500', href: '/products/sensors/cx-500' },
  { label: '사양' }
]

test('Tab으로 생략 버튼에 도달하고 Enter로 확장한다', async () => {
  render(<Breadcrumb items={items} maxItems={3} />)
  await userEvent.tab()
  expect(screen.getByRole('link', { name: '홈' })).toHaveFocus()
  await userEvent.tab()
  const trigger = screen.getByRole('button', { name: '생략된 경로 펼치기' })
  expect(trigger).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  expect(screen.getByRole('link', { name: '센서' })).toBeInTheDocument()
})
```
### aria-label을 덮어쓸 수 있고 소비자 props가 nav로 전달된다 (consumer wins)
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const items: BreadcrumbItem[] = [
  { label: '홈', href: '/' },
  { label: '문서', href: '/docs' },
  { label: '가이드' }
]

test('aria-label override + rest props가 nav로 전달된다', () => {
  render(<Breadcrumb items={items} aria-label="문서 경로" data-testid="bc" />)
  const nav = screen.getByRole('navigation', { name: '문서 경로' })
  expect(nav).toHaveAttribute('data-testid', 'bc')
})
```
### href 없는 중간 항목은 링크가 아닌 텍스트로 렌더된다
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const items: BreadcrumbItem[] = [
  { label: '홈', href: '/' },
  { label: '분류' }, // href 없음, 비현재 → 정적 텍스트
  { label: '항목', href: '/x' },
  { label: '상세' } // 현재
]

test('href 없는 비현재 항목은 링크가 아니다', () => {
  render(<Breadcrumb items={items} />)
  expect(screen.queryByRole('link', { name: '분류' })).toBeNull()
  expect(screen.getByText('분류')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '항목' })).toHaveAttribute('href', '/x')
})
```

## Story notes
title: 'Components/Breadcrumb', component: Breadcrumb. 스토리 카피 한국어, 이름 영어.
공통 items 예: [{label:'홈',href:'/'},{label:'제품',href:'/products'},{label:'센서',href:'/products/sensors'},{label:'CX-500',href:'/products/sensors/cx-500'},{label:'사양'}].
- Playground: 기본 전체 경로(축약 없음).
- Collapsed: maxItems={3} → "홈 › … › CX-500 › 사양", 생략 버튼 클릭 시 인라인 확장. 설명 문구로 동작 안내.
- CustomSeparator: separatorIcon="chevron_right" 대신 "arrow_forward_ios" 등 대체 예시(구분자 커스터마이즈).
- Matrix (id: components-breadcrumb--matrix): 라이트/다크 전수 검증 타깃. display:grid, gap:24. 행: (1) 짧은 경로 2항목, (2) 전체 5항목, (3) 축약 maxItems={3}, (4) href 없는 중간 정적 항목 포함 경로. 각 행에 <strong> 캡션. 링크 기본/호버(스크린샷은 기본), 현재 항목, 구분자, 생략 버튼이 한 화면에 모두 보이도록 배치.

## Render-verify
- 라이트/다크 모두에서 Matrix(components-breadcrumb--matrix) 캡처
- 링크 텍스트 = on-surface-variant, 현재 항목 = on-surface(가장 진함), 구분자 chevron = on-surface-muted로 3단 명도 위계가 보인다
- 구분자 chevron이 항목 사이에만 있고 첫 항목 앞·마지막 뒤에는 없다
- 축약 행에서 '홈 › … › CX-500 › 사양' 형태로 …(more_horiz) 버튼이 노출된다
- 다크에서 링크/현재/구분자/생략 아이콘 모두 배경 대비 AA 이상으로 읽힌다(순수 검정 배경 아님, surface #1B1D21)
- 긴 경로가 컨테이너를 넘으면 가로 스크롤 없이 줄바꿈(flex-wrap)된다
- 포커스 상태 캡처 시 링크/생략 버튼에 focus-ring(2px surface gap + 2px primary)이 라벨을 감싼다

## Risks
라우터 통합: 현재 스펙은 항목을 네이티브 <a href>로 렌더한다. next/link·react-router와 쓰려면 클라이언트 내비게이션이 아닌 풀 페이지 이동이 된다. 향후 renderLink?: (item, {className, children}) => ReactNode 훅을 추가해 소비자가 <Link>로 감싸게 하는 확장이 필요할 수 있음(이번엔 keep-simple로 제외). / 축약은 한 번 펼치면 다시 접히지 않는다(단순화 결정) — 반복 접힘이 필요하면 후속 확장. / maxItems가 3 이하이거나 items.length 이하이면 축약하지 않는 가드가 있어, 소비자가 너무 작은 maxItems를 줘도 최소 '첫+…+마지막2'(4슬롯)는 보인다는 점을 문서화 필요. / label이 매우 길면 개별 항목 말줄임(text-overflow)이 없어 줄바꿈만 됨 — 필요 시 max-width + ellipsis 토큰화는 후속 과제.
