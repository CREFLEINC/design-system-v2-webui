# Phase 3 Component Spec — StatCard

- Directory: `src/components/StatCard/`
- Reuses: Card (import '../Card/Card' — root shell: surface/elevation/bordered ladder + reduced-motion box-shadow guard, non-interactive div path), Icon (import '../Icon/Icon' — decorative delta arrow: arrow_upward/arrow_downward/trending_flat, rendered aria-hidden)

## Exports
```ts
export { StatCard } from './components/StatCard/StatCard'
export type { StatCardProps, StatCardStatus, StatCardDelta, DeltaDirection } from './components/StatCard/StatCard'
```

## Props interface
```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import type { CardSurface, CardElevation } from '../Card/Card'

export type StatCardStatus = 'success' | 'error' | 'warning' | 'info' | 'idle'
export type DeltaDirection = 'up' | 'down' | 'flat'

export interface StatCardDelta {
  /** up→success(초록), down→error(레드), flat→neutral. 색+화살표 아이콘 매핑 고정. */
  direction: DeltaDirection
  /** 표시할 증감 값 — 예: '+3.2%', '-12', '0'. ReactNode 허용. */
  value: ReactNode
  /** SR용 서술 라벨. 없으면 방향어(상승/하락/변동 없음)+value로 자동 구성. */
  label?: string
}

// title은 Card→div 네이티브 tooltip 속성과 겹치지 않게 Omit (라벨 개념과 혼동 방지).
export interface StatCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** KPI 라벨(작은 캡션). 문자열이면 group의 aria-label fallback으로도 사용. */
  label: ReactNode
  /** 큰 대표 값. 예: '98.2', '1,240'. */
  value: ReactNode
  /** 값 뒤 단위(약한 텍스트). 예: '%', '건', 'ea'. */
  unit?: ReactNode
  /** 증감 지표(선택). */
  delta?: StatCardDelta
  /** 상태 점(선택) — semantic 채움 마크. */
  status?: StatCardStatus
  /** 상태 점의 접근성 라벨(status 지정 시 필수 권장). 예: '가동중'. */
  statusLabel?: string
  /** 스파크라인 슬롯 — 인라인 미니 SVG 등. 차트는 만들지 않고 자리만 제공. */
  children?: ReactNode
  /** Card로 전달되는 표면 사다리. 기본 'low'. */
  surface?: CardSurface
  /** Card로 전달되는 elevation. 기본 0. */
  elevation?: CardElevation
  /** Card로 전달되는 1px --outline-variant 경계선. */
  bordered?: boolean
}

export const StatCard = forwardRef<HTMLElement, StatCardProps>(function StatCard(props, ref) { /* ... */ })
```

## Variants & API
ROOT = COMPOSE Card, not standalone. Justification: Card already solves the exact shell StatCard needs — the surface ladder (base/low/default/high), --elevation-0..5 (auto-weakened in dark), optional bordered 1px --outline-variant, --on-surface color, and the reduced-motion box-shadow guard. StatCard is non-interactive (a display tile, no click/state-layer), so Card's non-interactive `<div>` path is exactly right and adds no button chrome. StatCard forwards surface/elevation/bordered straight through and renders its KPI content as Card's children, so the two stay DRY and visually consistent with every other surface in the system. StatCard.module.css therefore owns ONLY layout + typography of the inner rows (padding, gap, label/value/unit/delta/dot/spark), never surface/shadow.

RENDER TREE (inside Card):
  <Card ref={ref} className={styles.root} surface elevation bordered {...rest} role="group" aria-label={groupLabel}>
    <div class=header> <span class=label>{label}</span> {status && <span class=dot data-status role=img aria-label=statusLabel/>} </div>
    <div class=valueRow> <span class=value>{value}</span> {unit && <span class=unit>{unit}</span>} </div>
    {delta && <span class=delta data-direction={dir}>
        <span class=srOnly>{deltaSrText}</span>
        <Icon class=deltaIcon name={arrowName[dir]} size={16} aria-hidden />
        <span aria-hidden="true">{delta.value}</span>
     </span>}
    {children && <div class=spark>{children}</div>}
  </Card>

