import { forwardRef, Fragment } from 'react'
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  PADDING,
  BAR_GROUP_GAP_RATIO,
  DEFAULT_Y_TICKS,
  defaultFormatValue,
  resolveDomain,
  xToPx,
  yToPx,
  summarize,
  buildSrRows,
  buildLegendItems,
  seriesClassIndex,
  seriesColorStyle,
} from './Chart.shared'
import type { CartesianSharedProps } from './LineChart'
import { ChartFrame, SrDataTable } from './ChartFrame'
import styles from './Chart.module.css'

export interface BarChartProps extends CartesianSharedProps {
  /** 기본 false = grouped(다중 시리즈 나란히). true면 stacked(누적). */
  stacked?: boolean
}

export const BarChart = forwardRef<HTMLElement, BarChartProps>(function BarChart(
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
    stacked = false,
    className,
    ...rest
  },
  ref
) {
  const resolvedShowLegend = showLegend ?? series.length > 1
  const domain = resolveDomain(series, 'bar', min, max)

  const plotLeft = PADDING.left
  const plotRight = width - PADDING.right
  const plotTop = PADDING.top
  const plotBottom = height - PADDING.bottom
  const plotW = plotRight - plotLeft
  const plotH = plotBottom - plotTop

  const n = Math.max(1, ...series.map((s) => s.data.length))
  const categoryLabels = Array.from({ length: n }, (_, i) => series[0]?.data[i]?.label ?? '')
  const seriesCount = Math.max(1, series.length)

  const gridLines = Array.from({ length: yTicks }, (_, t) => {
    const value = domain.min + ((domain.max - domain.min) * t) / Math.max(1, yTicks - 1)
    const y = yToPx(value, domain, plotTop, plotBottom)
    return { value, y }
  })

  const ariaLabelResolved = ariaLabel ?? summarize(series, formatValue, title)
  const legendItems = buildLegendItems(series)
  const srRows = buildSrRows(series, formatValue)

  const band = plotW / n
  const groupWidth = band * BAR_GROUP_GAP_RATIO
  const barWidth = stacked ? groupWidth : groupWidth / seriesCount

  const heightFor = (v: number) => Math.max(0, (plotH * (v - domain.min)) / (domain.max - domain.min))

  // stacked 누적 오프셋(카테고리별)
  const stackOffsets = Array.from({ length: n }, () => 0)

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
                  x={plotLeft + i * band + band / 2}
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
            return (
              <g key={s.name} className={styles['s' + classIndex]} style={colorStyle}>
                {s.data.map((p, i) => {
                  const h = heightFor(p.value)
                  const groupX = plotLeft + i * band + (band - groupWidth) / 2
                  const x = stacked ? groupX : groupX + si * barWidth
                  let y: number
                  if (stacked) {
                    y = plotBottom - stackOffsets[i] - h
                    stackOffsets[i] += h
                  } else {
                    y = plotBottom - h
                  }
                  return (
                    <rect
                      key={i}
                      className={styles.bar}
                      data-chart-bar
                      data-label={p.label}
                      data-value={p.value}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={h}
                    />
                  )
                })}
              </g>
            )
          })}
        </Fragment>
      }
    />
  )
})
