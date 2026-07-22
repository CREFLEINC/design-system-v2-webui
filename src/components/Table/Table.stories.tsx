import { useState, type ComponentType } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table, type Column, type SortState, type TableProps } from './Table'

interface Equipment {
  id: string
  name: string
  status: string
  temp: number
  pressure: number
}

const rows: Equipment[] = [
  { id: 'eq-1', name: '가압기 A', status: '정상', temp: 40, pressure: 12.4 },
  { id: 'eq-2', name: '냉각기 B', status: '점검', temp: 12, pressure: 3.1 },
  { id: 'eq-3', name: '펌프 C', status: '정상', temp: 25, pressure: 8.7 },
  { id: 'eq-4', name: '압축기 D', status: '경고', temp: 61, pressure: 15.9 },
  { id: 'eq-5', name: '밸브 E', status: '정상', temp: 18, pressure: 4.4 },
  { id: 'eq-6', name: '히터 F', status: '정상', temp: 52, pressure: 6.2 },
  { id: 'eq-7', name: '센서 G', status: '점검', temp: 9, pressure: 1.8 },
  { id: 'eq-8', name: '터빈 H', status: '정상', temp: 33, pressure: 11.0 }
]

const baseColumns: Column<Equipment>[] = [
  { key: 'name', header: '장비명', sortable: true },
  { key: 'status', header: '상태' },
  { key: 'temp', header: '온도', align: 'end', sortable: true, render: (r) => `${r.temp}°C` },
  { key: 'pressure', header: '압력', align: 'end', sortable: true, render: (r) => `${r.pressure}bar` }
]

// Table은 제네릭 forwardRef 캐스팅이라 Storybook의 Meta<T>가 props 타입을
// 정확히 추론하지 못한다 — args/Story 타이핑 목적으로만 구체화된 컴포넌트 타입을 캐스팅한다
// (런타임에는 동일한 Table을 그대로 사용).
const TableComponent = Table as unknown as ComponentType<TableProps<Equipment>>

const meta = {
  title: 'Components/Table',
  component: TableComponent,
  args: {
    caption: '설비 목록',
    getRowId: (r: Equipment) => r.id,
    columns: baseColumns,
    rows
  }
} satisfies Meta<typeof TableComponent>
export default meta
type Story = StoryObj<typeof meta>

// 비제어, zebra 기본. 헤더 정렬·zebra·hover 확인
export const Playground: Story = {}

// 정렬 3-상태(미정렬→ascending→descending→미정렬) 비제어 데모
export const Sortable: Story = {
  args: { defaultSort: { key: 'temp', direction: 'ascending' } as SortState }
}

// 선택 열 — controlled selectedIds, 헤더 select-all이 indeterminate/checked 파생
export const Selectable: Story = {
  render: (args) => {
    const [selectedIds, setSelectedIds] = useState<string[]>(['eq-1', 'eq-4'])
    return (
      <Table
        {...args}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    )
  }
}

// 밀도 병치 — comfortable vs compact 행 높이 비교
export const Density: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <strong>comfortable (기본)</strong>
        <Table {...args} density="comfortable" caption="설비 목록 — comfortable" />
      </div>
      <div>
        <strong>compact</strong>
        <Table {...args} density="compact" caption="설비 목록 — compact" />
      </div>
    </div>
  )
}

// 수치 열(온도·압력) 우측정렬 확인
export const NumericAlign: Story = {
  args: {
    columns: [
      { key: 'name', header: '장비명' },
      { key: 'temp', header: '온도', align: 'end', render: (r) => `${r.temp}°C` },
      { key: 'pressure', header: '압력', align: 'end', render: (r) => `${r.pressure}bar` }
    ]
  }
}

// sticky 헤더 — 스크롤 컨테이너 높이 제한 + 다행
export const StickyHeader: Story = {
  render: (args) => (
    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
      <Table {...args} />
    </div>
  )
}

// 빈 상태 — rows=[] + empty 슬롯
export const Empty: Story = {
  args: {
    rows: [],
    empty: <span>표시할 설비가 없습니다</span>
  }
}

// 요약 행(tfoot) — 합계 1행. StickyHeader와 동일한 스크롤 컨테이너로 감싸
// 마지막(유일한) 요약 행이 하단에 sticky로 고정되는지 확인 가능하게 한다
export const Summary: Story = {
  render: (args) => (
    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
      <Table
        {...args}
        summaryRows={[
          [
            { key: 'label', content: '합계', colSpan: 2, align: 'start' },
            { key: 'temp', content: '250°C', align: 'end', emphasis: true },
            { key: 'pressure', content: '63.5bar', align: 'end', emphasis: true }
          ]
        ]}
      />
    </div>
  )
}

