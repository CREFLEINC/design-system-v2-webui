# Phase 3 Component Spec — AlertBanner

- Directory: `src/components/AlertBanner/`
- Reuses: Icon, IconButton, Button (stories/tests only, for action slot)

## Exports
```ts
export { AlertBanner } from './components/AlertBanner/AlertBanner'
export type { AlertBannerProps, AlertVariant } from './components/AlertBanner/AlertBanner'
```

## Props interface
```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export type AlertVariant = 'success' | 'error' | 'warning' | 'info'

// HTMLAttributes.title은 string(브라우저 tooltip)이라 ReactNode title과 충돌 → Omit.
export interface AlertBannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** 시맨틱 유형 — 컨테이너 배경/텍스트/기본 아이콘/라이브 강도를 결정 (기본 'info') */
  variant?: AlertVariant
  /** 굵게 표시되는 제목 (선택) */
  title?: ReactNode
  /** 본문 설명 — children으로 전달 (선택) */
  children?: ReactNode
  /** 앞머리 아이콘 오버라이드. 문자열=Material Symbols 이름, false=아이콘 숨김. 미지정 시 variant별 기본 아이콘 */
  icon?: string | false
  /** 제공되면 우상단 닫기(IconButton)를 렌더하고 클릭 시 호출 */
  onDismiss?: () => void
  /** 닫기 버튼의 접근 가능한 이름 (기본 '닫기') */
  dismissLabel?: string
  /** 액션 슬롯(예: Button). 설명 아래에 렌더 */
  action?: ReactNode
  /**
   * 라이브 영역 강도 오버라이드. 미지정 시 variant로 결정:
   * error/warning → assertive(role="alert"), success/info → polite(role="status").
   */
  assertive?: boolean
}

// 구현 스케치 (rest-spread: 컴포넌트 소유 role이 이겨야 하므로 Select 예외 패턴 — {...rest} 먼저, role 뒤에)
const DEFAULT_ICON: Record<AlertVariant, string> = {
  success: 'check_circle', error: 'error', warning: 'warning', info: 'info',
}
export const AlertBanner = forwardRef<HTMLDivElement, AlertBannerProps>(function AlertBanner(
  { variant = 'info', title, children, icon, onDismiss, dismissLabel = '닫기', action, assertive, className, ...rest },
  ref
) {
  const isAssertive = assertive ?? (variant === 'error' || variant === 'warning')
  const role = isAssertive ? 'alert' : 'status'
  const iconName = icon === false ? null : (icon ?? DEFAULT_ICON[variant])
  return (
    <div ref={ref} className={cx(styles.root, styles[variant], className)} {...rest} role={role}>
      {iconName && <Icon name={iconName} size={20} className={styles.icon} />}
      <div className={styles.content}>
        {title != null && <div className={styles.title}>{title}</div>}
        {children != null && <div className={styles.description}>{children}</div>}
        {action != null && <div className={styles.action}>{action}</div>}
      </div>
      {onDismiss && (
        <IconButton className={styles.dismiss} icon="close" size="sm" variant="standard" aria-label={dismissLabel} onClick={onDismiss} />
      )}
    </div>
  )
})
```

## Variants & API
Single component, four semantic variants (success/error/warning/info) driving container bg + on-container text + default leading Icon. Reuses (imports): Icon (leading semantic icon, size 20, decorative/aria-hidden) and IconButton (dismiss — variant="standard", size="sm", icon="close", required aria-label from dismissLabel, onClick=onDismiss). Full-width by default (width:100%). Composable slots: title (ReactNode), children (description), action (ReactNode, e.g. a Button), all optional and independently omittable. Role logic: isAssertive = assertive ?? (variant==='error'||variant==='warning'); role = isAssertive ? 'alert' : 'status'. The `assertive` boolean prop overrides the variant default in both directions. Default icon map: success→check_circle, error→error, warning→warning, info→info; icon="name" overrides, icon={false} hides. forwardRef to the root div (consumers can measure/scroll-into-view an alert). ...rest spread pattern follows the conventions doc EXCEPTION (Select precedent): because role is component-owned accessibility that must not be clobbered, {...rest} is spread FIRST and role is placed AFTER it so a consumer-supplied role cannot break the live-region semantics; there is no critical root onClick to compose. className is destructured and composed via cx (not left in rest).

