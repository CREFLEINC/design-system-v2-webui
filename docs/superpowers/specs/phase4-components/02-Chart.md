# Phase 4 Component Spec — Chart — LineChart · BarChart · PieChart (three focused exports) + a thin Chart dispatcher (type="line|bar|pie"). Hand-rolled SVG, zero runtime deps.

- Directory: `src/components/Chart`
- Reuses: cx (src/utils/cx), srOnly visually-hidden pattern (from StatCard.module.css — copy into Chart.module.css, no shared class import across modules)

## Exports
```ts
export { Chart } from './components/Chart/Chart'
export { LineChart } from './components/Chart/LineChart'
export { BarChart } from './components/Chart/BarChart'
export { PieChart } from './components/Chart/PieChart'
export type { ChartProps, ChartType, ChartPoint, ChartSeries, ChartBaseProps } from './components/Chart/Chart'
export type { LineChartProps } from './components/Chart/LineChart'
export type { BarChartProps } from './components/Chart/BarChart'
export type { PieChartProps } from './components/Chart/PieChart'
```

## Props interface
```tsx
// Chart.shared.ts — data model + shared base props
export interface ChartPoint { label: string; value: number }
export interface ChartSeries {
  name: string
  data: ChartPoint[]
  /** 시리즈 색 오버라이드. 미지정 시 인덱스로 --chart-1..5 순환.
   *  TSX 인라인 style로 --series-color를 세팅(모듈 CSS엔 raw 색 없음). */
  color?: string
}

export interface ChartBaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: string
  caption?: string
  /** SVG role="img"의 aria-label. 미지정 시 데이터에서 자동 요약. */
  ariaLabel?: string
  /** viewBox 논리 크기(px). 컨테이너 폭에 반응(width:100%). 기본 640×320. */
  width?: number
  height?: number
  showLegend?: boolean          // 기본 series.length > 1 이면 true
  /** 시각적 숨김 <table> 대체 텍스트. 기본 true. */
  showTable?: boolean
  formatValue?: (v: number) => string   // 기본 String(v)
}

// LineChart.tsx / BarChart.tsx — 직교좌표(축) 공유
interface CartesianProps extends ChartBaseProps {
  series: ChartSeries[]
  /** y 도메인. 미지정 시 auto: bar는 [0, dataMax], line은 [min(0,dataMin), dataMax]. */
  min?: number
  max?: number
  yTicks?: number               // 기본 5
  showGrid?: boolean            // 기본 true
}
export interface LineChartProps extends CartesianProps {
  area?: boolean                // 폴리라인 아래 반투명 채움
  showPoints?: boolean          // 각 포인트에 원 마커
}
export interface BarChartProps extends CartesianProps {
  stacked?: boolean             // 기본 false = grouped(다중 시리즈 나란히)
}

// PieChart.tsx — 단일 시리즈(슬라이스 목록)
export interface PieChartProps extends ChartBaseProps {
  data: ChartPoint[]
  donut?: boolean               // 도넛(가운데 구멍 + center 라벨)
  centerLabel?: string
  centerValue?: string
}

// Chart.tsx — 디스패처(판별 유니온)
export type ChartType = 'line' | 'bar' | 'pie'
export type ChartProps =
  | ({ type: 'line' } & LineChartProps)
  | ({ type: 'bar'  } & BarChartProps)
  | ({ type: 'pie'  } & PieChartProps)
// forwardRef<HTMLDivElement, …> — 모든 export가 루트 <figure>(HTMLDivElement 호환 컨테이너)에 ref 전달
```

## Variants & API
DECISION: separate LineChart / BarChart / PieChart exports (primary API) in one dir, sharing Chart.module.css + Chart.shared.ts, PLUS a thin Chart dispatcher taking a discriminated-union `type` prop.

JUSTIFICATION (grounded in Phase 1-3):
- Direct precedent = Progress/ dir ships Progress (linear) + Gauge (radial) as two exports over one Progress.module.css. Chart mirrors this exactly: one dir, one stylesheet, multiple focused exports for genuinely divergent geometry.
- The three types have non-overlapping props (Line: area/showPoints/axes; Bar: stacked/axes; Pie: donut/centerLabel/no axes). A single fat `<Chart type>` with a union prop bag would force optional props that only apply to one type — an anti-pattern and hard to type. Separate components keep each prop surface tight and each SVG-math unit independently testable.
- The Chart dispatcher (discriminated union on `type`) covers the config-driven case ("I have a type string") and gives one import for demos, while just switch-rendering the concrete component and forwarding ref/rest.

