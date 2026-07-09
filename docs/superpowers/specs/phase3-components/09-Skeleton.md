# Phase 3 Component Spec — Skeleton (+ SkeletonText helper) — 로딩 플레이스홀더. 단일 디렉터리 다중 컴포넌트(Navigation/Progress 선례). 장식 전용(aria-hidden), 움직이는 그라데이션 시머 + prefers-reduced-motion 정적 폴백.

- Directory: `src/components/Skeleton/`
- Reuses: none

## Exports
```ts
export { Skeleton, SkeletonText } from './components/Skeleton/Skeleton'
export type { SkeletonProps, SkeletonVariant, SkeletonTextProps } from './components/Skeleton/Skeleton'
```

## Props interface
```tsx
export type SkeletonVariant = 'text' | 'rect' | 'circle'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** text=단일 라인(높이 1em, 기본 width 100%), rect=박스, circle=원(size=지름) */
  variant?: SkeletonVariant           // default 'text'
  /** text·rect 너비. number→px, string→그대로. */
  width?: number | string
  /** rect 높이. number→px, string→그대로. */
  height?: number | string
  /** circle 지름(width=height). number→px, string→그대로. */
  size?: number | string
}
// forwardRef<HTMLDivElement, SkeletonProps>

export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  /** 렌더할 라인 수. */
  lines?: number                      // default 3
  /** 각 라인 너비(마지막 제외). number→px, string→그대로. */
  width?: number | string             // default '100%'
  /** 마지막 라인 너비 — 실제 문단처럼 짧게. */
  lastLineWidth?: number | string     // default '60%'
}
// forwardRef<HTMLDivElement, SkeletonTextProps>
```

## Variants & API
Skeleton: 3 variants — text(기본, height:1em, 기본 width 100%, radius-sm), rect(width+height 필수 권장, radius-sm), circle(size→width=height, radius-full). 치수 props는 인라인 style로만 주입(모듈 CSS는 토큰만/px 0·1·2 규칙 유지); number→`${n}px`, string→그대로. 시머는 base→shine→base 90deg 그라데이션 + background-size:200%을 background-position로 스윕하는 keyframes. 소비자 style/className은 destructure해 병합(소비자 style이 치수보다 우선: `style={{...dimStyle, ...style}}`), 컴포넌트 소유 `aria-hidden`은 `{...rest}` 뒤에 두어 유지(관례: role/aria는 rest 뒤). 인터랙션·핸들러 없음(순수 장식)이라 상태 레이어/포커스 링 불필요.

SkeletonText: 컨테이너 div(flex column, gap-2, aria-hidden) 안에 N개의 `<Skeleton variant="text">`. 마지막 라인만 width=lastLineWidth(기본 60%)로 짧게. 컨테이너와 각 라인 모두 aria-hidden이라 접근성 트리에서 완전히 제외. ref는 컨테이너로 전달. lines/width/lastLineWidth 외 rest는 컨테이너에 스프레드.

## Accessibility
순수 장식 — 루트에 `aria-hidden="true"`(rest 뒤에 두어 컴포넌트 소유로 유지), role 없음. 실제 "불러오는 중" 안내는 소비자 몫(예: 데이터 영역에 `aria-busy` 또는 시각적으로 숨긴 status 라이브 리전). 시머는 의미 없는 장식 모션이므로 reduced-motion에서 감속이 아니라 완전 정지(스피너와 다름) → 정적 --skeleton-base 채움으로 폴백. 텍스트/포커스 대상 아님, WCAG 텍스트 대비 요건 비적용(비-텍스트 장식). base↔shine 대비는 낮게 유지해도 무방하나 시각적으로 감지 가능하게.

## CSS notes
모듈 CSS 토큰 전용, px는 0/1/2만. `.skeleton{ display:block; background:linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shine) 37%, var(--skeleton-base) 63%); background-size:400% 100%; animation:skeleton-shimmer 1.4s ease-in-out infinite; }` `@keyframes skeleton-shimmer{ 0%{background-position:100% 0} 100%{background-position:-100% 0} }`. `.text{ height:1em; border-radius:var(--radius-sm) }` (기본 width 100%는 인라인 style 폴백; 미지정 시 CSS `width:100%`), `.rect{ border-radius:var(--radius-sm) }`, `.circle{ border-radius:var(--radius-full) }`, `.textGroup{ display:flex; flex-direction:column; gap:var(--space-2) }`. reduced-motion 블록(파일 맨 아래): `@media (prefers-reduced-motion: reduce){ .skeleton{ animation:none; background:var(--skeleton-base) } }` — 그라데이션 스윕 제거 + 정적 muted 채움. 유사요소 미사용이라 ::before/::after 나열 불필요. 치수·기본 width는 인라인 style로 주입해 CSS의 px 0/1/2 규칙을 침범하지 않음(Card·TextField의 인라인 치수 선례).

