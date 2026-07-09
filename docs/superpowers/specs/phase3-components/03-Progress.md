# Phase 3 Component Spec — Progress (linear bar) + Gauge (circular ring) — co-located in src/components/Progress/

- Directory: `src/components/Progress/`
- Reuses: none

## Exports
```ts
Progress
ProgressProps
ProgressSize
Gauge
GaugeProps
GaugeSize
ProgressTone
ThresholdStop
```

## Props interface
```tsx
// Progress.tsx — shared types + linear Progress
export type ProgressTone = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'idle'
export type ProgressSize = 'sm' | 'md'
/** value < upTo → this tone. Evaluated ascending; first match wins; else falls back to `tone`. */
export interface ThresholdStop { upTo: number; tone: ProgressTone }

export interface ProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** 0–100 (또는 min/max 스케일). indeterminate면 무시. */
  value?: number
  /** 진행량을 모를 때. valuenow 생략 + 감속 가능한 애니메이션 sliver. (linear 전용) */
  indeterminate?: boolean
  min?: number            // default 0
  max?: number            // default 100
  size?: ProgressSize     // default 'md'  (sm=4px, md=8px 두께)
  tone?: ProgressTone     // default 'primary' — thresholds의 fallback 이기도 함
  thresholds?: ThresholdStop[]
  /** aria-valuetext (스크린리더 낭독 문자열). indeterminate에도 사용 가능. */
  valueText?: string
  /** 접근 이름. 미지정 시 aria-labelledby/aria-label을 rest로 전달. */
  label?: string
  /** 트랙 끝에 "NN%" 텍스트 표시 (시각용, aria-hidden). */
  showValue?: boolean
}

// Gauge.tsx — 원형 링 게이지 (determinate 전용). Progress.module.css 공유.
export type GaugeSize = 'sm' | 'md' | 'lg'
export interface GaugeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  value?: number
  min?: number            // default 0
  max?: number            // default 100
  size?: GaugeSize        // default 'md' — SVG width/height(px)로 매핑 (sm48/md72/lg96)
  /** stroke 두께(px). 미지정 시 size로 파생 (sm4/md6/lg8). */
  thickness?: number
  tone?: ProgressTone     // default 'primary'
  thresholds?: ThresholdStop[]
  valueText?: string
  label?: string
  /** 중앙 숫자 라벨 (기본 true, aria-hidden). */
  showValue?: boolean
}
```

## Variants & API
TWO components, one directory, ONE shared stylesheet (Gauge imports Progress.module.css). Both are non-interactive display primitives → `forwardRef<HTMLDivElement>` on the root wrapper div (a ref to the progressbar element is genuinely useful for scroll/measure). No tabIndex, no handlers.

ROOT SPREAD ORDER (Select pattern — component ARIA must win): destructure `label, className, ...rest`; render `<div ref {...rest} role="progressbar" aria-valuemin aria-valuemax aria-valuenow aria-valuetext aria-label={label} className={cx(styles.root, className)}>`. role + aria-value* come AFTER `{...rest}` so a consumer can't clobber the progressbar semantics; `data-*`/`id`/`style` in rest still pass through. If `label` is omitted, consumer supplies name via `aria-labelledby`/`aria-label` in rest (documented).

TONE RESOLUTION (shared helper `resolveTone(percent, tone, thresholds)` co-located in Progress.tsx and imported by Gauge):
  if thresholds?.length → sort ascending by upTo, return first stop whose `percent < upTo`; else return `tone`.
  Example: thresholds=[{upTo:50,tone:'error'},{upTo:80,tone:'warning'}], tone='success' → 30→error, 65→warning, 95→success (matches brief). Resolved tone → class `styles['fill-'+tone]` (linear) / `styles['arc-'+tone]` (gauge).

SCALING/CLAMP (shared): `clamped = Math.min(max, Math.max(min, value ?? min))`; `percent = ((clamped-min)/(max-min))*100` (guard max===min → 0). aria-valuenow = clamped (indeterminate: omit). showValue linear text = `Math.round(percent)+'%'`; Gauge center = `Math.round(clamped)`.

LINEAR Progress: root = track (`.root` bg=surface-container-high, radius-full, overflow hidden). Determinate: inner `.fill` (+`fill-<tone>`) with inline `style={{ width: percent+'%' }}` (dynamic geometry, NOT a color token — allowed inline). Indeterminate: render `.indeterminate` sliver (+tone) instead of fill, no width; CSS keyframe translateX; valuenow omitted. size sm/md set track height via `var(--space-1)` / `var(--space-2)`.