// 요약 다중 행 — 소계 + 총계 2행. CSS는 마지막 행(총계)에만 position:sticky를 적용하므로
// 소계 행은 본문과 함께 스크롤되고 총계 행만 하단에 항상 노출된다 (구현 설계 가정 4)
export const SummaryMultiRow: Story = {
  args: {
    summaryRows: [
      [
        { key: 'label', content: '소계 (1~4)', colSpan: 2, align: 'start' },
        { key: 'temp', content: '138°C', align: 'end' },
        { key: 'pressure', content: '40.1bar', align: 'end' }
      ],
      [
        { key: 'label', content: '총계', colSpan: 2, align: 'start' },
        { key: 'temp', content: '250°C', align: 'end', emphasis: true },
        { key: 'pressure', content: '63.5bar', align: 'end', emphasis: true }
      ]
    ]
  }
}

// 그룹 헤더(row group header) — status별로 그룹핑, renderGroupHeader로 그룹별 건수 표시.
// 그룹 순서=첫 등장 순(정상→점검→경고)이고 정렬(온도, sortable)은 각 그룹 내부에서만 일어난다 —
// 헤더를 클릭해 재정렬해도 그룹 경계·순서는 불변임을 확인할 수 있다
export const Grouped: Story = {
  args: {
    groupBy: (r: Equipment) => r.status,
    renderGroupHeader: (key, groupRows) => `${key} (${groupRows.length})`,
    defaultSort: { key: 'temp', direction: 'ascending' } as SortState
  }
}

// 그룹핑 + 선택 — Selectable 스토리와 동일한 controlled 패턴. 그룹 헤더 행이 선택 열까지
// 전폭(colSpan=columns.length+1)으로 렌더되고 체크박스가 없음을 확인
export const GroupedSelectable: Story = {
  render: (args) => {
    const [selectedIds, setSelectedIds] = useState<string[]>(['eq-1', 'eq-4'])
    return (
      <Table
        {...args}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        groupBy={(r) => r.status}
        renderGroupHeader={(key, groupRows) => `${key} (${groupRows.length})`}
      />
    )
  }
}

// 그룹핑 + 요약 행(tfoot) 공존 — Summary 스토리의 합계 행을 재사용. tbody의 그룹 헤더와
// tfoot의 요약 행이 서로 영향을 주지 않고(정렬·그룹핑 대상 밖) 함께 렌더됨을 확인
export const GroupedWithSummary: Story = {
  args: {
    groupBy: (r: Equipment) => r.status,
    renderGroupHeader: (key, groupRows) => `${key} (${groupRows.length})`,
    defaultSort: { key: 'temp', direction: 'ascending' } as SortState,
    summaryRows: [
      [
        { key: 'label', content: '합계', colSpan: 2, align: 'start' },
        { key: 'temp', content: '250°C', align: 'end', emphasis: true },
        { key: 'pressure', content: '63.5bar', align: 'end', emphasis: true }
      ]
    ]
  }
}

// Matrix(필수) — 밀도(comfortable/compact) × 상태(zebra 기본/정렬 활성/선택 행 포함)를 한 화면에 배열
// 각 테이블에 요약 행(합계 1행)을 포함시켜 density·selectable·정렬·summaryRows 조합을 전수 확인한다
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 32 }}>
      {(['comfortable', 'compact'] as const).map((density) => (
        <div key={density} style={{ display: 'grid', gap: 8 }}>
          <strong>density = {density}</strong>
          <Table
            caption={`설비 목록 — ${density}`}
            getRowId={(r: Equipment) => r.id}
            columns={baseColumns}
            rows={rows}
            density={density}
            selectable
            selectedIds={['eq-1', 'eq-4']}
            onSelectionChange={() => {}}
            defaultSort={{ key: 'temp', direction: 'descending' }}
            summaryRows={[
              [
                { key: 'label', content: '합계', colSpan: 2, align: 'start' },
                { key: 'temp', content: '250°C', align: 'end', emphasis: true },
                { key: 'pressure', content: '63.5bar', align: 'end', emphasis: true }
              ]
            ]}
          />
        </div>
      ))}
    </div>
  )
}