## Accessibility
Live region via native role mapping — role="alert" (error/warning, implies aria-live="assertive" + aria-atomic) and role="status" (success/info, implies aria-live="polite"); no explicit aria-live set to avoid redundant/conflicting duplication with the implied semantics. The `assertive` prop lets a consumer force either strength. role is placed after {...rest} so it always wins (WCAG-critical). Leading Icon is decorative (Icon defaults to aria-hidden when no label) — meaning is carried by the title/description text inside the live region, per alert convention; variant color is not relied on alone. Dismiss reuses IconButton, which REQUIRES aria-label (dismissLabel, default '닫기'), gets a native focus-visible ring and full keyboard operability for free. Contrast: every variant uses --semantic-*-container with its paired --on-semantic-*-container (AA-verified pairs already shipped for Chip StatusChip in both themes); the dismiss icon uses color:inherit so it renders in the on-container color (AA on that container) rather than IconButton's default --on-surface-variant which could underperform on the tint. No new focusable traps; the banner is inline/page-level and does not steal focus.

## CSS notes
.root: display:flex; align-items:flex-start; gap:var(--space-3); width:100%; padding:var(--space-3) var(--space-4); border-radius:var(--radius-md); font:var(--type-body-sm); letter-spacing:var(--type-body-sm-tracking). Variant classes set only bg+color: .success{background:var(--semantic-success-container);color:var(--on-semantic-success-container)} and identically for .error/.warning/.info with their matching container/on-container tokens. .icon{flex:0 0 auto; margin-top:var(--space-1)} (optical align with title first line; inherits currentColor = on-container). .content{flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:var(--space-1)}. .title{font:var(--type-title-sm); letter-spacing:var(--type-title-sm-tracking)}. .description{font:var(--type-body-sm); letter-spacing:var(--type-body-sm-tracking)}. .action{margin-top:var(--space-2); display:flex; flex-wrap:wrap; gap:var(--space-2)}. .dismiss{flex:0 0 auto; margin-top:calc(var(--space-1) * -1); color:inherit} (negative margin via calc(token*-1) — no raw px; only 0/1/2 literals appear via flex shorthands). TOKENS-ONLY, no raw color; every var() listed exists in web-tokens.css/themes.css. REDUCED-MOTION: the banner root defines NO decorative transition/animation (it mounts/unmounts under consumer control), so no @media(prefers-reduced-motion) block is needed in this file; the nested IconButton and Button carry their own guards. If a fade/collapse dismiss animation is later added, it MUST be added with a matching reduced-motion guard listing .root (and any ::before/::after) per docs/reduced-motion.md.

## New tokens needed
- none

## Acceptance tests
### error variant은 role=alert이며 제목과 설명을 렌더한다
```tsx
test('error variant은 role=alert이며 제목과 설명을 렌더한다', () => {
  render(<AlertBanner variant="error" title="저장 실패">네트워크를 확인하세요.</AlertBanner>)
  const alert = screen.getByRole('alert')
  expect(alert).toHaveTextContent('저장 실패')
  expect(alert).toHaveTextContent('네트워크를 확인하세요.')
})
```
### success variant은 role=status다
```tsx
test('success variant은 role=status다', () => {
  render(<AlertBanner variant="success">저장되었습니다.</AlertBanner>)
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
```
### assertive prop이 variant 기본 라이브 강도를 양방향으로 오버라이드한다
```tsx
test('assertive prop이 variant 기본 라이브 강도를 양방향으로 오버라이드한다', () => {
  const { rerender } = render(<AlertBanner variant="success" assertive>업로드 중단됨</AlertBanner>)
  expect(screen.getByRole('alert')).toBeInTheDocument()
  rerender(<AlertBanner variant="error" assertive={false}>완료됨</AlertBanner>)
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
```
### onDismiss가 있으면 닫기 버튼을 렌더하고 클릭 시 호출한다
```tsx
test('onDismiss가 있으면 닫기 버튼을 렌더하고 클릭 시 호출한다', async () => {
  const onDismiss = vi.fn()
  render(<AlertBanner variant="info" onDismiss={onDismiss} dismissLabel="알림 닫기">안내</AlertBanner>)
  await userEvent.click(screen.getByRole('button', { name: '알림 닫기' }))
  expect(onDismiss).toHaveBeenCalledOnce()
})
```
### onDismiss가 없으면 닫기 버튼이 없다
```tsx
test('onDismiss가 없으면 닫기 버튼이 없다', () => {
  render(<AlertBanner variant="info">안내</AlertBanner>)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
```
### action 슬롯의 버튼이 렌더되고 클릭된다
```tsx
test('action 슬롯의 버튼이 렌더되고 클릭된다', async () => {
  const onRetry = vi.fn()
  render(
    <AlertBanner variant="error" action={<Button onClick={onRetry}>재시도</Button>}>
      실패했습니다.
    </AlertBanner>
  )
  await userEvent.click(screen.getByRole('button', { name: '재시도' }))
  expect(onRetry).toHaveBeenCalledOnce()
})
```
### 컴포넌트 소유 role이 rest보다 우선하고 ref·className·data-*는 통과된다
```tsx
test('컴포넌트 소유 role이 rest보다 우선하고 ref·className·data-*는 통과된다', () => {
  const ref = createRef<HTMLDivElement>()
  render(
    <AlertBanner ref={ref} variant="error" className="custom" data-testid="banner" role="banner">
      본문
    </AlertBanner>
  )
  const el = screen.getByTestId('banner')
  expect(el).toBe(ref.current)
  expect(el).toHaveClass('custom')
  // 소비자가 role="banner"를 넘겨도 접근성 보호를 위해 무시되고 alert이 유지된다
  expect(el).toHaveAttribute('role', 'alert')
})
```
### icon=false면 앞머리 아이콘을 숨기고, 기본값은 렌더한다
```tsx
test('icon=false면 앞머리 아이콘을 숨기고, 기본값은 렌더한다', () => {
  const { rerender, container } = render(<AlertBanner variant="warning">주의</AlertBanner>)
  // 기본 아이콘(Material Symbols span, 장식용 aria-hidden)이 존재
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  rerender(<AlertBanner variant="warning" icon={false}>주의</AlertBanner>)
  expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
})
```