## New tokens needed
- --skeleton-base: light #E6E4EA / dark #2E3137 — 시머의 베이스(정지) 채움. 라이트는 surface-container(#EFEDF1)보다 한 단계 진한 muted 뉴트럴이라 기본 surface(#FBF8FD) 위에서 '콘텐츠 대기'로 읽힘; 다크는 surface-container(#2A2D33)와 -high(#33363B) 사이 값이라 순수 검정 금지 규칙 준수하며 표면 위에서 감지됨. reduced-motion 정적 폴백 색이기도 함.
- --skeleton-shine: light #F3F1F7 / dark #3B3E45 — 시머 스윕의 밝은 하이라이트. base보다 명도 한 단계 위(라이트=위로 밝게, 다크=위로 밝게)라 그라데이션 방향이 일관되게 '빛이 지나가는' 효과를 냄. 기존 surface 사다리는 라이트에서 -high가 -container보다 오히려 어두워 base/shine 명도 방향이 맞는 쌍을 제공하지 못하므로 전용 토큰 필요. 비-텍스트 장식이라 AA 대비 요건 비적용.

## Acceptance tests
### 장식 요소이므로 aria-hidden으로 접근성 트리에서 제외된다
```tsx
import { expect, test } from 'vitest'
import { createRef } from 'react'
import { render } from '@testing-library/react'
import { Skeleton, SkeletonText } from './Skeleton'
import styles from './Skeleton.module.css'

test('장식 요소이므로 aria-hidden으로 접근성 트리에서 제외된다', () => {
  const { container } = render(<Skeleton />)
  const el = container.firstChild as HTMLElement
  expect(el).toHaveAttribute('aria-hidden', 'true')
  // role이 없어 접근성 쿼리로 잡히지 않는다
  expect(el).not.toHaveAttribute('role')
})
```
### variant에 따라 클래스가 적용된다 (기본 text)
```tsx
import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'
import styles from './Skeleton.module.css'

test('variant에 따라 클래스가 적용된다 (기본 text)', () => {
  const { container, rerender } = render(<Skeleton />)
  expect((container.firstChild as HTMLElement).className).toContain(styles.text)
  rerender(<Skeleton variant="rect" width={200} height={80} />)
  expect((container.firstChild as HTMLElement).className).toContain(styles.rect)
  rerender(<Skeleton variant="circle" size={48} />)
  expect((container.firstChild as HTMLElement).className).toContain(styles.circle)
})
```
### 치수 props를 인라인 style로 매핑한다 (number→px, string→그대로, circle=정사각)
```tsx
import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

test('치수 props를 인라인 style로 매핑한다 (number→px, string→그대로, circle=정사각)', () => {
  const { container, rerender } = render(<Skeleton variant="circle" size={48} />)
  let el = container.firstChild as HTMLElement
  expect(el.style.width).toBe('48px')
  expect(el.style.height).toBe('48px')
  rerender(<Skeleton variant="rect" width="50%" height={120} />)
  el = container.firstChild as HTMLElement
  expect(el.style.width).toBe('50%')
  expect(el.style.height).toBe('120px')
})
```
### SkeletonText는 lines 개수만큼 줄을 렌더하고 마지막 줄을 짧게 만든다
```tsx
import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { SkeletonText } from './Skeleton'
import styles from './Skeleton.module.css'

test('SkeletonText는 lines 개수만큼 줄을 렌더하고 마지막 줄을 짧게 만든다', () => {
  const { container } = render(<SkeletonText lines={4} />)
  const lines = container.querySelectorAll(`.${styles.text}`)
  expect(lines).toHaveLength(4)
  const last = lines[lines.length - 1] as HTMLElement
  const first = lines[0] as HTMLElement
  // 기본 lastLineWidth 60% — 앞선 라인(100%)과 다르게 짧다
  expect(last.style.width).toBe('60%')
  expect(first.style.width).not.toBe('60%')
})
```
### 소비자 className/style을 병합하고 컴포넌트 소유 aria-hidden을 유지한다
```tsx
import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'
import styles from './Skeleton.module.css'

test('소비자 className/style을 병합하고 컴포넌트 소유 aria-hidden을 유지한다', () => {
  const { container } = render(
    <Skeleton className="custom" style={{ opacity: 0.5 }} aria-hidden={false} />
  )
  const el = container.firstChild as HTMLElement
  expect(el.className).toContain('custom')
  expect(el.className).toContain(styles.skeleton)
  expect(el.style.opacity).toBe('0.5')
  // 소비자가 aria-hidden=false를 넘겨도 컴포넌트 소유 값이 이긴다 (rest 뒤 배치)
  expect(el).toHaveAttribute('aria-hidden', 'true')
})
```
### ref를 루트 요소로 전달한다
```tsx
import { expect, test } from 'vitest'
import { createRef } from 'react'
import { render } from '@testing-library/react'
import { Skeleton, SkeletonText } from './Skeleton'

test('ref를 루트 요소로 전달한다', () => {
  const ref = createRef<HTMLDivElement>()
  render(<Skeleton ref={ref} />)
  expect(ref.current).toBeInstanceOf(HTMLDivElement)
  const groupRef = createRef<HTMLDivElement>()
  render(<SkeletonText ref={groupRef} />)
  expect(groupRef.current).toBeInstanceOf(HTMLDivElement)
})
```