SHARED INTERNALS (Chart.shared.ts, not exported as components): domain/scale math (`resolveDomain`, `yToPx`, band-x helpers), `ChartFrame` wrapper (<figure> + <figcaption> title/caption + <svg role="img"> slot + Legend + visually-hidden <table>), `Legend`, `SrDataTable`, color resolver (`seriesColorVar(i)` → sets `--series-color`). Numeric geometry constants (PADDING = {top:16,right:16,bottom:32,left:40}, default DIMENSIONS 640×320, point radius, bar gap ratio, donut ring thickness) live as TSX constants exactly like Gauge's GAUGE_DIMENSIONS — never in .module.css.

SVG MATH (compute in TSX, no d3/recharts):
- Line: xToPx(i)=left + (n>1 ? i/(n-1) : 0)*plotW; yToPx(v)=top + plotH*(1-(v-min)/(max-min)). Emit one <polyline points> per series; optional <path> area = polyline + baseline close; optional <circle data-chart-point> markers. Draw-in via strokeDasharray/offset with pathLength={100}.
- Bar (grouped): band=plotW/n; per band, s bars of width=band*0.7/s; height=plotH*(v-min)/(max-min), y=top+plotH-height (clamped ≥0). Stacked: accumulate offsets per band. Each <rect data-chart-bar data-label data-value>.
- Pie/Donut: cumulative angles from value share. Filled pie → wedge <path d="M cx cy L x1 y1 A r r 0 large 1 x2 y2 Z">. Donut → Gauge pattern: one <circle data-chart-slice> per slice, fill none, strokeWidth=ring, strokeDasharray="[arcLen, circ-arcLen]", rotated to its cumulative start (arcLen = circ*percent). Center label/value as <text>/overlay.

rest/ref order: root <figure> is a plain container → consumer wins, spread {...rest} then cx(className). Component-owned role="img"/aria-label live on the INNER <svg> (unaffected by rest). No must-run handlers to compose. Defaults: showLegend = series.length>1; showTable defaults true.