## Story notes
title 'Components/AlertBanner' (→ Matrix story id: components-alertbanner--matrix). 카피는 한국어, 스토리 이름은 영어. Stories: Playground(info+title+description), Variants(4종 세로 스택), WithAction(error + action={<Button size=\"sm\" variant=\"tonal\">재시도</Button>}), Dismissible(useState로 onDismiss 시 언마운트되는 상태형; 다시 표시 버튼 포함), TitleOnly / DescriptionOnly(슬롯 조합 확인), NoIcon(icon={false}), Assertive(success에 assertive로 role 강제 데모 — 시각 동일, 접근성 노트). Matrix: 4 variant × 대표 조합(제목+설명+닫기, 설명만, 액션 포함)을 그리드로 배열해 라이트/다크 전수 비교. 각 스토리 컨테이너는 폭 제한(예: max-width:640px)을 줘 full-width 거동을 보여준다.

## Render-verify
- 라이트/다크 각각에서 4개 variant(success/error/warning/info)가 세로로 쌓인 Matrix: 각 배너의 배경이 해당 --semantic-*-container, 텍스트/아이콘이 --on-semantic-*-container로 렌더되고 대비가 편안히 읽힌다(AA).
- 앞머리 아이콘(check_circle/error/warning/info)이 텍스트 첫 줄과 광학적으로 정렬되고 on-container 색을 따른다.
- 제목(title-sm, 굵게)과 설명(body-sm)의 위계가 명확하고, action 슬롯의 Button이 설명 아래에 배치된다.
- dismiss가 있는 배너는 우상단에 close IconButton이 있고, 그 아이콘 색이 on-container 색으로 보여 컨테이너 위에서 또렷하다(IconButton 기본 회색이 아님).
- full-width로 늘어나 컨테이너 폭을 채우고, 긴 설명이 줄바꿈되어도 아이콘/닫기 버튼 정렬(align-items:flex-start)이 유지된다.
- 다크 테마에서 container 틴트가 어두운 surface와 분리되어 보이고 focus-visible 링(닫기 버튼)이 배경과 대비된다.

## Risks
닫기 IconButton 색 오버라이드: IconButton standard variant는 자체 color(--on-surface-variant)를 세팅하므로 .dismiss{color:inherit}로 on-container 색을 상속시켜 대비를 확보한다 — 구현 시 IconButton이 root button color를 하드코딩하지 않고 상속을 허용하는지 확인 필요(현재 Button/IconButton은 variant class에서 color를 지정하므로 standard variant의 color 지정 여부를 점검; 필요하면 .dismiss에서 색을 명시 상속 처리). 라이브 영역 주의: role만으로 aria-live가 암시되지만, 컨텐츠가 조건부로 마운트/언마운트되는 방식(예: 에러 발생 시 배너를 새로 마운트)에서 SR이 안정적으로 읽도록 소비자에게 안내 필요. HTMLAttributes.title(string) 충돌은 Omit<...,'title'>로 해소했으므로 title에 ReactNode 전달 가능. 반복적으로 갱신되는 알림에는 Toast(별도 컴포넌트)를 쓰도록 문서 크로스링크 권장.
