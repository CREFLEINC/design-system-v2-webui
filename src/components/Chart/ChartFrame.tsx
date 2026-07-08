import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { cx } from '../../utils/cx'
import type { LegendItem, SrTableRow } from './Chart.shared'
import styles from './Chart.module.css'

/**
 * 차트 공용 프레임 — <figure ref> → <figcaption>(title/caption) → <svg role="img"> 슬롯
 * → 범례(선택) → 시각적 숨김 데이터 테이블(선택).
 * 루트는 plain container이므로 "소비자가 이긴다": {...rest}를 먼저, className은 cx로 합성.
 * role="img"/aria-label은 내부 <svg>에 있어 rest의 영향을 받지 않는다.
 */
export interface ChartFrameProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: string
  caption?: string
  ariaLabel: string
  width: number
  height: number
  svgChildren: ReactNode
  showLegend: boolean
  legendItems: LegendItem[]
  showTable: boolean
  srTable?: ReactNode
}

export const ChartFrame = forwardRef<HTMLElement, ChartFrameProps>(function ChartFrame(
  {
    title,
    caption,
    ariaLabel,
    width,
    height,
    svgChildren,
    showLegend,
    legendItems,
    showTable,
    srTable,
    className,
    ...rest
  },
  ref
) {
  return (
    <figure {...rest} ref={ref as unknown as Ref<HTMLElement>} className={cx(styles.root, className)}>
      {(title || caption) && (
        <figcaption className={styles.figcaption}>
          {title && <span className={styles.title}>{title}</span>}
          {caption && <span className={styles.caption}>{caption}</span>}
        </figcaption>
      )}
      <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {svgChildren}
      </svg>
      {showLegend && <Legend items={legendItems} />}
      {showTable && srTable}
    </figure>
  )
})

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className={styles.legend} aria-label="범례">
      {items.map((item) => (
        <li key={item.name} className={styles.legendItem}>
          <span
            className={cx(styles.swatch, styles['s' + item.classIndex])}
            style={item.colorStyle}
            aria-hidden="true"
          />
          <span className={styles.legendText}>{item.name}</span>
        </li>
      ))}
    </ul>
  )
}

export interface SrDataTableProps {
  title?: string
  categoryHeader: string
  seriesNames: string[]
  rows: SrTableRow[]
}

/** display:none 대신 srOnly(클립)로 숨겨 접근성 트리에는 유지되는 데이터 대체 테이블. */
export function SrDataTable({ title, categoryHeader, seriesNames, rows }: SrDataTableProps) {
  return (
    <table className={styles.srOnly}>
      {title && <caption>{title}</caption>}
      <thead>
        <tr>
          <th scope="col">{categoryHeader}</th>
          {seriesNames.map((name) => (
            <th scope="col" key={name}>
              {name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            {row.values.map((v, i) => (
              <td key={i}>{v}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