DELTA MAPPING (fixed per task): up→arrow_upward + color var(--semantic-success-text); down→arrow_downward + var(--semantic-error-text); flat→trending_flat + var(--on-surface-variant). Direction word (Korean) for SR: up '상승', down '하락', flat '변동 없음'. deltaSrText = delta.label ?? `${word} ${String(delta.value)}`. Arrow Icon + visible value are aria-hidden so the srOnly span is the single SR source (no double-read).

STATUS DOT: filled semantic mark, size var(--space-2)=8px, radius-full. Colors var(--semantic-success|error|warning|info|idle) (foundation, fixed light/dark). Given role='img'+aria-label=statusLabel so it is an accessible graphic; meaning is carried by statusLabel, not color alone.

REST / ARIA ORDER (conventions §props): no must-run handlers (non-interactive), so `{...rest}` spreads onto Card, then component-owned role='group' + aria-label are placed AFTER rest so role always wins; groupLabel = (rest['aria-label'] as string) ?? (typeof label==='string' ? label : undefined) lets a consumer override the accessible name while defaulting to the visible label. forwardRef<HTMLElement> → Card → div.

NO SIZE/VARIANT AXIS beyond surface/elevation/bordered (inherited from Card). Typography fixed: label=--type-label-lg/on-surface-muted, value=--type-headline-lg/on-surface, unit=--type-title-sm/on-surface-variant, delta=--type-label-lg.

## Accessibility
role='group' on the root (a labelled cluster of related readouts, not a list/region) with an accessible name from statusLabel-independent `label` (or consumer aria-label override). Value/unit are plain text, read in DOM order after the label. Delta: the arrow Icon and the visible numeric value are aria-hidden='true'; a single visually-hidden (.srOnly) span carries "상승 3.2%" style text (delta.label overrides), so SR users get direction+magnitude once, sighted users get ▲/▼ color+arrow. Direction is never conveyed by color alone (arrow glyph + SR word both encode it) → WCAG 1.4.1. Status dot uses role='img' + aria-label=statusLabel so it is a named graphic, not a bare colored circle; meaning survives without color. Contrast (WCAG 1.4.3 AA, verified both themes): value/label/unit use on-surface family (pass); delta-down = --semantic-error-text (6.21:1 light / 9.88:1 dark); delta-flat = --on-surface-variant (pass); delta-up = NEW --semantic-success-text (8.8:1 light / high dark) because raw --semantic-success is only 4.27:1 light / 3.41:1 dark and FAILS AA as text. No interactive elements → no focus/keyboard surface of its own (a sparkline child that is interactive manages its own focus). Non-text-contrast caveat noted in risks for warning/info dots.

## CSS notes
TOKENS ONLY, px only 0/1/2 — dot uses var(--space-2) (8px), srOnly uses 1px/-1px/0 (allowed). No own transitions/animations (Card owns its box-shadow transition + its own reduced-motion guard), so StatCard.module.css needs NO @media reduced-motion block — nothing to disable. Sketch:

