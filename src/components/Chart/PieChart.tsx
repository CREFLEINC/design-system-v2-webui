import { forwardRef, Fragment } from 'react'
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DONUT_RING_RATIO,
  defaultFormatValue,
  summarizePie,
  seriesClassIndex,
  type ChartBaseProps,
  type ChartPoint,
  type LegendItem,
} from './Chart.shared'
import { ChartFrame, SrDataTable } from './ChartFrame'
import styles from './Chart.module.css'

export interface PieChartProps extends ChartBaseProps {
  data: ChartPoint[]
  /** 도넛(가운데 구멍 + center 라벨) */
  donut?: boolean
  centerLabel?: string
  centerValue?: string
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export const PieChart = forwardRef<HTMLElement, PieChartProps>(function PieChart(
  {
    title,
    caption,
    ariaLabel,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    showLegend,
    showTable = true,
    formatValue = defaultFormatValue,
    data,
    donut = false,
    centerLabel,
    centerValue,
    className,
    ...rest
  },
  ref
) {
  const resolvedShowLegend = showLegend ?? data.length > 1
  const total = data.reduce((sum, p) => sum + p.value, 0) || 1

  const cx = width / 2
  const cy = height / 2
  const outerR = Math.min(width, height) / 2 - 24
  const ringWidth = outerR * DONUT_RING_RATIO
  const ringR = outerR - ringWidth / 2
  const circ = 2 * Math.PI * ringR

  const ariaLabelResolved = ariaLabel ?? summarizePie(data, formatValue, title)

  const legendItems: LegendItem[] = data.map((p, i) => ({
    name: p.label,
    colorStyle: undefined,
    classIndex: seriesClassIndex(i),
  }))

  const srRows = data.map((p) => ({ label: p.label, values: [formatValue(p.value)] }))

  let cumulative = 0

  return (
    <ChartFrame
      ref={ref}
      {...rest}
      className={className}
      title={title}
      caption={caption}
      ariaLabel={ariaLabelResolved}
      width={width}
      height={height}
      showLegend={resolvedShowLegend}
      legendItems={legendItems}
      showTable={showTable}
      srTable={
        <SrDataTable title={title} categoryHeader="구간" seriesNames={['값']} rows={srRows} />
      }
      svgChildren={
        <Fragment>
          {data.map((p, i) => {
            const classIndex = seriesClassIndex(i)
            const percent = p.value / total
            let node: React.ReactNode

            if (donut) {
              const arcLen = circ * percent
              const rotation = -90 + (cumulative / total) * 360
              node = (
                <circle
                  className={styles.slice}
                  data-chart-slice
                  data-label={p.label}
                  data-value={p.value}
                  cx={cx}
                  cy={cy}
                  r={ringR}
                  strokeWidth={ringWidth}
                  strokeDasharray={`${arcLen} ${circ - arcLen}`}
                  style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${cx}px ${cy}px` }}
                />
              )
            } else {
              const startAngle = (cumulative / total) * 360
              const endAngle = ((cumulative + p.value) / total) * 360
              const largeArc = endAngle - startAngle > 180 ? 1 : 0
              const start = polarToCartesian(cx, cy, outerR, startAngle)
              const end = polarToCartesian(cx, cy, outerR, endAngle)
              const d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
              node = (
                <path
                  className={styles.wedge}
                  data-chart-slice
                  data-label={p.label}
                  data-value={p.value}
                  d={d}
                />
              )
            }

            cumulative += p.value
            return (
              <g key={p.label} className={styles['s' + classIndex]}>
                {node}
              </g>
            )
          })}
          {donut && (centerLabel || centerValue) && (
            <g aria-hidden="true">
              {centerValue && (
                <text className={styles.centerValue} x={cx} y={cy - 4}>
                  {centerValue}
                </text>
              )}
              {centerLabel && (
                <text className={styles.centerLabel} x={cx} y={cy + 16}>
                  {centerLabel}
                </text>
              )}
            </g>
          )}
        </Fragment>
      }
    />
  )
})
