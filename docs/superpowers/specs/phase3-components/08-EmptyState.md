# Phase 3 Component Spec — EmptyState

- Directory: `src/components/EmptyState`
- Reuses: Button (action/secondaryAction 슬롯으로 컴포즈 — 스토리·테스트에서 import), Icon (icon 슬롯으로 컴포즈 — 스토리·테스트에서 import; EmptyState 자체는 슬롯 노드만 렌더)

## Exports
```ts
export { EmptyState } from './components/EmptyState/EmptyState'
export type { EmptyStateProps, EmptyStateSize } from './components/EmptyState/EmptyState'
```

## Props interface
```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export type EmptyStateSize = 'sm' | 'md' | 'lg'

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** sm = 인라인(카드/패널 내부), md = 기본, lg = 전체 페이지 플레이스홀더 */
  size?: EmptyStateSize
  /** 선행 아이콘(대형·뮤트). 보통 <Icon name="inbox" size={…} /> 또는 일러스트 노드. 래퍼가 색을 on-surface-muted로, aria-hidden으로 장식 처리한다 */
  icon?: ReactNode
  /** 제목(필수). 문서 아웃라인 오염을 피하려 heading 태그가 아닌 <p>로 렌더(근거: cssNotes) */
  title: ReactNode
  /** 보조 설명. on-surface-muted, 가독 폭 제한 */
  description?: ReactNode
  /** 주 액션 슬롯 — <Button>을 컴포즈(예: filled) */
  action?: ReactNode
  /** 보조 액션 슬롯 — <Button variant="text|outlined"> 등 */
  secondaryAction?: ReactNode
  /** true면 root에 role="status"(aria-live=polite 함의). 검색 결과 없음 등 "동적으로 나타나는" 빈 상태에만 사용. 정적 플레이스홀더는 기본(role 없음) */
  live?: boolean
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { size = 'md', icon, title, description, action, secondaryAction, live = false, className, ...rest },
  ref
) { /* … */ })
```

## Variants & API
비인터랙티브 컨테이너(슬롯 조합형). root는 forwardRef<HTMLDivElement> div.

렌더 골격:
  <div ref className={cx(styles.root, styles[size], className)} {...rest} role={live ? 'status' : rest.role}>
    {icon && <div className={styles.icon} aria-hidden="true">{icon}</div>}
    <p className={styles.title}>{title}</p>
    {description && <p className={styles.description}>{description}</p>}
    {(action || secondaryAction) && (
      <div className={styles.actions}>{action}{secondaryAction}</div>
    )}
  </div>

rest-spread 순서(conventions §8~9): 기본 "소비자가 이긴다" — className은 cx로 병합, 나머지는 {...rest} 마지막. 단 컴포넌트-소유 role은 rest 뒤에 두어 live일 때 status가 이기게 하고, live가 아니면 rest.role을 그대로 통과(소비자가 role 지정 가능). 컴포넌트가 강제 실행할 핸들러가 없어 합성 대상 없음.

Sizes(sm 인라인 / md 기본 / lg 전체페이지)는 패딩·gap·타이포·아이콘 스케일만 차등. 3 사이즈 × {아이콘 유무, 설명 유무, 액션 0/1/2}가 표현 표면.

reuse: action/secondaryAction/icon은 슬롯이라 EmptyState 자체는 Button/Icon을 import하지 않는다(소비자가 컴포즈; 스토리·테스트에서 Button+Icon import). "EmptyState→Button+Icon" 재사용은 이 슬롯 컴포지션으로 충족.