.root { padding: var(--space-5); gap: var(--space-2); } /* merged onto Card's flex column via className */
.header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
.label { font: var(--type-label-lg); letter-spacing: var(--type-label-lg-tracking); color: var(--on-surface-muted); }
.valueRow { display: flex; align-items: baseline; gap: var(--space-2); }
.value { font: var(--type-headline-lg); letter-spacing: var(--type-headline-lg-tracking); color: var(--on-surface); }
.unit { font: var(--type-title-sm); letter-spacing: var(--type-title-sm-tracking); color: var(--on-surface-variant); }
.delta { display: inline-flex; align-items: center; gap: var(--space-1); font: var(--type-label-lg); letter-spacing: var(--type-label-lg-tracking); }
.delta[data-direction='up'] { color: var(--semantic-success-text); }
.delta[data-direction='down'] { color: var(--semantic-error-text); }
.delta[data-direction='flat'] { color: var(--on-surface-variant); }
.deltaIcon { font-size: inherit; } /* Icon size prop passes 16 via inline style */
.dot { width: var(--space-2); height: var(--space-2); border-radius: var(--radius-full); flex: none; }
.dot[data-status='success'] { background: var(--semantic-success); }
.dot[data-status='error']   { background: var(--semantic-error); }
.dot[data-status='warning'] { background: var(--semantic-warning); }
.dot[data-status='info']    { background: var(--semantic-info); }
.dot[data-status='idle']    { background: var(--semantic-idle); }
.spark { margin-top: var(--space-1); }
.srOnly { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

Every var() referenced exists today EXCEPT --semantic-success-text (see newTokensNeeded). All --type-*, --space-*, --radius-full, --semantic-*, --on-surface*, --semantic-error-text are defined in web-tokens.css / foundation/tokens.css / themes.css.

## New tokens needed
- --semantic-success-text: light #0E5223 / dark #A6D9B6 — up-delta text on a plain surface needs WCAG AA. Raw --semantic-success (#1F883D) is only 4.27:1 on light --surface (#FBF8FD) and 3.41:1 on dark --surface (#1B1D21), both FAIL AA for text. #0E5223 gives 8.8:1 on light surface; #A6D9B6 gives ~8.7:1 on dark surface (these are the already-AA-verified --on-semantic-success-container greens, reused as the surface-text tone). Add to web-tokens.css :root (light) and themes.css [data-theme='dark'], mirroring the existing --semantic-error-text sibling exactly.

## Acceptance tests
### role=group with aria-label derived from label, and label/value/unit render
```tsx
test('group 롤 + label에서 파생된 aria-label, value·unit 렌더', () => {
  render(<StatCard label="가동률" value="98.2" unit="%" />)
  const group = screen.getByRole('group', { name: '가동률' })
  expect(group).toBeInTheDocument()
  expect(within(group).getByText('98.2')).toBeInTheDocument()
  expect(within(group).getByText('%')).toBeInTheDocument()
  expect(within(group).getByText('가동률')).toBeInTheDocument()
})
```
### consumer aria-label overrides the label-derived group name
```tsx
test('consumer aria-label이 label 파생 이름을 덮어쓴다', () => {
  render(<StatCard label="가동률" value="98.2" aria-label="설비 A 가동률" />)
  expect(screen.getByRole('group', { name: '설비 A 가동률' })).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: '가동률' })).toBeNull()
})
```
### delta up → success direction attr + auto SR text; arrow/value are aria-hidden
```tsx
test('delta up: data-direction=up + SR용 상승 텍스트, 화살표·값은 aria-hidden', () => {
  render(<StatCard label="양품률" value="96" delta={{ direction: 'up', value: '+3.2%' }} />)
  // SR 소스: 방향어 + 값 (자동 구성)
  expect(screen.getByText('상승 +3.2%')).toBeInTheDocument()
  const deltaEl = screen.getByText('상승 +3.2%').parentElement as HTMLElement
  expect(deltaEl).toHaveAttribute('data-direction', 'up')
  // 시각 값은 aria-hidden (이중 낭독 방지)
  const visible = within(deltaEl).getByText('+3.2%')
  expect(visible).toHaveAttribute('aria-hidden', 'true')
})
```
### delta down uses error direction; custom delta.label wins over auto text
```tsx
test('delta down: data-direction=down, delta.label이 자동 텍스트를 대체', () => {
  render(<StatCard label="불량" value="32" delta={{ direction: 'down', value: '-12', label: '전월 대비 12건 감소' }} />)
  const srText = screen.getByText('전월 대비 12건 감소')
  const deltaEl = srText.parentElement as HTMLElement
  expect(deltaEl).toHaveAttribute('data-direction', 'down')
  expect(screen.queryByText('하락 -12')).toBeNull()
})
```
### status dot renders as named graphic; absent when no status
```tsx
test('status 점은 statusLabel을 가진 img로 렌더, status 없으면 없음', () => {
  const { rerender } = render(<StatCard label="설비 A" value="1,240" status="success" statusLabel="가동중" />)
  const dot = screen.getByRole('img', { name: '가동중' })
  expect(dot).toHaveAttribute('data-status', 'success')
  rerender(<StatCard label="설비 A" value="1,240" />)
  expect(screen.queryByRole('img')).toBeNull()
})
```
### sparkline slot (children) renders inside the group
```tsx
test('스파크라인 슬롯(children)이 group 안에 렌더된다', () => {
  render(
    <StatCard label="추세" value="1,240">
      <svg data-testid="spark" role="img" aria-label="7일 추세"><polyline points="0,10 10,4 20,6" /></svg>
    </StatCard>
  )
  const group = screen.getByRole('group', { name: '추세' })
  expect(within(group).getByTestId('spark')).toBeInTheDocument()
})
```
### forwards ref to root and spreads rest (data-*); surface/elevation/bordered reach Card
```tsx
test('ref 전달 + rest spread(data-*), surface/elevation/bordered가 Card에 반영', () => {
  const ref = { current: null as HTMLElement | null }
  render(<StatCard ref={ref} label="매출" value="12.4" unit="억" surface="high" elevation={2} bordered data-testid="sc" />)
  expect(ref.current).not.toBeNull()
  const el = screen.getByTestId('sc')
  expect(el).toBe(ref.current)
  expect(el.className).toContain(cardStyles.high)
  expect(el.className).toContain(cardStyles.elev2)
  expect(el.className).toContain(cardStyles.bordered)
})
```

## Story notes
title 'Components/StatCard'. Import: StatCard, Icon; a tiny hand-rolled inline <svg> Sparkline helper (polyline, stroke='var(--chart-1)', fill='none', no runtime dep) defined locally in the story file for the slot demos. Copy Korean, story names English.

Stories:
- Playground: single StatCard label='설비 A 가동률' value='98.2' unit='%' delta up '+3.2%' status='success' statusLabel='가동중', maxWidth 240.
- WithSparkline: value + unit + delta + inline SVG sparkline child.
- Deltas: three cards side by side showing up/down/flat (양품률 상승 / 불량 하락 / 재고 변동 없음) to eyeball the success-text vs error-text vs neutral colors.
- Matrix (REQUIRED, id components-statcard--matrix): grid on background:var(--surface), padding:24. Rows = the axes: (1) delta direction {up,down,flat} × (2) status {none, success, error, warning, info, idle} × (3) surface {base, low, default, high} representative combos, plus one bordered and one elevation={2} tile, and one with a sparkline child. Each tile wrapped in a fixed 220px width div with a --type-label-sm/--on-surface-muted caption naming its combo. Purpose: light+dark screenshot sweeps every semantic color + surface pairing at once.

## Render-verify
- Light+dark: delta-up text is legible green on the surface (not the muddy raw --semantic-success) — confirms --semantic-success-text is wired; delta-down is the AA red (--semantic-error-text), delta-flat is neutral on-surface-variant.
- Both themes: ▲ (arrow_upward) shows for up, ▼ (arrow_downward) for down, — (trending_flat) for flat, each same color as its value text.
- Status dot is a crisp 8px filled circle in the correct semantic hue (success green / error red / warning amber / info blue / idle grey), vertically centered against the label row, in both themes.
- Card shell reads correctly: surface ladder + elevation shadow + bordered outline match sibling Card tiles; value uses headline-lg weight, label is small/muted, unit is baseline-aligned to the value.
- Matrix: no text fails contrast in dark (esp. delta-up green and unit/label greys); sparkline stroke uses chart-1 red and sits in the slot below the value without overlapping the delta.

## Risks
Non-text contrast (WCAG 1.4.11): the solid status dot for warning (#E8A100 ~1.8:1 on light surface) and success/info can fall below 3:1 as a standalone graphic. Mitigation in spec: dot is role='img' with a mandatory statusLabel, so meaning never rests on the dot's color/edge alone; documented rather than adding a ring token (foundation rule = filled marks use raw --semantic-*). If design later wants an AA-visible dot, add a 1px var(--outline-variant) ring — flagged, not built. Second: delta direction→sentiment is FIXED (up=good/green) per task; in some factory KPIs 'up' is bad (e.g. defect count rising) — consumers must pick direction by sentiment, not by arithmetic sign; noted in the delta.direction JSDoc. Third: label as ReactNode means the group aria-label auto-derivation only works when label is a string; non-string labels require an explicit aria-label (documented).
