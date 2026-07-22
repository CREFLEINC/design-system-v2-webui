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
  // ----- 행 그룹 (row group header) -----
  /** 행의 그룹 키 추출. 지정 시 그룹 헤더 행이 삽입되고 내부 정렬이 그룹 내부로 제한된다 */
  groupBy?: (row: T) => string
  /** 그룹 헤더 셀 내용. groupRows는 렌더 순서의 그룹 행들. 미지정 시 groupKey 텍스트 */
  renderGroupHeader?: (groupKey: string, groupRows: readonly T[]) => ReactNode
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
    groupBy,
    renderGroupHeader,
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

  // 비제어 + activeSort일 때만 내부 재정렬. 그룹핑 시 각 그룹 배열에 개별 적용된다
  const sortWithin = (list: T[]): T[] => {
    if (isControlled || !activeSort) return list
    const col = columns.find((c) => c.key === activeSort.key)
    if (!col) return list
    const accessor = col.sortAccessor ?? ((row: T) => (row as Record<string, string | number>)[col.key])
    const dir = activeSort.direction === 'ascending' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }

  // 파티셔닝(그룹 우선) 후 그룹 내 정렬. key=null은 그룹핑 미사용(헤더 없는 단일 tbody)
  const groups: { key: string | null; rows: T[] }[] = groupBy
    ? (() => {
        const clusters = new Map<string, T[]>()
        for (const row of rows) {
          const k = groupBy(row)
          const bucket = clusters.get(k)
          if (bucket) bucket.push(row)
          else clusters.set(k, [row])
        }
        return [...clusters].map(([key, groupRows]) => ({ key, rows: sortWithin(groupRows) }))
      })()
    : [{ key: null, rows: sortWithin(rows) }]

  // 평탄화 누적 인덱스(그룹 헤더 제외) — col.render/getRowId의 index 계약 유지
  let flatOffset = 0
  const groupOffsets = groups.map((g) => {
    const start = flatOffset
    flatOffset += g.rows.length
    return start
  })

  // zebra 패리티: 그룹 내 1-기준 홀=odd/짝=even (미그룹 시 전체 기준 — 기존 nth-child(even)와 동일)
  const parityOf = (positionInGroup: number): 'odd' | 'even' =>
    positionInGroup % 2 === 0 ? 'odd' : 'even'

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

  const renderDataRow = (row: T, index: number, parity: 'odd' | 'even') => {
    const id = resolveRowId(row, index)
    const isSelected = selectedSet.has(id)
    return (
      <tr key={id} data-selected={isSelected || undefined} data-parity={parity}>
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
  }

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
        {rows.length === 0 ? (
          <tbody>
            <tr className={styles.emptyCell}>
              <td colSpan={colCount}>{empty}</td>
            </tr>
          </tbody>
        ) : (
          groups.map(({ key, rows: groupRows }, gi) => (
            <tbody key={key ?? 'rows'}>
              {key !== null && (
                <tr data-group-header="true">
                  <th scope="rowgroup" colSpan={colCount}>
                    {renderGroupHeader ? renderGroupHeader(key, groupRows) : key}
                  </th>
                </tr>
              )}
              {groupRows.map((row, posInGroup) =>
                renderDataRow(row, groupOffsets[gi] + posInGroup, parityOf(posInGroup))
              )}
            </tbody>
          ))
        )}
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
