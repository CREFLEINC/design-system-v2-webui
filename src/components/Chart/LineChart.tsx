import { forwardRef, Fragment } from 'react'
import { cx } from '../../utils/cx'
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  PADDING,
  POINT_RADIUS,
  DEFAULT_Y_TICKS,
  REF_LINE_WIDTH,
  REF_DASH,
  defaultFormatValue,
  resolveDomain,
  xToPx,
  yToPx,
  summarize,
  summarizeReferenceLines,
  buildSrRows,
  buildLegendItems,
  seriesClassIndex,
  seriesColorStyle,
  type ChartBaseProps,
  type ChartSeries,
  type ReferenceLine,
} from './Chart.shared'
import { ChartFrame, SrDataTable } from './ChartFrame'
import styles from './Chart.module.css'

export interface CartesianSharedProps extends ChartBaseProps {
  series: ChartSeries[]
  /** y 도메인. 미지정 시 auto: bar는 [0, dataMax], line은 [min(0,dataMin), dataMax]. */
  min?: number
  max?: number
  yTicks?: number
  showGrid?: boolean
}

export interface LineChartProps extends CartesianSharedProps {
  /** 폴리라인 아래 반투명 채움 */
  area?: boolean
  /** 각 포인트에 원 마커 */
  showPoints?: boolean
  /** 축 고정 기준선. axis:'x'의 value는 0-based 카테고리 인덱스(소수 허용). */
  referenceLines?: ReferenceLine[]
}

export const LineChart = forwardRef<HTMLElement, LineChartProps>(function LineChart(
  {
    title,
    caption,
    ariaLabel,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    showLegend,
    showTable = true,
    formatValue = defaultFormatValue,
    series,
    min,
    max,
    yTicks = DEFAULT_Y_TICKS,
    showGrid = true,
    area = false,
    showPoints = false,
    referenceLines,
    className,
    ...rest
  },
  ref
) {
  const resolvedShowLegend = showLegend ?? series.length > 1
  const domain = resolveDomain(series, 'line', min, max)

  const plotLeft = PADDING.left
  const plotRight = width - PADDING.right
  const plotTop = PADDING.top
  const plotBottom = height - PADDING.bottom
  const plotW = plotRight - plotLeft
  const plotH = plotBottom - plotTop

  const n = Math.max(1, ...series.map((s) => s.data.length))
  const categoryLabels = Array.from({ length: n }, (_, i) => series[0]?.data[i]?.label ?? '')

  const gridLines = Array.from({ length: yTicks }, (_, t) => {
    const value = domain.min + ((domain.max - domain.min) * t) / Math.max(1, yTicks - 1)
    const y = yToPx(value, domain, plotTop, plotBottom)
    return { value, y }
  })

  const visibleReferenceLines = (referenceLines ?? []).filter((rl) =>
    (rl.axis ?? 'y') === 'x'
      ? rl.value >= 0 && rl.value <= n - 1
      : rl.value >= domain.min && rl.value <= domain.max
  )

  const ariaLabelResolved =
    ariaLabel ??
    [summarize(series, formatValue, title), summarizeReferenceLines(visibleReferenceLines, formatValue)]
      .filter(Boolean)
      .join(' ')
  const legendItems = buildLegendItems(series)
  const srRows = buildSrRows(series, formatValue)

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
        <SrDataTable
          title={title}
          categoryHeader="구간"
          seriesNames={series.map((s) => s.name)}
          rows={srRows}
        />
      }
      svgChildren={
        <Fragment>
          {showGrid && (
            <g aria-hidden="true">
              {gridLines.map((g, i) => (
                <Fragment key={i}>
                  <line
                    className={styles.gridLine}
                    x1={plotLeft}
                    y1={g.y}
                    x2={plotRight}
                    y2={g.y}
                    strokeWidth={1}
                  />
                  <text className={styles.tickText} x={plotLeft - 8} y={g.y} dy="0.32em">
                    {formatValue(g.value)}
                  </text>
                </Fragment>
              ))}
              <line
                className={styles.axisLine}
                x1={plotLeft}
                y1={plotBottom}
                x2={plotRight}
                y2={plotBottom}
                strokeWidth={1}
              />
              {categoryLabels.map((label, i) => (
                <text
                  key={i}
                  className={styles.axisText}
                  x={xToPx(i, n, plotLeft, plotW)}
                  y={plotBottom + 20}
                >
                  {label}
                </text>
              ))}
            </g>
          )}

          {series.map((s, si) => {
            const classIndex = seriesClassIndex(si)
            const colorStyle = seriesColorStyle(s.color)
            const points = s.data.map((p, i) => ({
              x: xToPx(i, n, plotLeft, plotW),
              y: yToPx(p.value, domain, plotTop, plotBottom),
              p,
            }))
            const pointsAttr = points.map((pt) => `${pt.x},${pt.y}`).join(' ')
            const areaD =
              points.length > 0
                ? `M ${points[0].x},${plotBottom} ` +
                  points.map((pt) => `L ${pt.x},${pt.y}`).join(' ') +
                  ` L ${points[points.length - 1].x},${plotBottom} Z`
                : ''

            return (
              <g key={s.name} className={styles['s' + classIndex]} style={colorStyle}>
                {area && <path className={styles.area} d={areaD} />}
                <polyline
                  className={styles.line}
                  points={pointsAttr}
                  pathLength={100}
                  strokeWidth={2}
                  fill="none"
                />
                {showPoints &&
                  points.map((pt, i) => (
                    <circle
                      key={i}
                      className={styles.point}
                      data-chart-point
                      data-label={pt.p.label}
                      data-value={pt.p.value}
                      cx={pt.x}
                      cy={pt.y}
                      r={POINT_RADIUS}
                    />
                  ))}
              </g>
            )
          })}

          {visibleReferenceLines.length > 0 && (
            <g aria-hidden="true">
              {visibleReferenceLines.map((rl, i) => {
                const axis = rl.axis ?? 'y'
                const tone = rl.tone ?? 'neutral'
                const dashed = (rl.style ?? 'dashed') !== 'solid'
                if (axis === 'x') {
                  const x = xToPx(rl.value, n, plotLeft, plotW)
                  return (
                    <g key={i} className={styles['ref-' + tone]}>
                      <line
                        className={styles.refLine}
                        data-chart-refline
                        data-axis="x"
                        data-value={rl.value}
                        x1={x}
                        x2={x}
                        y1={plotTop}
                        y2={plotBottom}
                        strokeWidth={REF_LINE_WIDTH}
                        {...(dashed ? { strokeDasharray: REF_DASH } : {})}
                      />
                      {rl.label && (
                        <text className={styles.refLabel} x={x + 4} y={plotTop + 12} textAnchor="start">
                          {rl.label}
                        </text>
                      )}
                    </g>
                  )
                }
                const y = yToPx(rl.value, domain, plotTop, plotBottom)
                return (
                  <g key={i} className={styles['ref-' + tone]}>
                    <line
                      className={styles.refLine}
                      data-chart-refline
                      data-axis="y"
                      data-value={rl.value}
                      x1={plotLeft}
                      x2={plotRight}
                      y1={y}
                      y2={y}
                      strokeWidth={REF_LINE_WIDTH}
                      {...(dashed ? { strokeDasharray: REF_DASH } : {})}
                    />
                    {rl.label && (
                      <text className={styles.refLabel} x={plotRight} y={y - 4} textAnchor="end">
                        {rl.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )}
        </Fragment>
      }
    />
  )
})