## Accessibility
Structure: root <figure> (forwardRef target) → <figcaption> holds title (as visible heading-level-agnostic text via var(--type-title-sm)) + caption. Inner <svg role="img"> carries aria-label = ariaLabel ?? auto-summary built from data, e.g. "월별 가동률 추이: 1월 82%, 2월 88%, 3월 91%" (uses formatValue). All decorative SVG children (grid, axes, bars, slices, points, legend swatches) are aria-hidden via the img role subsuming them. Visually-hidden <table class=srOnly> (reuse StatCard's srOnly pattern: position:absolute;width:1px;height:1px;clip:rect(0 0 0 0)) provides the structured data alternative: <caption>=title, a header row (지표/카테고리 + each series name), one <tr> per point/category with formatValue-formatted cells — keyboard/SR reachable, not display:none. Legend is a <ul aria-label="범례"> of <li> (series name text + aria-hidden swatch). Axis tick labels are real <text> (aria-hidden, but fill var(--on-surface-muted) meets AA against surface). Hover highlight is CSS-only (no tooltip in v1 → no keyboard-trap risk); if a tooltip is later added it must be non-essential since the sr-table already carries all values. WCAG AA: chart-1 (red/--primary) + charcoal ramp chosen for luminance separation, not hue, so colorblind-safe; every text token (on-surface / on-surface-muted) verified AA in both themes by the token sheet.

## CSS notes
Chart.module.css TOKENS-ONLY, px only 0/1/2 (all SVG numeric geometry is TSX attributes, per Gauge). Color strategy avoiding raw hex: each series wrapper (or mark) gets a class .s1..s5 that sets ONE custom prop — `.s1{--series-color:var(--chart-1)} … .s5{--series-color:var(--chart-5)}` — and marks read it: `.line{stroke:var(--series-color);fill:none} .area{fill:var(--series-color);opacity:.14} .bar{fill:var(--series-color)} .point{fill:var(--series-color)} .slice{stroke:var(--series-color)} .swatch{background:var(--series-color)}`. Per-series `color` override sets `--series-color` via TSX inline style (raw color allowed in TSX, never in CSS). Grid/axis lines: stroke var(--chart-grid) (=--outline-variant); axis baseline var(--outline-variant). Tick + axis text: fill var(--on-surface-muted), font var(--type-label-sm)+tracking. Title var(--type-title-sm), caption var(--type-body-sm) color var(--on-surface-muted). Legend text var(--type-label-sm) color var(--on-surface). svg{width:100%;height:auto;display:block} for responsive viewBox scaling. Hover: `.bar:hover,.slice:hover{opacity:.85}` guarded. Opacity values are unitless (allowed). Enter animations: `.line{animation:draw var(--motion-slow) var(--ease-standard) both}` (keyframes draw: stroke-dashoffset 100→0 with pathLength=100), `.bar{animation:rise …}` (transform:scaleY(0)→1, transform-origin bottom), `.area/.slice{animation:fade …}`. reduced-motion block at file bottom names EVERY animated class + any pseudo: `@media (prefers-reduced-motion:reduce){ .line,.bar,.area,.slice,.point{animation:none} .bar:hover,.slice:hover{transition:none} }` — base/final state (dashoffset 0, scaleY 1, opacity final) renders instantly. No ::before/::after used, so none to enumerate; if added, list them explicitly per conventions.

## New tokens needed
- none

## Acceptance tests
### LineChart: 시리즈당 polyline 1개 + 포인트 수 = 데이터 수, aria-label 자동 요약
```tsx
import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { LineChart } from './LineChart'

test('LineChart polyline + point count + aria summary', () => {
  const { container } = render(
    <LineChart
      title="월별 가동률"
      showPoints
      formatValue={(v) => `${v}%`}
      series={[{ name: '가동률', data: [
        { label: '1월', value: 82 },
        { label: '2월', value: 88 },
        { label: '3월', value: 91 },
      ] }]}
    />
  )
  expect(container.querySelectorAll('polyline').length).toBe(1)
  expect(container.querySelectorAll('[data-chart-point]').length).toBe(3)
  const img = screen.getByRole('img')
  const label = img.getAttribute('aria-label') ?? ''
  expect(label).toContain('1월 82%')
  expect(label).toContain('3월 91%')
})
```
### BarChart: 단일 시리즈 막대 수 = 데이터 수, 큰 값의 막대가 더 높다(픽셀값 아님·상대 비교)
```tsx
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { BarChart } from './BarChart'

test('BarChart bar count + taller bar for larger value', () => {
  const { container } = render(
    <BarChart min={0} max={40} series={[{ name: '생산량', data: [
      { label: 'A', value: 10 },
      { label: 'B', value: 40 },
    ] }]} />
  )
  const bars = container.querySelectorAll('[data-chart-bar]')
  expect(bars.length).toBe(2)
  const hA = parseFloat(bars[0].getAttribute('height') || '0')
  const hB = parseFloat(bars[1].getAttribute('height') || '0')
  expect(hB).toBeGreaterThan(hA)
})
```
### BarChart grouped: 막대 수 = 시리즈 수 × 포인트 수
```tsx
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { BarChart } from './BarChart'

test('grouped BarChart renders series*points rects', () => {
  const { container } = render(
    <BarChart series={[
      { name: '양품', data: [{ label: '1월', value: 90 }, { label: '2월', value: 95 }] },
      { name: '불량', data: [{ label: '1월', value: 10 }, { label: '2월', value: 5 }] },
    ]} />
  )
  expect(container.querySelectorAll('[data-chart-bar]').length).toBe(4)
})
```
### PieChart donut: 슬라이스 수 = 데이터 수, 25% 슬라이스의 dash arc ≈ 원주/4
```tsx
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { PieChart } from './PieChart'

test('donut slice count + dasharray proportion', () => {
  const { container } = render(
    <PieChart donut data={[
      { label: '가동', value: 25 },
      { label: '유휴', value: 75 },
    ]} />
  )
  const slices = container.querySelectorAll('[data-chart-slice]')
  expect(slices.length).toBe(2)
  const r = parseFloat(slices[0].getAttribute('r') || '0')
  const circ = 2 * Math.PI * r
  const dash = slices[0].getAttribute('stroke-dasharray') || ''
  const arc = parseFloat(dash.split(/[ ,]+/)[0])
  expect(arc).toBeCloseTo(circ / 4, 1)
})
```
### 범례: 시리즈당 항목 1개 + 시리즈 이름 표시
```tsx
import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { LineChart } from './LineChart'

test('legend renders one labelled item per series', () => {
  render(
    <LineChart showLegend series={[
      { name: '가동률', data: [{ label: '1월', value: 80 }] },
      { name: '목표', data: [{ label: '1월', value: 90 }] },
    ]} />
  )
  const legend = screen.getByRole('list', { name: /범례/ })
  expect(within(legend).getAllByRole('listitem').length).toBe(2)
  expect(within(legend).getByText('가동률')).toBeInTheDocument()
  expect(within(legend).getByText('목표')).toBeInTheDocument()
})
```
### 시각적 숨김 데이터 테이블: 포인트당 행 + formatValue 적용
```tsx
import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { BarChart } from './BarChart'

test('sr-only data table has a row per point with formatValue applied', () => {
  render(
    <BarChart title="가동률" showTable formatValue={(v) => `${v}%`}
      series={[{ name: '가동률', data: [
        { label: '1월', value: 82 },
        { label: '2월', value: 88 },
      ] }]} />
  )
  const table = screen.getByRole('table', { name: '가동률' })
  expect(within(table).getByRole('row', { name: /1월/ })).toBeInTheDocument()
  expect(within(table).getByText('82%')).toBeInTheDocument()
  expect(within(table).getByText('88%')).toBeInTheDocument()
})
```
### Chart 디스패처: type=bar → 막대 렌더, ref/rest가 루트에 전달
```tsx
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Chart } from './Chart'

test('Chart dispatcher renders bars for type=bar and forwards ref+rest', () => {
  const ref = { current: null as HTMLElement | null }
  const { container } = render(
    <Chart ref={ref} type="bar" data-testid="chart"
      series={[{ name: 's', data: [{ label: 'A', value: 1 }] }]} />
  )
  expect(container.querySelectorAll('[data-chart-bar]').length).toBe(1)
  const root = screen.getByTestId('chart')
  expect(root).toBe(ref.current)
})
```
### ariaLabel prop이 자동 요약을 대체한다
```tsx
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { LineChart } from './LineChart'

test('ariaLabel overrides the auto-generated summary', () => {
  render(
    <LineChart ariaLabel="맞춤 요약"
      series={[{ name: 's', data: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] }]} />
  )
  expect(screen.getByRole('img', { name: '맞춤 요약' })).toBeInTheDocument()
})
```

## Story notes
title: 'Components/Chart', 카피 한국어 / 이름 영어. Stories: LinePlayground(월별 가동률 area+points), BarPlayground(설비별 생산량, grouped 양품/불량), DonutPlayground(가동/유휴/정비 3-슬라이스 + centerLabel '가동률' centerValue '82%'), AutoDomain vs FixedMinMax 비교, LongSeries(12개월, 반응형 viewBox 확인), ReducedMotion(글로벌 prefers-reduced-motion 데코레이터로 draw-in 즉시 렌더 확인). REQUIRED Matrix 스토리(id components-chart--matrix): line/bar/pie × light/dark(각 블록 data-theme='dark' 컨테이너) 전수 배열 — 5색 시리즈로 --chart-1..5 램프가 두 테마에서 구분되는지, 범례·축·그리드·도넛 센터라벨 동시 노출. Matrix는 컨테이너 폭 240·480 두 가지로 반응형 스케일도 병치.

## Render-verify
- 라이트/다크 각각: chart-1 시리즈가 브랜드 레드(--primary), 나머지는 차콜 명도 램프(--chart-2..5)로 렌더되고 무지개색 없음 — 두 테마 모두 인접 시리즈가 명도로 구분됨(색맹 안전).
- 그리드/축선이 --chart-grid(=outline-variant)로 은은하게, 축 눈금·카테고리 라벨 텍스트가 --on-surface-muted로 AA 대비 충족하며 배경(surface)에 묻히지 않음(라이트·다크 공통).
- 막대·라인·영역·도넛 슬라이스가 클리핑/오버플로 없이 viewBox 안에 그려지고, 컨테이너 폭을 줄이면 svg가 width:100%로 비례 축소(축/라벨 겹침 없음).
- 도넛: 가운데 구멍 + centerLabel/centerValue 텍스트가 중앙 정렬, 슬라이스 비율이 값과 시각적으로 일치.
- 영역(area) 채움이 반투명(opacity)이라 그리드가 비쳐 보이고, 라인/포인트가 그 위에 선명.
- 범례 스와치 색이 각 시리즈 마크 색과 정확히 일치(라이트·다크 모두).
- 루트 figure 배경이 투명/surface — 차트 밖으로 raw 색 누출 없음, 다크에서 순수 검정 아님.
- prefers-reduced-motion:reduce 스크린샷에서 draw-in 없이 라인/막대/도넛이 최종 상태로 즉시 완성 렌더(빈 프레임 아님).

## Risks
(1) 색 토큰 적용을 마크별 stroke/fill 클래스로 분산하면 raw-color 없이 유지하기 위해 반드시 단일 --series-color 커스텀 프로퍼티 경유해야 함 — 구현자가 .module.css에 직접 hex를 넣지 않도록 주의(lint:tokens가 잡음). (2) y-도메인 auto 규칙(bar=[0,max], line=[min(0,dataMin),max])을 결정론적으로 고정해야 테스트/스냅샷이 안정 — nice-rounding은 v1 미도입 권장. (3) 도넛 stroke-dasharray 방식(Gauge 패턴)과 파이 wedge-path 방식이 공존하므로 슬라이스 데이터훅(data-chart-slice)을 두 경로 모두에 부여해야 테스트가 타입 무관하게 동작. (4) draw-in 애니메이션은 base 상태를 '최종 상태'로 두고 keyframe이 시작→최종으로 흐르게 해야 reduced-motion에서 animation:none 시 그려진 채 남음(역방향 금지). (5) n===1(단일 포인트) 라인은 xToPx 분모 0 방지 가드 필요. (6) sr-table은 display:none이 아닌 srOnly(클립)로 — 접근성 트리 유지.
