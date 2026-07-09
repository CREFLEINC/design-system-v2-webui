# Phase 3 Component Spec — Table

- Directory: `src/components/Table/`
- Reuses: Checkbox (header select-all with indeterminate + per-row select — imported from ../Checkbox/Checkbox)

## Exports
```ts
export { Table } from './components/Table/Table'
export type { TableProps, Column, ColumnAlign, SortState, SortDirection, TableDensity } from './components/Table/Table'
```

## Props interface
```tsx
export type ColumnAlign = 'start' | 'center' | 'end' // 'end' = 우측정렬(수치)
export type SortDirection = 'ascending' | 'descending' // aria-sort 값과 1:1
export type TableDensity = 'comfortable' | 'compact'
export interface SortState { key: string; direction: SortDirection }

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
}
```

## Variants & API
DENSITY: comfortable(기본, --space-3 세로 패딩) / compact(--space-2). 클래스 styles[density]로 td/th 패딩만 스왑.

SORT (Tabs의 value/defaultValue/onChange 패턴 재사용): sort(제어) | defaultSort(비제어 초기) | onSortChange. 정렬 가능 헤더는 <button>을 품은 th이며 클릭·Enter·Space로 토글. 토글 사이클은 3-상태: 미정렬 → ascending → descending → 미정렬(null). 활성 정렬 열의 th에 aria-sort='ascending'|'descending', 그 외 정렬가능 열은 aria-sort='none', 정렬 불가 열은 aria-sort 미부착. 비제어(sort 미지정) 모드에서는 내부 상태로 rows를 column.sortAccessor(기본 row[key])로 실제 재정렬한다. 제어 모드(sort 지정)에서는 상태만 반영하고 재정렬은 소비자 책임(headless). isControlled 판별: sort !== undefined.

SELECTION (controlled, Checkbox 재사용): selectable + selectedIds + onSelectionChange. 헤더 select-all Checkbox는 selectedIds 길이로 checked(전체)/indeterminate(부분)/unchecked(0) 파생 — Checkbox의 네이티브 indeterminate('mixed' 보고) 그대로 활용. 토글 시 전체 id 배열 또는 [] 전달. 행별 Checkbox는 getRowId(row)로 id 계산, checked=selectedIds.includes(id), 토글 시 add/remove한 새 배열 전달. 정렬로 순서가 바뀌어도 id 기반이라 선택 안정적.

RENDERING: 네이티브 시맨틱 <table><caption><colgroup><thead><tr><th scope='col'><tbody><tr><td>. 첫 열(selectable)은 th/td에 별도 select 셀. sticky 헤더는 thead th position:sticky top:0. render 함수 우선, 없으면 String(row[key]).

REST/ARIA 순서(관례): 커스텀 위젯 아님 — 네이티브 table이므로 기본 규칙('소비자가 이긴다') 적용. <table {...rest} className={cx(...)} > 로 rest 먼저·className 합성. 정렬 헤더의 onClick 등 내부 핸들러는 컴포넌트 소유라 rest와 충돌 없음(rest는 table 루트에만). forwardRef는 <table>을 가리킨다 — 제네릭 forwardRef는 `const Table = forwardRef(TableInner) as <T>(p: TableProps<T> & { ref?: Ref<HTMLTableElement> }) => ReactElement` 캐스팅으로 제네릭 보존.

## Accessibility
role=table는 네이티브 <table>로 암묵 부여 — 명시 role 불필요. <caption>으로 표 이름 제공(또는 aria-label via rest). 헤더 셀 th scope='col', (선택 열 포함) 모든 데이터 헤더에 scope. 정렬: 정렬가능 th에 aria-sort='none'|'ascending'|'descending'(활성 1개만 방향값, 나머지 'none'), 정렬 불가 th는 aria-sort 없음. 정렬 트리거는 실제 <button type=button>(th 내부)이라 Enter/Space·focus-visible 링·접근성 이름 네이티브 확보 — div+role 대신 버튼 사용. 버튼 접근성 이름은 헤더 텍스트, 현재 방향은 aria-sort가 컬럼헤더에서 전달(중복 aria-label 금지). 선택 체크박스: 헤더 select-all은 aria-label='전체 선택', 행 체크박스는 aria-label='행 선택'(또는 소비자가 caption/행 텍스트로 aria-labelledby 지정 가능 훅은 후순위). Checkbox의 네이티브 indeterminate가 AT에 'mixed' 보고. 대비: 헤더/본문 텍스트 on-surface·on-surface-variant(AA), zebra/hover/selected 배경 위에서도 on-surface 유지(primary-container 위 on-surface AA 확인됨). 포커스는 정렬 버튼·체크박스 각각 --focus-ring. 키보드: 셀 그리드 로빙은 role=grid가 아닌 정적 표이므로 미도입(표는 탭 순서로 버튼/체크박스 순회) — role=table 유지가 이벤트 로그/장비 목록 읽기용도에 적합.

