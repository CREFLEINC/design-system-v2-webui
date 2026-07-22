import {
  forwardRef,
  useId,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { cx } from '../../utils/cx'
import styles from './MatrixGrid.module.css'

/** 셀 상태 — 밀집 매트릭스의 상태색 축. 'none'은 채움 없음 */
export type MatrixStatus = 'success' | 'error' | 'warning' | 'info' | 'idle' | 'none'
/** 셀 밀도·타이포 크기 */
export type MatrixGridSize = 'sm' | 'md'

export interface MatrixColumn {
  /** 안정적 식별자. th/td 연결(headers)과 React key에 쓰인다 */
  key: string
  /** 열 헤더 라벨 (예: 날짜·주차 등 ReactNode) */
  label: ReactNode
  /** 관통 강조 열 (예: 오늘) — 헤더~본문~요약행을 세로로 강조 */
  highlight?: boolean
}

export interface MatrixCell {
  /** 셀 식별자 (React key) */
  key: string
  /** 셀 내용. 없으면 status 단색 채움(밀집 룩) */
  content?: ReactNode
  /** 셀 상태색. 미지정/'none'이면 채움 없음 */
  status?: MatrixStatus
  /** 가로 병합 열 수. 기본 1 */
  colSpan?: number
  /** 세로 병합 행 수. 기본 1 */
  rowSpan?: number
  /** 셀 aria-label 명시. 미지정 + status-only 셀은 자동 조합(행 라벨·열 라벨·상태명) */
  ariaLabel?: string
}

export interface MatrixRow {
  /** 좌측 sticky 행 라벨 (th scope="row") */
  label: ReactNode
  /** 좌→우 배치 셀. colSpan/rowSpan은 점유 매트릭스로 해석 */
  cells: MatrixCell[]
}

export interface MatrixGroupHeader {
  /** 그룹 밴드 라벨 */
  label: ReactNode
  /** 덮는 데이터 열 수 */
  span: number
}

export interface MatrixGridProps extends Omit<HTMLAttributes<HTMLTableElement>, 'children'> {
  /** 열 구성. 배열 순서 = 시각 순서 */
  columns: MatrixColumn[]
  /** 행 구성. 각 행의 cells가 좌→우로 배치된다 */
  rows: MatrixRow[]
  /** 상단 그룹 밴드. span 합 ≠ columns 길이면 개발 경고 */
  groupHeaders?: MatrixGroupHeader[]
  /** 하단 요약행 (tfoot). 본문과 시각적으로 구분해 렌더 */
  summaryRow?: { label: ReactNode; cells: MatrixCell[] }
  /** 셀 렌더러. 미지정 시 cell.content (없으면 status 단색 채움) */
  renderCell?: (cell: MatrixCell, row: MatrixRow, col: MatrixColumn) => ReactNode
  /** 셀 드릴다운. 제공 시 본문 셀이 포커서블 + Enter/Space 활성화 */
  onCellClick?: (row: MatrixRow, col: MatrixColumn, cell: MatrixCell) => void
  /** 셀 밀도·타이포 크기. 기본 'md' */
  size?: MatrixGridSize
}

// 상태를 색만이 아니라 텍스트로도 노출한다(접근성). status-only 셀 자동 aria-label에 쓰인다.
const STATUS_LABELS: Record<Exclude<MatrixStatus, 'none'>, string> = {
  success: '정상',
  error: '이상',
  warning: '주의',
  info: '정보',
  idle: '대기',
}

const clampSpan = (n?: number): number => Math.max(1, Math.floor(n ?? 1))

const effectiveStatus = (s?: MatrixStatus): Exclude<MatrixStatus, 'none'> | undefined =>
  s && s !== 'none' ? s : undefined

interface PlacedCell {
  cell: MatrixCell
  /** 확정된 시작 열 인덱스 */
  start: number
  colSpan: number
  rowSpan: number
}

/**
 * 점유 매트릭스로 한 행의 셀 시작 열을 확정한다.
 * `pending[j]` = 위 행 rowSpan이 j열을 아직 점유하는 남은 행 수(현재 행 포함).
 * 이 함수는 pending을 (현재 행 소비만큼) 감소시켜 다음 행 호출로 이어진다.
 */
function placeCells(
  cells: MatrixCell[],
  pending: number[],
  ncols: number
): { placed: PlacedCell[]; coveredCount: number; overflow: boolean } {
  const occupied = pending.map((p) => p > 0) // 위 행 rowSpan 이월분은 이 행을 점유
  let colIndex = 0
  const placed: PlacedCell[] = cells.map((cell) => {
    while (colIndex < ncols && pending[colIndex] > 0) colIndex++
    const start = colIndex
    const colSpan = clampSpan(cell.colSpan)
    const rowSpan = clampSpan(cell.rowSpan)
    for (let j = start; j < start + colSpan && j < ncols; j++) {
      occupied[j] = true
      pending[j] = Math.max(pending[j], rowSpan)
    }
    colIndex = start + colSpan
    return { cell, start, colSpan, rowSpan }
  })
  const overflow = colIndex > ncols
  const coveredCount = occupied.filter(Boolean).length
  // 현재 행을 소비했으니 이월분을 1 감소 — 다음 행 호출에 반영
  for (let j = 0; j < ncols; j++) if (pending[j] > 0) pending[j]--
  return { placed, coveredCount, overflow }
}

// forwardRef 대상 = <table>. role="grid"·aria 는 컴포넌트 소유 —
// {...rest} 를 먼저 스프레드하고 role 을 뒤에 둬 소비자 override 를 막는다(Select 관례).
export const MatrixGrid = forwardRef<HTMLTableElement, MatrixGridProps>(function MatrixGrid(
  props,
  ref
) {
  const {
    columns,
    rows,
    groupHeaders,
    summaryRow,
    renderCell,
    onCellClick,
    size = 'md',
    className,
    ...rest
  } = props
  const uid = useId()
  const ncols = columns.length
  const colHeaderId = (key: string) => `${uid}-col-${key}`
  const clickable = onCellClick != null

  const handleActivate = (
    e: ReactKeyboardEvent<HTMLTableCellElement>,
    row: MatrixRow,
    col: MatrixColumn,
    cell: MatrixCell
  ) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      onCellClick?.(row, col, cell)
    }
  }

  // 셀 공통 DOM 계약(data-status·data-tone·data-highlight·headers·aria-label) 계산.
  const computeCommon = (
    placed: PlacedCell,
    content: ReactNode,
    rowLabel: ReactNode,
    col: MatrixColumn | undefined
  ) => {
    const { cell, start, colSpan } = placed
    const status = effectiveStatus(cell.status)
    const hasContent = content != null && content !== false && content !== ''
    // 2단계 톤(가정 2): 내용 없는 status 셀 → 진한 톤(solid), 내용 있는 셀 → 연한 컨테이너 톤
    const tone = status ? (hasContent ? 'container' : 'solid') : undefined
    const covered = columns.slice(start, start + colSpan)
    const highlight = covered.some((c) => c?.highlight) || undefined
    const headerIds = covered
      .map((c) => (c ? colHeaderId(c.key) : ''))
      .filter(Boolean)
      .join(' ')
    let ariaLabel = cell.ariaLabel
    if (!ariaLabel && status && !hasContent) {
      const parts: string[] = []
      if (typeof rowLabel === 'string') parts.push(rowLabel)
      if (col && typeof col.label === 'string') parts.push(col.label)
      parts.push(STATUS_LABELS[status])
      ariaLabel = parts.join(' · ')
    }
    return { status, tone, highlight, headerIds, ariaLabel }
  }

  // ---- 본문 배치 (점유 매트릭스는 행 간 공유) ----
  const pending = new Array<number>(ncols).fill(0)
  const bodyRows = rows.map((row, rowIndex) => {
    const { placed, coveredCount, overflow } = placeCells(row.cells, pending, ncols)
    if (import.meta.env.DEV && (coveredCount !== ncols || overflow)) {
      console.warn(
        `[MatrixGrid] row ${rowIndex}: 셀 커버리지(${coveredCount}) ≠ columns(${ncols}). colSpan/rowSpan 합을 확인하세요.`
      )
    }
    return { row, placed }
  })

  // ---- 요약행 배치 (본문과 독립된 단일 행 점유) ----
  const summaryPlaced = summaryRow
    ? placeCells(summaryRow.cells, new Array<number>(ncols).fill(0), ncols).placed
    : null

  // ---- 그룹 헤더 오프셋 + span 정합 경고 ----
  let groupCells: { header: MatrixGroupHeader; span: number; highlight: boolean }[] | null = null
  if (groupHeaders && groupHeaders.length > 0) {
    let offset = 0
    groupCells = groupHeaders.map((header) => {
      const span = clampSpan(header.span)
      const highlight = columns.slice(offset, offset + span).some((c) => c?.highlight)
      offset += span
      return { header, span, highlight }
    })
    if (import.meta.env.DEV && offset !== ncols) {
      console.warn(
        `[MatrixGrid] groupHeaders span 합(${offset}) ≠ columns(${ncols}).`
      )
    }
  }

  return (
    <div className={styles.scroll}>
      <table
        ref={ref}
        className={cx(styles.table, styles[size], className)}
        {...rest}
        role="grid"
      >
        <colgroup>
          <col className={styles.labelCol} />
          {columns.map((col) => (
            <col key={col.key} className={styles.dataCol} />
          ))}
        </colgroup>
        <thead>
          {groupCells && (
            <tr>
              <th className={cx(styles.labelCell, styles.corner)} rowSpan={2} />
              {groupCells.map((g, i) => (
                <th
                  key={i}
                  scope="colgroup"
                  className={styles.groupHeader}
                  colSpan={g.span > 1 ? g.span : undefined}
                  data-highlight={g.highlight || undefined}
                >
                  {g.header.label}
                </th>
              ))}
            </tr>
          )}
          <tr>
            {!groupCells && <th className={cx(styles.labelCell, styles.corner)} />}
            {columns.map((col) => (
              <th
                key={col.key}
                id={colHeaderId(col.key)}
                scope="col"
                className={styles.colHeader}
                data-highlight={col.highlight || undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map(({ row, placed }, rowIndex) => (
            <tr key={rowIndex}>
              <th scope="row" className={styles.labelCell}>
                {row.label}
              </th>
              {placed.map((p) => {
                const col = columns[p.start]
                const content = renderCell ? renderCell(p.cell, row, col) : p.cell.content
                const { status, tone, highlight, headerIds, ariaLabel } = computeCommon(
                  p,
                  content,
                  row.label,
                  col
                )
                return (
                  <td
                    key={p.cell.key}
                    className={styles.cell}
                    colSpan={p.colSpan > 1 ? p.colSpan : undefined}
                    rowSpan={p.rowSpan > 1 ? p.rowSpan : undefined}
                    headers={headerIds || undefined}
                    aria-label={ariaLabel}
                    data-status={status}
                    data-tone={tone}
                    data-highlight={highlight}
                    data-clickable={clickable || undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? () => onCellClick?.(row, col, p.cell) : undefined}
                    onKeyDown={
                      clickable ? (e) => handleActivate(e, row, col, p.cell) : undefined
                    }
                  >
                    {content}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        {summaryRow && summaryPlaced && (
          <tfoot>
            <tr>
              <th scope="row" className={cx(styles.labelCell, styles.summaryLabel)}>
                {summaryRow.label}
              </th>
              {summaryPlaced.map((p) => {
                const col = columns[p.start]
                const content = p.cell.content
                const { status, tone, highlight, headerIds, ariaLabel } = computeCommon(
                  p,
                  content,
                  summaryRow.label,
                  col
                )
                return (
                  <td
                    key={p.cell.key}
                    className={cx(styles.cell, styles.summaryCell)}
                    colSpan={p.colSpan > 1 ? p.colSpan : undefined}
                    headers={headerIds || undefined}
                    aria-label={ariaLabel}
                    data-status={status}
                    data-tone={tone}
                    data-highlight={highlight}
                  >
                    {content}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
})