## Accessibility
- 기본은 role 없음: 정적 빈-상태 플레이스홀더는 시맨틱 랜드마크가 아니며 내용(텍스트·실제 button)이 그대로 접근 가능. live=true일 때만 role="status"(aria-live=polite 함의)로 "검색 결과 없음"처럼 뒤늦게 나타나는 빈 상태를 SR에 공지. status가 켜지면 title+description 텍스트가 라이브 리전으로 읽힌다.
- title은 heading 태그가 아닌 <p>: EmptyState가 삽입되는 위치(카드/페이지/패널)마다 올바른 heading 레벨이 달라 문서 아웃라인을 오염시키지 않기 위함. 페이지 제목이 필요한 소비자는 상위에서 <h1>을 둔다.
- icon 래퍼 aria-hidden="true": 아이콘은 장식. 의미는 title/description 텍스트가 전담(중복 공지 방지). 소비자가 의미 있는 일러스트를 넣어도 텍스트로 의미가 이미 보장됨.
- 액션은 실제 <Button>(네이티브 button) 슬롯 → 키보드 조작·focus-visible 링은 Button이 담당(EmptyState는 포커스 대상 아님, 컨테이너 tabIndex 미부여).
- 대비: title=on-surface, description·icon=on-surface-muted(라이트 #77767F on #FBF8FD ≈ 4.6:1, 다크 #8A8D94 on #1B1D21 ≈ 4.9:1 → AA 본문/큰텍스트 통과). 레드/에러 텍스트 미사용.

## CSS notes
토큰만 사용, px는 0/1/2만(다른 치수는 space/height/radius/type 토큰 또는 rem·ch·% 단위). 참조 토큰 전부 실재 확인함:
- .root: display:flex; flex-direction:column; align-items:center; text-align:center; box-sizing:border-box. gap·padding은 size별.
  - .sm: gap:var(--space-2); padding:var(--space-4).
  - .md: gap:var(--space-4); padding:var(--space-8).
  - .lg: gap:var(--space-5); padding:var(--space-11) var(--space-6). (전체페이지 여백)
- .icon: color:var(--on-surface-muted); display:flex; line-height:1. font-size로 대형화 — .sm .icon{font-size:var(--space-6)/*24*/} .md .icon{font-size:var(--space-8)/*40*/} .lg .icon{font-size:var(--space-9)/*48*/}. (참고: 슬롯이 <Icon size=…>를 주면 Icon의 인라인 fontSize가 이겨 최종 크기를 결정 — 스토리에서 md=40/lg=48 권장 사이즈로 전달. 래퍼 font-size는 비-Icon 노드·size 미지정 시 폴백 + 색상(muted) 상속 보장.)
- .title: color:var(--on-surface); margin:0. 타이포 size별 — .sm→font:var(--type-title-sm)+letter-spacing var(--type-title-sm-tracking); .md→var(--type-title-lg)+tracking; .lg→var(--type-headline-sm)+tracking.
- .description: color:var(--on-surface-muted); margin:0; max-width:42ch(가독 폭 제한, ch는 px 규칙 무관); .sm→font:var(--type-body-sm)+tracking; .md/.lg→var(--type-body-lg)+tracking.
- .actions: display:flex; flex-wrap:wrap; justify-content:center; gap:var(--space-2); margin-top:var(--space-2)(sm) / var(--space-3)(md·lg 은 상속 gap로 충분하면 생략 가능).
- 상태 레이어 없음(비인터랙티브 표면 → ::before 오버레이 불필요). transition/animation 없음 → prefers-reduced-motion 블록 불요(가드할 모션 자체가 없음). 향후 진입 애니메이션 추가 시 반드시 @media (prefers-reduced-motion: reduce)로 가드(§reduced-motion). npm run lint:tokens로 토큰 실재/색상·px 규칙 검증 통과 필요.

## New tokens needed
- none

## Acceptance tests
### title과 description을 렌더한다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from './EmptyState'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import styles from './EmptyState.module.css'

test('title과 description을 렌더한다', () => {
  render(<EmptyState title="데이터가 없습니다" description="첫 항목을 추가해 보세요" />)
  expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument()
  expect(screen.getByText('첫 항목을 추가해 보세요')).toBeInTheDocument()
})
```
### action 슬롯의 버튼 클릭이 전달된다
```tsx
test('action 슬롯의 버튼 클릭이 전달된다', async () => {
  const onClick = vi.fn()
  render(
    <EmptyState
      title="결과 없음"
      action={<Button onClick={onClick}>새로 만들기</Button>}
    />
  )
  await userEvent.click(screen.getByRole('button', { name: '새로 만들기' }))
  expect(onClick).toHaveBeenCalledOnce()
})
```
### primary/secondary 액션을 모두 렌더한다
```tsx
test('primary/secondary 액션을 모두 렌더한다', () => {
  render(
    <EmptyState
      title="결과 없음"
      action={<Button>새로 만들기</Button>}
      secondaryAction={<Button variant="text">도움말</Button>}
    />
  )
  expect(screen.getByRole('button', { name: '새로 만들기' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '도움말' })).toBeInTheDocument()
})
```
### size 클래스가 적용된다 (기본 md)
```tsx
test('size 클래스가 적용된다 (기본 md)', () => {
  const { rerender, container } = render(<EmptyState title="빈 상태" />)
  expect(container.firstChild).toHaveClass(styles.md)
  rerender(<EmptyState title="빈 상태" size="lg" />)
  expect(container.firstChild).toHaveClass(styles.lg)
})
```
### live면 role=status, 기본은 status 없음
```tsx
test('live면 role=status, 기본은 status 없음', () => {
  const { rerender } = render(<EmptyState title="검색 결과가 없습니다" live />)
  expect(screen.getByRole('status')).toHaveTextContent('검색 결과가 없습니다')
  rerender(<EmptyState title="검색 결과가 없습니다" />)
  expect(screen.queryByRole('status')).toBeNull()
})
```
### icon 슬롯은 장식용 aria-hidden 래퍼에 담긴다
```tsx
test('icon 슬롯은 장식용 aria-hidden 래퍼에 담긴다', () => {
  const { container } = render(
    <EmptyState title="빈 상태" icon={<Icon name="inbox" />} />
  )
  const iconWrap = container.querySelector(`.${styles.icon}`)
  expect(iconWrap).not.toBeNull()
  expect(iconWrap).toHaveAttribute('aria-hidden', 'true')
})
```
### consumer className과 data-* 속성을 병합한다 (소비자 우선)
```tsx
test('consumer className과 data-* 속성을 병합한다 (소비자 우선)', () => {
  const { container } = render(
    <EmptyState title="빈 상태" className="mine" data-testid="es" />
  )
  const root = container.firstChild as HTMLElement
  expect(root).toHaveClass('mine')
  expect(root).toHaveClass(styles.root)
  expect(root).toHaveAttribute('data-testid', 'es')
})
```

## Story notes
title: 'Components/EmptyState'. 카피 한국어, export 이름 영어.
- Playground: args {title, description, size='md'} + icon={<Icon name="inbox" size={40} />}, action={<Button>새로 만들기</Button>}.
- SearchEmpty: live 데모 — title="검색 결과가 없습니다", description="다른 키워드로 다시 시도해 보세요.", icon search, action={<Button variant="text">필터 초기화</Button>}, live.
- Inline(sm): 카드/패널 내부 삽입 예시(작은 컨테이너 안에 배치).
- Matrix (필수, story id components-emptystate--matrix): 3 사이즈(sm/md/lg)를 행으로, 각 행에 (아이콘+제목만) / (제목+설명) / (아이콘+제목+설명+주액션+보조액션) 3열 배열. 아이콘 사이즈 sm=24·md=40·lg=48로 전달. 라이트/다크 전수 확인용으로 상위를 data-theme 토글 없이도 배경 대비 보이게 배치(스토리 데코레이터 or 두 벌). Button은 filled(주)+text(보조) 조합으로 뮤트 대비 검증.

## Render-verify
- md(기본): 세로 중앙 정렬 — 대형 뮤트 아이콘(40) → title(on-surface, title-lg) → description(on-surface-muted, 가운데 정렬·폭 제한 줄바꿈) → 주(filled)+보조(text) 버튼 행. 라이트/다크 모두 title이 description·icon보다 확연히 진하게(위계) 보이고 AA 충족.
- sm/md/lg 스케일 차이: sm은 아이콘 24·컴팩트 패딩(카드 내부에 자연스럽게 인라인), lg는 아이콘 48·headline-sm 제목·넓은 상하 여백(전체 페이지 느낌). 3자 나란히 두면 단계적 증가가 보인다.
- 다크 테마(data-theme='dark')에서 description·icon이 #8A8D94로 표면 대비 뭉개지지 않고 읽히며, title은 #F4F3F7로 또렷. 레드/에러 색 미사용 확인.
- 액션 버튼에 키보드 포커스 시 focus-ring(2px surface + 2px primary)이 라이트/다크 모두 잘림 없이 보임.
- 긴 description이 max-width(42ch)에서 가운데 정렬로 줄바꿈되고 컨테이너 가로 오버플로 없음. 아이콘/설명 없이 title만 있을 때도 레이아웃이 무너지지 않음.

## Risks
아이콘 크기 자동화의 미묘함: 슬롯이 <Icon size={n}>를 주면 Icon의 인라인 fontSize가 CSS의 size별 .icon font-size를 이겨 최종 크기를 결정한다. 그래서 "size별 대형화"를 보장하려면 스토리/사용처에서 권장 사이즈(sm24/md40/lg48)를 전달해야 함 — 래퍼 font-size는 폴백일 뿐. 대안(더 강한 자동화)은 icon을 string prop으로 받아 내부에서 <Icon>을 size 매핑해 렌더하는 것이나, 커스텀 일러스트(img/svg) 지원을 위해 ReactNode 슬롯을 택함(유연성 우선). — title을 <p>로 두는 결정은 아웃라인 오염 회피가 목적이며, heading이 필요한 소비자는 상위에서 제공. 신규 토큰 불필요(모두 실재).
