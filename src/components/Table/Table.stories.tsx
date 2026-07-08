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

// Matrix(필수) — 밀도(comfortable/compact) × 상태(zebra 기본/정렬 활성/선택 행 포함)를 한 화면에 배열
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
          />
        </div>
      ))}
    </div>
  )
}