GAUGE: hand-rolled SVG, ZERO deps. Dimensions live as SVG width/height ATTRIBUTES + viewBox in TSX (numbers, so the CSS px-0/1/2 rule is never touched). `r=(size-thickness)/2`, `C=2πr`, `strokeDasharray={C}`, `strokeDashoffset={C*(1-percent/100)}`. Two `<circle>`: `.track-ring` (stroke=surface-container-high) + `.arc`(+`arc-<tone>`, strokeLinecap round). Rotation to 12-o'clock start via CSS `.arc{transform:rotate(-90deg);transform-origin:50% 50%}`. `<svg aria-hidden="true">`; center `.value` text (aria-hidden) absolutely centered over the ring. role/aria live on the wrapper div.

## Accessibility
role="progressbar" on the root div for BOTH; aria-valuemin/aria-valuemax always set; aria-valuenow = clamped value on determinate, OMITTED entirely when indeterminate (WCAG/ARIA: indeterminate progressbar has no valuenow). aria-valuetext passes `valueText` through for human-readable state ("3 / 10단계"). Accessible name via `label`→aria-label, or consumer aria-labelledby/aria-label through rest. The visible % / center number is decorative and marked aria-hidden so it is not double-announced alongside valuenow/valuetext. Gauge `<svg>` is aria-hidden (semantics on wrapper). Non-interactive → no focus ring / tabIndex (nothing to focus); Progress is not a live region by itself (consumer wraps in aria-live if streaming). Fill/arc colors are redundant with the numeric value → not color-only. Contrast: track surface-container-high vs semantic/primary fills all clear ≥3:1 non-text; the numeric label uses --on-surface (guaranteed AA on all surfaces) — semantic base tokens (e.g. warning #E8A100) are used ONLY as fills/strokes, never as text, so no AA failure.

## CSS notes
See cssNotes field.

## New tokens needed
- none

## Acceptance tests
### imports & setup (top of Progress.test.tsx)
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from './Progress'
import { Gauge } from './Gauge'
import styles from './Progress.module.css'
```
### Progress: value가 aria-valuenow/min/max로 반영된다
```tsx
test('Progress: role=progressbar에 value가 aria-valuenow로 반영된다', () => {
  render(<Progress value={40} label="업로드 진행률" />)
  const bar = screen.getByRole('progressbar', { name: '업로드 진행률' })
  expect(bar).toHaveAttribute('aria-valuenow', '40')
  expect(bar).toHaveAttribute('aria-valuemin', '0')
  expect(bar).toHaveAttribute('aria-valuemax', '100')
})
```
### Progress: indeterminate는 valuenow 생략 + 애니메이션 요소 렌더
```tsx
test('Progress: indeterminate면 aria-valuenow를 생략하고 애니메이션 sliver를 렌더한다', () => {
  render(<Progress indeterminate label="로딩" />)
  const bar = screen.getByRole('progressbar', { name: '로딩' })
  expect(bar).not.toHaveAttribute('aria-valuenow')
  expect(bar.getElementsByClassName(styles.indeterminate).length).toBe(1)
})
```
### Progress: thresholds가 value 구간에 tone(fill 클래스)을 매핑
```tsx
test('Progress: thresholds가 value 구간에 따라 fill tone 클래스를 매핑한다', () => {
  const thresholds = [{ upTo: 50, tone: 'error' as const }, { upTo: 80, tone: 'warning' as const }]
  const fill = () => screen.getByRole('progressbar').getElementsByClassName(styles.fill)[0] as HTMLElement
  const { rerender } = render(<Progress value={30} tone="success" thresholds={thresholds} label="점수" />)
  expect(fill().className).toContain(styles['fill-error'])
  rerender(<Progress value={65} tone="success" thresholds={thresholds} label="점수" />)
  expect(fill().className).toContain(styles['fill-warning'])
  rerender(<Progress value={95} tone="success" thresholds={thresholds} label="점수" />)
  expect(fill().className).toContain(styles['fill-success'])
})
```
### Progress: tone 미지정 시 fill이 primary
```tsx
test('Progress: tone 미지정 시 fill이 primary 클래스다', () => {
  render(<Progress value={50} label="진행" />)
  const fill = screen.getByRole('progressbar').getElementsByClassName(styles.fill)[0] as HTMLElement
  expect(fill.className).toContain(styles['fill-primary'])
})
```
### Progress: min/max 스케일 + valueText + fill 폭(%)
```tsx
test('Progress: min/max 스케일과 valueText를 반영하고 fill 폭을 백분율로 설정한다', () => {
  render(<Progress value={5} min={0} max={10} valueText="5 / 10단계" label="단계" />)
  const bar = screen.getByRole('progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '5')
  expect(bar).toHaveAttribute('aria-valuemax', '10')
  expect(bar).toHaveAttribute('aria-valuetext', '5 / 10단계')
  const fill = bar.getElementsByClassName(styles.fill)[0] as HTMLElement
  expect(fill.style.width).toBe('50%')
})
```
### Progress: showValue면 반올림 퍼센트 텍스트 표시
```tsx
test('Progress: showValue면 퍼센트 텍스트를 표시한다', () => {
  render(<Progress value={72.4} showValue label="진행" />)
  expect(screen.getByText('72%')).toBeInTheDocument()
})
```
### Progress: 범위 밖 value는 클램프
```tsx
test('Progress: 범위를 벗어난 value는 클램프된다', () => {
  render(<Progress value={150} label="진행" />)
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
})
```
### Progress: rest(data-*) 전달 + 컴포넌트 role/aria 유지
```tsx
test('Progress: data-* 등 rest가 전달되고 컴포넌트 role/aria가 유지된다', () => {
  render(<Progress value={10} label="진행" data-testid="p1" />)
  const bar = screen.getByTestId('p1')
  expect(bar).toHaveAttribute('role', 'progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '10')
})
```
### Gauge: role=progressbar + 중앙 값 라벨 + 클램프
```tsx
test('Gauge: role=progressbar와 중앙 값 라벨을 렌더하고 클램프한다', () => {
  render(<Gauge value={120} label="완성도" />)
  const bar = screen.getByRole('progressbar', { name: '완성도' })
  expect(bar).toHaveAttribute('aria-valuenow', '100')
  expect(bar.getElementsByClassName(styles.value).length).toBe(1)
})
```
### Gauge: thresholds가 arc stroke tone 클래스를 매핑
```tsx
test('Gauge: thresholds가 arc stroke tone 클래스를 매핑한다', () => {
  render(<Gauge value={30} tone="success" thresholds={[{ upTo: 50, tone: 'error' }]} label="점수" />)
  const arc = screen.getByRole('progressbar').getElementsByClassName(styles.arc)[0] as SVGElement
  expect(arc.getAttribute('class')).toContain(styles['arc-error'])
})
```

## Story notes
title 'Components/Progress'. Korean copy, English names. Stories: (1) Playground — Progress args value/size/tone/indeterminate/showValue. (2) GaugePlayground. (3) Matrix (id components-progress--matrix): grid over sizes (sm/md) × tones (primary/success/error/warning/info/idle) for linear, a row of indeterminate bars, a threshold demo bar (value 30/65/95 with thresholds error<50/warning<80/success), and a row of Gauges (sm/md/lg) including one threshold-driven and one with showValue — so every tone + both components appear in one light+dark screenshot. Wrap in a display:grid; gap:20 container like Switch.Matrix. Labels use Korean ('업로드', '점수', '완성도', '로딩 중').

## Render-verify
- Light+dark: track reads as a subtle neutral (surface-container-high) and fill/arc as the tone color; determinate linear bars fill left→right to the right width; showValue % text is legible (on-surface) in both themes.
- All six tones render distinct fills/strokes; warning/info/success/error match the semantic palette and are NOT used as text (only the neutral numeric label is text).
- Threshold demo: value 30 shows error(red), 65 shows warning(amber), 95 shows success(green) — proving range→tone mapping.
- Indeterminate bar shows a moving sliver (or, with reduced-motion emulation, a slower but still-animating sliver — not frozen).
- Gauge: ring starts at 12 o'clock and sweeps clockwise proportional to value; center number is vertically+horizontally centered; round line-cap ends; sm/md/lg scale cleanly with no clipping.
- Dark theme: primary fill uses the red accent, semantic containers/strokes remain distinguishable on #1B1D21, focus/contrast intact; no raw white/black surfaces.

## Risks
Gauge sizing intentionally lives in TSX as SVG width/height/viewBox attributes (numeric) to respect the CSS px-0/1/2 rule — implementer must NOT move dimensions into module.css. Fill width % and stroke-dashoffset are dynamic geometry passed via inline style/attributes (not color) — permitted. Ensure max===min guard (percent→0, avoid NaN dashoffset). Indeterminate is linear-only; Gauge has no indeterminate. Keep the numeric label aria-hidden to avoid double announcement with aria-valuenow. resolveTone must sort a COPY of thresholds (don't mutate the prop).
