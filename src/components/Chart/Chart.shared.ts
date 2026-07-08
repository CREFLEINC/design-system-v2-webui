import type { HTMLAttributes, ReactNode } from 'react'

/** 차트 데이터 모델 */
export interface ChartPoint {
  label: string
  value: number
}

export interface ChartSeries {
  name: string
  data: ChartPoint[]
  /** 시리즈 색 오버라이드. 미지정 시 인덱스로 --chart-1..5 순환.
   *  TSX 인라인 style로 --series-color를 세팅(모듈 CSS엔 raw 색 없음). */
  color?: string
}

export interface ChartBaseProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: string
  caption?: string
  /** SVG role="img"의 aria-label. 미지정 시 데이터에서 자동 요약. */
  ariaLabel?: string
  /** viewBox 논리 크기(px). 컨테이너 폭에 반응(width:100%). 기본 640×320. */
  width?: number
  height?: number
  showLegend?: boolean
  /** 시각적 숨김 <table> 대체 텍스트. 기본 true. */
  showTable?: boolean
  formatValue?: (v: number) => string
}

/** Gauge의 GAUGE_DIMENSIONS와 동일한 정신 — 숫자 기하는 TSX 상수로, .module.css엔 두지 않는다. */
export const DEFAULT_WIDTH = 640
export const DEFAULT_HEIGHT = 320
export const PADDING = { top: 16, right: 16, bottom: 32, left: 40 }
export const POINT_RADIUS = 4
export const BAR_GROUP_GAP_RATIO = 0.7
export const DONUT_RING_RATIO = 0.32
export const DEFAULT_Y_TICKS = 5

export const defaultFormatValue = (v: number): string => String(v)

/** 시리즈 인덱스(0-based) → .s1..s5 순환 클래스명(모듈 CSS 키). 실제 클래스 매핑은 컴포넌트에서 styles['s' + n] 로 조회. */
export function seriesClassIndex(i: number): number {
  return (i % 5) + 1
}

/** 시리즈 color 오버라이드가 있으면 --series-color 인라인 style, 없으면 undefined(클래스가 순환색을 담당). */
export function seriesColorStyle(color?: string): { [key: string]: string } | undefined {
  return color ? { '--series-color': color } : undefined
}

export interface Domain {
  min: number
  max: number
}

/** bar: [0, dataMax] / line: [min(0,dataMin), dataMax]. min/max prop이 있으면 그대로 우선. */
export function resolveDomain(
  series: ChartSeries[],
  kind: 'bar' | 'line',
  min?: number,
  max?: number
): Domain {
  const values = series.flatMap((s) => s.data.map((p) => p.value))
  const dataMin = values.length ? Math.min(...values) : 0
  const dataMax = values.length ? Math.max(...values) : 0
  const resolvedMin = min ?? (kind === 'bar' ? 0 : Math.min(0, dataMin))
  const resolvedMax = max ?? dataMax
  // 축퇴(min===max) 방지 — 도메인 폭 0이면 나눗셈 가드용으로 +1
  if (resolvedMax === resolvedMin) return { min: resolvedMin, max: resolvedMin + 1 }
  return { min: resolvedMin, max: resolvedMax }
}

/** 값 v → plot 영역 내 y px. plotTop/plotBottom은 PADDING 반영된 실제 좌표. */
export function yToPx(v: number, domain: Domain, plotTop: number, plotBottom: number): number {
  const ratio = (v - domain.min) / (domain.max - domain.min)
  return plotBottom - ratio * (plotBottom - plotTop)
}

/** i번째(0-based, 총 n개) 포인트의 x px. n===1이면 분모 0 가드 → plotLeft 반환. */
export function xToPx(i: number, n: number, plotLeft: number, plotWidth: number): number {
  if (n <= 1) return plotLeft
  return plotLeft + (i / (n - 1)) * plotWidth
}

/** 라벨:포맷값을 나열한 자동 aria-label 요약 문자열 생성. */
export function summarize(series: ChartSeries[], formatValue: (v: number) => string, title?: string): string {
  const parts: string[] = []
  if (title) parts.push(title + ':')
  const flat = series.length === 1
  for (const s of series) {
    const points = s.data.map((p) => `${p.label} ${formatValue(p.value)}`).join(', ')
    parts.push(flat ? points : `${s.name}: ${points}`)
  }
  return parts.join(' ')
}

export function summarizePie(data: ChartPoint[], formatValue: (v: number) => string, title?: string): string {
  const parts: string[] = []
  if (title) parts.push(title + ':')
  parts.push(data.map((p) => `${p.label} ${formatValue(p.value)}`).join(', '))
  return parts.join(' ')
}

/** SR 전용 <table> — display:none 대신 클립(styles.srOnly)으로 접근성 트리 유지. */
export interface SrTableRow {
  label: string
  values: string[]
}

export interface SrDataTableProps {
  title?: string
  seriesNames: string[]
  rows: SrTableRow[]
  srOnlyClassName: string
  categoryHeader?: string
}

export function buildSrRows(series: ChartSeries[], formatValue: (v: number) => string): SrTableRow[] {
  if (series.length === 0) return []
  const labels = series[0].data.map((p) => p.label)
  return labels.map((label, i) => ({
    label,
    values: series.map((s) => formatValue(s.data[i]?.value ?? 0)),
  }))
}

export interface LegendItem {
  name: string
  colorStyle?: { [key: string]: string }
  classIndex: number
}

export function buildLegendItems(series: ChartSeries[]): LegendItem[] {
  return series.map((s, i) => ({
    name: s.name,
    colorStyle: seriesColorStyle(s.color),
    classIndex: seriesClassIndex(i),
  }))
}

export type { ReactNode }