## Story notes
title 'Components/Skeleton', 카피 한국어. Playground(단일 Skeleton, controls로 variant/치수 조절). RealWorld 예시: 카드형 스켈레톤(circle 아바타 + SkeletonText 3줄)로 실제 로딩 레이아웃 시연. Matrix(id components-skeleton--matrix): variant 3종 대표 치수 행 + SkeletonText(lines 2/3/5) + reduced-motion 안내 캡션을, Card 매트릭스 패턴대로 `background:var(--surface); padding:var(--space-6)` 래퍼로 라이트/다크 대비 배열. 소비자가 실제 loading 안내(aria-busy/status)를 붙이는 방식을 스토리 설명(주석)으로 명시.

## Render-verify
- 라이트: 기본 surface(#FBF8FD) 위 skeleton 채움(--skeleton-base)이 표면과 구분되는 muted 뉴트럴로 읽히고, 스윕 하이라이트(--skeleton-shine)가 base보다 밝아 그라데이션이 감지된다.
- 다크: base/shine이 순수 검정이 아니며 다크 surface(#1B1D21)/container 위에서 명확히 보인다.
- circle variant는 완전한 원(radius-full, size=지름=정사각), rect는 radius-sm 박스, text 라인은 radius-sm.
- SkeletonText: 지정 lines 수만큼 라인, 마지막 라인이 눈에 띄게 짧다(기본 60%), 라인 간 space-2 간격.
- Matrix 스토리(components-skeleton--matrix): text/rect/circle × 대표 치수 + SkeletonText 예시를 라이트/다크 나란히 배열(Card 매트릭스처럼 background:var(--surface) 래퍼). 시머 애니메이션이 도는 상태를 캡처.
- reduced-motion(스크린샷 외 확인): OS 모션 축소 시 시머가 멈추고 정적 --skeleton-base 단색 채움으로 남는다(감속 아님, 완전 정지).

## Risks
치수를 인라인 style로 주입하므로 모듈 CSS의 px 0/1/2 규칙은 지켜지나, 기본 text width(100%)를 CSS로 둘지 인라인으로 둘지 일관성 필요 — 인라인 폴백(width 미지정 시 style.width 미설정, CSS `.text{width:100%}`)로 처리해 테스트의 first.style.width는 '' 가능성. → 테스트는 last(60%)와 first가 '다름'만 검증하므로 first가 ''이어도 통과(60%가 아니면 OK). 안전하게 SkeletonText는 각 라인에 명시적 width prop(기본 '100%')을 넘겨 first.style.width='100%'가 되게 구현 권장. 시머 방향(background-position 부호)은 시각 취향; keyframes 100%→-100%로 좌→우 스윕 고정. --skeleton-base/-shine 2개 토큰이 신규이므로 lint:tokens 통과 위해 web-tokens.css(:root 라이트) + themes.css([data-theme=dark]) 양쪽에 반드시 추가해야 함.
