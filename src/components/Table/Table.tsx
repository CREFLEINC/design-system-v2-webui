import {
  forwardRef,
  useId,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { cx } from '../../utils/cx'
import { Checkbox } from '../Checkbox/Checkbox'
import styles from './Table.module.css'

export type ColumnAlign = 'start' | 'center' | 'end' // 'end' = 우측정렬(수치)
export type SortDirection = 'ascending' | 'descending' // aria-sort 값과 1:1
export type TableDensity = 'comfortable' | 'compact'

export interface SortState {
  key: string
  direction: SortDirection
}

export interface SummaryCell {
  /** 셀 식별자 (React key) */
  key: string
  /** 셀 내용 */
  content: ReactNode
  /** 병합할 데이터 열 수. 기본 1. selectable 선택 열은 세지 않는다 */
  colSpan?: number
  /** 셀 정렬. 기존 ColumnAlign 재사용 */
  align?: ColumnAlign
  /** 총계 등 강조 — 헤더와 같은 타이포 위계 적용 */
  emphasis?: boolean
}

export interface Column<T> {
  /** 안정적 식별자. th/td를 잇고 정렬 상태(SortState.key)가 참조한다 */
  key: string
  /** 헤더 셀 내용 (한국어 카피 등 ReactNode) */
  header: ReactNode
  /** 셀·헤더 정렬. 'end'면 수치 우측정렬. 기본 'start' */
  align?: ColumnAlign
  /** true면 정렬 가능 — 헤더가 button이 되고 aria-sort를 반영 */
  sortable?: boolean
  /** 셀 렌더러. 미지정 시 String((row as any)[key]) */
  render?: (row: T, rowIndex: number) => ReactNode
  /** 비제어 내부 정렬용 비교 키. 미지정 시 (row)=>(row as any)[key] */
  sortAccessor?: (row: T) => string | number
  /** 고정 열 너비 (예: '96px' | '20%'). colgroup에 반영 */
  width?: string
}

export interface TableProps<T> extends Omit<HTMLAttributes<HTMLTableElement>, 'children'> {
  /** 열 구성. 배열 순서가 곧 시각 순서 */
  columns: Column<T>[]
  /** 표시할 행 데이터 */
  rows: T[]
  /** 행 식별자 추출 (선택·React key). 미지정 시 인덱스 문자열 — 선택 안정성 위해 지정 권장 */
  getRowId?: (row: T, index: number) => string
  /** <caption> 접근성/설명 텍스트 */
  caption?: ReactNode
  /** 셀 패딩 밀도. 기본 'comfortable' */
  density?: TableDensity
  /** 짝수행 zebra 배경 on/off. 기본 true */
  zebra?: boolean
  // ----- 정렬 (Tabs value/defaultValue 패턴) -----
  /** 제어 정렬 상태. 지정 시 내부 상태·내부 재정렬을 쓰지 않음(행은 받은 순서대로) */
  sort?: SortState | null
  /** 비제어 초기 정렬 상태 */
  defaultSort?: SortState | null
  /** 정렬 토글 시 호출 (제어/비제어 공통). 다음 상태(또는 null=해제) 전달 */
  onSortChange?: (next: SortState | null) => void
  // ----- 행 선택 (controlled) -----
  /** true면 첫 열에 선택 체크박스 열을 렌더 */
  selectable?: boolean
  /** 선택된 행 id 집합 (controlled). selectable일 때 필수 */
  selectedIds?: readonly string[]
  /** 선택 변경 시 호출 — 다음 선택 id 배열 전달 */
  onSelectionChange?: (nextIds: string[]) => void
  /** 데이터 로딩 중/빈 상태에서 tbody 자리에 렌더할 노드 (rows.length===0일 때) */
  empty?: ReactNode
  /** 하단 요약/합계 행들 (소계+총계 등 다중 지원). tfoot으로 렌더되며 정렬 대상에서 제외 */
  summaryRows?: SummaryCell[][]
}

function alignAttr(align?: ColumnAlign): 'center' | 'end' | undefined {
  return align === 'center' || align === 'end' ? align : undefined
}

function SortIcon({ direction }: { direction?: SortDirection }) {
  return (
    <svg
      className={cx(
        styles.sortIcon,
        !direction && styles.sortIconIdle,
        direction === 'descending' && styles.sortIconDesc
      )}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 5l6 7H6l6-7z" />
    </svg>
  )
}

function TableInner<T>(
  {
    columns,
    rows,
    getRowId,
    caption,
    density = 'comfortable',
    zebra = true,
    sort,
    defaultSort = null,
    onSortChange,
    selectable = false,
    selectedIds,
    onSelectionChange,
    empty,
    summaryRows,
    className,
    ...rest
  }: TableProps<T>,
  ref: Ref<HTMLTableElement>
): ReactElement {
  const uid = useId()
  const headerId = (col: Column<T>) => `${uid}-col-${col.key}`
  const isControlled = sort !== undefined
  const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort)
  const activeSort = isControlled ? sort : internalSort

  const resolveRowId = (row: T, index: number) => (getRowId ? getRowId(row, index) : String(index))

  const toggleSort = (key: string) => {
    let next: SortState | null
    if (!activeSort || activeSort.key !== key) {
      next = { key, direction: 'ascending' }
    } else if (activeSort.direction === 'ascending') {
      next = { key, direction: 'descending' }
    } else {
      next = null
    }
    if (!isControlled) setInternalSort(next)
    onSortChange?.(next)
  }

  const sortedRows = (() => {
    if (isControlled || !activeSort) return rows
    const col = columns.find((c) => c.key === activeSort.key)
    if (!col) return rows
    const accessor = col.sortAccessor ?? ((row: T) => (row as Record<string, string | number>)[col.key])
    const dir = activeSort.direction === 'ascending' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  })()

  const selectedSet = new Set(selectedIds ?? [])
  const allIds = rows.map((r, i) => resolveRowId(r, i))
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id))
  const someSelected = allIds.some((id) => selectedSet.has(id))
  const indeterminate = someSelected && !allSelected

  const toggleAll = () => {
    onSelectionChange?.(allSelected ? [] : allIds)
  }

  const toggleRow = (id: string) => {
    const next = selectedSet.has(id)
      ? [...selectedSet].filter((existing) => existing !== id)
      : [...selectedSet, id]
    onSelectionChange?.(next)
  }

  const colCount = columns.length + (selectable ? 1 : 0)

  return (
    <div className={styles.scroll}>
      <table
        ref={ref}
        className={cx(styles.table, styles[density], zebra && styles.zebra, className)}
        {...rest}
      >
        {caption != null && <caption>{caption}</caption>}
        <colgroup>
          {selectable && <col className={styles.selectCell} />}
          {columns.map((col) => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className={styles.selectCell}>
                <Checkbox
                  aria-label="전체 선택"
                  checked={allSelected}
                  indeterminate={indeterminate}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((col) => {
              const isSorted = activeSort?.key === col.key
              const ariaSort = col.sortable ? (isSorted ? activeSort!.direction : 'none') : undefined
              return (
                <th
                  key={col.key}
                  id={headerId(col)}
                  scope="col"
                  data-align={alignAttr(col.align)}
                  aria-sort={ariaSort}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.header}
                      <SortIcon direction={isSorted ? activeSort!.direction : undefined} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className={styles.emptyCell}>
              <td colSpan={colCount}>{empty}</td>
            </tr>
          ) : (
            sortedRows.map((row, index) => {
              const id = resolveRowId(row, index)
              const isSelected = selectedSet.has(id)
              return (
                <tr key={id} data-selected={isSelected || undefined}>
                  {selectable && (
                    <td className={styles.selectCell}>
                      <Checkbox aria-label="행 선택" checked={isSelected} onChange={() => toggleRow(id)} />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} data-align={alignAttr(col.align)}>
                      {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key])}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
        {summaryRows && summaryRows.length > 0 && (
          <tfoot>
            {summaryRows.map((row, rowIndex) => {
              let c = 0
              return (
                <tr key={rowIndex}>
                  {selectable && <td className={styles.selectCell} />}
                  {row.map((cell) => {
                    const span = cell.colSpan ?? 1
                    const covered = columns.slice(c, c + span)
                    const headerIds = covered.map((col) => headerId(col)).join(' ')
                    c += span
                    return (
                      <td
                        key={cell.key}
                        colSpan={span > 1 ? span : undefined}
                        headers={headerIds || undefined}
                        data-align={alignAttr(cell.align)}
                        data-emphasis={cell.emphasis || undefined}
                      >
                        {cell.content}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tfoot>
        )}
      </table>
    </div>
  )
}

export const Table = forwardRef(TableInner) as <T>(
  props: TableProps<T> & { ref?: Ref<HTMLTableElement> }
) => ReactElement