## CSS notes
토큰 전용, px는 0/1/2만. 
루트 .table { width:100%; border-collapse:separate; border-spacing:0; font:var(--type-body-sm); color:var(--on-surface); background:var(--surface); } 셀 하단 보더는 border-collapse:separate 이므로 td/th에 border-bottom:1px solid var(--outline-variant).
Sticky 헤더: .table thead th { position:sticky; top:0; z-index:1; background:var(--surface-container); color:var(--on-surface-variant); font:var(--type-label-lg); text-align:left; }
Density 패딩: .comfortable td, .comfortable th { padding:var(--space-3) var(--space-4) } / .compact td,.compact th { padding:var(--space-2) var(--space-3) }.
정렬: 헤더 정렬 버튼 .sortButton { display:inline-flex; align-items:center; gap:var(--space-1); background:transparent; border:0; font:inherit; color:inherit; cursor:pointer; outline:none } .sortButton:focus-visible { box-shadow:var(--focus-ring) }. 정렬 방향 화살표는 SVG(자체, 런타임 의존성 0) — 미정렬 시 opacity 낮춤, asc/desc는 transform 회전 or 두 path. transition은 transform/opacity만, reduced-motion에서 none.
정렬(우측): [data-align='end'] { text-align:right } (수치), 'center' 대응 클래스. th도 동일 정렬.
Zebra/hover/선택 — tr 배경 렌더 quirks 회피 위해 셀(td) 배경으로 적용, source order로 우선순위 제어:
 1) 기본 투명(surface),
 2) .zebra tbody tr:nth-child(even) td { background:var(--surface-container-low) },
 3) tbody tr:hover td { background:var(--surface-container-high) } (양 parity hover 우선),
 4) tr[data-selected='true'] td { background:var(--primary-container) } (zebra·hover 이김; on-surface 텍스트 AA 확인). 
배경 전이는 .table td { transition:background var(--motion-fast) var(--ease-standard) }.
선택 열 폭 축소: .selectCell { width:var(--space-9) } 정도, 체크박스 중앙정렬.
빈 상태: .emptyCell td colSpan=전체, padding 넉넉(var(--space-8)), color:var(--on-surface-muted), text-align:center.
가로 스크롤: 루트를 .scroll { overflow-x:auto } 래퍼로 감싸 넓은 표가 바디를 밀지 않게(아티팩트 규칙과 동일 원칙, 실제 앱에서도 안전).
파일 하단 단일 @media (prefers-reduced-motion: reduce) 블록: .table td, .sortIcon { transition:none } — ::before/::after 별도 정의 없음(상태레이어 오버레이 미사용, 배경 직접 전이만)이라 유사요소 나열 불필요하나, 만약 정렬 아이콘 회전 transition을 pseudo로 옮기면 그 셀렉터도 명시.

## New tokens needed
- none

## Acceptance tests
### caption·컬럼헤더·행을 렌더하고 role=table을 노출한다
```tsx
test('caption·컬럼헤더·행을 렌더한다', () => {
  render(
    <Table
      caption="설비 목록"
      getRowId={(r) => r.id}
      columns={[
        { key: 'name', header: '장비명' },
        { key: 'status', header: '상태' }
      ]}
      rows={[
        { id: 'a', name: '가압기', status: '정상' },
        { id: 'b', name: '냉각기', status: '점검' }
      ]}
    />
  )
  expect(screen.getByRole('table', { name: '설비 목록' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: '장비명' })).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: '가압기' })).toBeInTheDocument()
  expect(screen.getAllByRole('row')).toHaveLength(3) // 헤더 1 + 본문 2
})
```
### 정렬 가능 헤더 클릭이 aria-sort를 none→ascending→descending으로 토글하고 비제어에서 행을 재정렬한다
```tsx
test('정렬 클릭이 aria-sort 3-상태를 토글하고 행을 재정렬한다', async () => {
  const user = userEvent.setup()
  const bodyNames = () =>
    screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent)
  render(
    <Table
      getRowId={(r) => r.id}
      columns={[
        { key: 'name', header: '장비명', sortable: true },
        { key: 'temp', header: '온도', align: 'end', sortable: true, render: (r) => `${r.temp}°C` }
      ]}
      rows={[
        { id: 'a', name: '가압기', temp: 40 },
        { id: 'b', name: '냉각기', temp: 12 },
        { id: 'c', name: '펌프', temp: 25 }
      ]}
    />
  )
  const tempHeader = screen.getByRole('columnheader', { name: /온도/ })
  expect(tempHeader).toHaveAttribute('aria-sort', 'none')
  expect(bodyNames()).toEqual(['가압기', '냉각기', '펌프'])

  await user.click(screen.getByRole('button', { name: /온도/ }))
  expect(tempHeader).toHaveAttribute('aria-sort', 'ascending')
  expect(bodyNames()).toEqual(['냉각기', '펌프', '가압기']) // 12,25,40

  await user.click(screen.getByRole('button', { name: /온도/ }))
  expect(tempHeader).toHaveAttribute('aria-sort', 'descending')
  expect(bodyNames()).toEqual(['가압기', '펌프', '냉각기']) // 40,25,12

  await user.click(screen.getByRole('button', { name: /온도/ }))
  expect(tempHeader).toHaveAttribute('aria-sort', 'none')
  expect(bodyNames()).toEqual(['가압기', '냉각기', '펌프']) // 원래 순서 복귀
})
```
### 정렬 헤더가 버튼이라 Enter/Space 키보드로 토글되고 onSortChange가 호출된다
```tsx
test('Enter 키로 정렬이 토글되고 onSortChange가 다음 상태를 전달한다', async () => {
  const user = userEvent.setup()
  const onSortChange = vi.fn()
  render(
    <Table
      getRowId={(r) => r.id}
      onSortChange={onSortChange}
      columns={[{ key: 'name', header: '장비명', sortable: true }]}
      rows={[{ id: 'a', name: '가압기' }]}
    />
  )
  await user.tab() // 정렬 버튼으로 포커스
  expect(screen.getByRole('button', { name: /장비명/ })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', direction: 'ascending' })
  expect(screen.getByRole('columnheader', { name: /장비명/ })).toHaveAttribute('aria-sort', 'ascending')
})
```
### 정렬 불가 열은 버튼이 아니며 aria-sort를 갖지 않는다
```tsx
test('정렬 불가 열은 버튼·aria-sort가 없다', () => {
  render(
    <Table
      getRowId={(r) => r.id}
      columns={[{ key: 'status', header: '상태' }]}
      rows={[{ id: 'a', status: '정상' }]}
    />
  )
  const header = screen.getByRole('columnheader', { name: '상태' })
  expect(header).not.toHaveAttribute('aria-sort')
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
```
### select-all 헤더 체크박스가 부분 선택에서 indeterminate, 전체에서 checked이며 토글이 onSelectionChange를 호출한다
```tsx
test('전체 선택 체크박스가 indeterminate/checked를 파생하고 토글을 방출한다', async () => {
  const user = userEvent.setup()
  const onSelectionChange = vi.fn()
  const rows = [
    { id: 'a', name: '가압기' },
    { id: 'b', name: '냉각기' }
  ]
  const { rerender } = render(
    <Table
      selectable
      selectedIds={['a']}
      onSelectionChange={onSelectionChange}
      getRowId={(r) => r.id}
      columns={[{ key: 'name', header: '장비명' }]}
      rows={rows}
    />
  )
  const selectAll = screen.getByRole('checkbox', { name: '전체 선택' })
  expect(selectAll.indeterminate).toBe(true) // 2개 중 1개

  await user.click(selectAll) // 부분 → 전체 선택
  expect(onSelectionChange).toHaveBeenLastCalledWith(['a', 'b'])

  rerender(
    <Table
      selectable
      selectedIds={['a', 'b']}
      onSelectionChange={onSelectionChange}
      getRowId={(r) => r.id}
      columns={[{ key: 'name', header: '장비명' }]}
      rows={rows}
    />
  )
  expect(selectAll.indeterminate).toBe(false)
  expect(selectAll.checked).toBe(true)
  await user.click(selectAll) // 전체 → 해제
  expect(onSelectionChange).toHaveBeenLastCalledWith([])
})
```
### 행 체크박스가 controlled selectedIds를 반영하고 토글 시 해당 id를 더한 배열을 방출한다
```tsx
test('행 선택 체크박스가 controlled 상태를 반영하고 id를 방출한다', async () => {
  const user = userEvent.setup()
  const onSelectionChange = vi.fn()
  render(
    <Table
      selectable
      selectedIds={['a']}
      onSelectionChange={onSelectionChange}
      getRowId={(r) => r.id}
      columns={[{ key: 'name', header: '장비명' }]}
      rows={[
        { id: 'a', name: '가압기' },
        { id: 'b', name: '냉각기' }
      ]}
    />
  )
  const rowChecks = screen.getAllByRole('checkbox', { name: '행 선택' })
  expect(rowChecks[0].checked).toBe(true) // a 선택됨
  expect(rowChecks[1].checked).toBe(false)
  await user.click(rowChecks[1]) // b 추가
  expect(onSelectionChange).toHaveBeenCalledWith(['a', 'b'])
})
```
### 수치 열(align=end)은 데이터 정렬 속성으로 우측정렬을 노출한다
```tsx
test('align=end 열의 셀은 data-align=end를 갖는다', () => {
  render(
    <Table
      getRowId={(r) => r.id}
      columns={[{ key: 'temp', header: '온도', align: 'end', render: (r) => `${r.temp}°C` }]}
      rows={[{ id: 'a', temp: 40 }]}
    />
  )
  const cell = screen.getByRole('cell', { name: '40°C' })
  expect(cell).toHaveAttribute('data-align', 'end')
})
```
### rows가 비면 empty 슬롯을 렌더한다
```tsx
test('rows가 비면 empty 노드를 렌더한다', () => {
  render(
    <Table
      getRowId={(r) => r.id}
      columns={[{ key: 'name', header: '장비명' }]}
      rows={[]}
      empty={<span>표시할 이벤트가 없습니다</span>}
    />
  )
  expect(screen.getByText('표시할 이벤트가 없습니다')).toBeInTheDocument()
  expect(screen.queryAllByRole('cell').every((c) => c.textContent !== '가압기')).toBe(true)
})
```

## Story notes
title 'Components/Table'. 카피 한국어(이벤트 로그/설비 목록 도메인), 이름 영어. 스토리: Playground(기본), Sortable(정렬 3-상태 데모, 비제어), Selectable(선택 열 + 헤더 indeterminate, useState로 selectedIds 제어), Density(comfortable vs compact 병치), NumericAlign(온도·압력 수치 우측정렬), StickyHeader(스크롤 컨테이너 높이 제한 + 다행), Empty(rows=[] + empty 노드), Matrix(필수, id=components-table--matrix): 밀도(comfortable/compact) × 상태(zebra 기본 / 정렬 활성 열 / 선택 행 포함)를 한 화면에 배열해 라이트/다크 전수 확인. Matrix는 selectedIds에 일부 id를 넣어 선택 하이라이트, 한 열은 aria-sort='descending' 활성 상태로 보이게 defaultSort 지정.

## Render-verify
- 라이트/다크 모두 헤더가 surface-container 배경으로 본문과 구분되고, sticky 헤더가 스크롤 시 상단 고정(StickyHeader 스토리에서 컨테이너 스크롤)
- zebra 짝수행이 surface-container-low로 미묘하게 구분되고, hover 행은 surface-container-high로 밝아지며 텍스트(on-surface) 대비 AA 유지
- 선택된 행이 primary-container(소프트 레드) 배경 + on-surface 텍스트로 강조되고 zebra/hover를 이김 — 다크에서도 #46262A 위 텍스트 가독
- 정렬 활성 열의 헤더에 방향 아이콘(asc/desc)이 보이고 비활성 정렬 열의 아이콘은 흐리게(opacity down), 정렬 버튼 focus-visible 시 --focus-ring 표시
- 온도/압력 수치 열이 우측정렬되어 자릿수 정렬 확인
- 헤더 select-all 체크박스가 부분 선택 시 indeterminate(dash), 전체 시 check로 표시 — Checkbox 컴포넌트 스타일과 일치
- compact 밀도가 comfortable 대비 행 높이가 확연히 낮아짐(패딩 --space-2 vs --space-3)
- empty 슬롯이 전체 열 폭 중앙에 on-surface-muted로 렌더
- 셀 하단 보더가 outline-variant로 라이트/다크 모두 은은하게 보임(과한 그리드 아님)

## Risks
제네릭 + forwardRef 조합은 `forwardRef(TableInner) as <T>(...)=>ReactElement` 캐스팅이 필요(타입만 캐스트, 런타임 무해) — 기존 컴포넌트엔 제네릭 선례 없으니 구현자가 이 패턴을 지켜야 함. 정렬은 비제어 시 Table이 실제 재정렬(column.sortAccessor 기본 row[key]), 제어(sort 지정) 시 상태만 반영하고 재정렬은 소비자 몫 — 이 headless 경계를 스토리/문서에서 명시 필요. tr 배경 렌더 quirks 회피 위해 배경을 td 셀에 적용(선택/zebra/hover 우선순위는 CSS source order로 제어). role=table 유지(grid 셀 로빙 미도입) — 편집 가능 데이터그리드가 아닌 읽기용 로그/목록 용도 전제. getRowId 미지정 시 인덱스 기반이라 정렬/필터 시 선택 안정성 저하 — selectable 사용 시 getRowId 지정을 강력 권장(경고는 후순위).
