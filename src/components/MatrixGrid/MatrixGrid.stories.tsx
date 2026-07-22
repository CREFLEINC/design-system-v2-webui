import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  MatrixGrid,
  type MatrixCell,
  type MatrixColumn,
  type MatrixGroupHeader,
  type MatrixRow,
  type MatrixStatus
} from './MatrixGrid'

// 설비 × 일자 상태 매트릭스 예시 데이터 (제조 도메인 — 가동 현황판)

// -------- 주간(7열) --------
const weeklyColumns: MatrixColumn[] = [
  { key: 'd0', label: '7/15' },
  { key: 'd1', label: '7/16' },
  { key: 'd2', label: '7/17' },
  { key: 'd3', label: '7/18' },
  { key: 'd4', label: '7/19' },
  { key: 'd5', label: '7/20' },
  { key: 'd6', label: '7/21' }
]

const weeklyRows: MatrixRow[] = [
  {
    label: '가압기 A',
    cells: [
      { key: 'a-0', status: 'success' },
      { key: 'a-1', status: 'success' },
      { key: 'a-2', status: 'warning' },
      { key: 'a-3', status: 'success' },
      { key: 'a-4', status: 'success' },
      { key: 'a-5', status: 'idle' },
      { key: 'a-6', status: 'success' }
    ]
  },
  {
    label: '냉각기 B',
    cells: [
      { key: 'b-0', status: 'success' },
      { key: 'b-1', status: 'error' },
      { key: 'b-2', status: 'error' },
      { key: 'b-3', status: 'warning' },
      { key: 'b-4', status: 'success' },
      { key: 'b-5', status: 'success' },
      { key: 'b-6', status: 'idle' }
    ]
  },
  {
    label: '펌프 C',
    cells: [
      { key: 'c-0', status: 'success' },
      { key: 'c-1', status: 'success' },
      { key: 'c-2', status: 'success' },
      { key: 'c-3', status: 'success' },
      { key: 'c-4', status: 'success' },
      { key: 'c-5', status: 'success' },
      { key: 'c-6', status: 'success' }
    ]
  },
  {
    label: '압축기 D',
    cells: [
      { key: 'd-0', status: 'idle' },
      { key: 'd-1', status: 'idle' },
      { key: 'd-2', status: 'success' },
      { key: 'd-3', status: 'success' },
      { key: 'd-4', status: 'warning' },
      { key: 'd-5', status: 'success' },
      { key: 'd-6', status: 'success' }
    ]
  },
  {
    label: '밸브 E',
    cells: [
      { key: 'e-0', status: 'success' },
      { key: 'e-1', status: 'success' },
      { key: 'e-2', status: 'success' },
      { key: 'e-3', status: 'none' },
      { key: 'e-4', status: 'none' },
      { key: 'e-5', status: 'success' },
      { key: 'e-6', status: 'success' }
    ]
  }
]

// 일자별 종합판정 — content 있는 셀 → 연한 컨테이너 톤(가정 2)
const weeklySummaryRow: { label: string; cells: MatrixCell[] } = {
  label: '종합판정',
  cells: [
    { key: 's-0', content: '정상', status: 'success' },
    { key: 's-1', content: '주의', status: 'error' },
    { key: 's-2', content: '주의', status: 'warning' },
    { key: 's-3', content: '주의', status: 'warning' },
    { key: 's-4', content: '주의', status: 'warning' },
    { key: 's-5', content: '정상', status: 'success' },
    { key: 's-6', content: '정상', status: 'success' }
  ]
}

// -------- 월간(31열) — 열 개수 가변 + highlight(오늘) --------
const MONTHLY_STATUS_CYCLE: MatrixStatus[] = [
  'success',
  'success',
  'success',
  'idle',
  'warning',
  'success',
  'error'
]

function buildMonthlyRow(label: string, key: string, offset: number): MatrixRow {
  return {
    label,
    cells: Array.from({ length: 31 }, (_, i) => ({
      key: `${key}-${i}`,
      status: MONTHLY_STATUS_CYCLE[(i + offset) % MONTHLY_STATUS_CYCLE.length]
    }))
  }
}

const monthlyColumns: MatrixColumn[] = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1
  return { key: `m${day}`, label: `${day}`, highlight: day === 18 }
})

const monthlyRows: MatrixRow[] = [
  buildMonthlyRow('가압기 A', 'pa', 0),
  buildMonthlyRow('냉각기 B', 'cb', 2),
  buildMonthlyRow('펌프 C', 'pc', 4),
  buildMonthlyRow('압축기 D', 'cd', 1),
  buildMonthlyRow('밸브 E', 've', 5)
]

// -------- 그룹 헤더 + colSpan/rowSpan 병합 셀 --------
const groupColumns: MatrixColumn[] = [
  { key: 'g1', label: '7/1' },
  { key: 'g2', label: '7/2' },
  { key: 'g3', label: '7/3' },
  { key: 'g4', label: '7/4' },
  { key: 'g5', label: '7/5' },
  { key: 'g6', label: '7/6' }
]

const groupHeaders: MatrixGroupHeader[] = [
  { label: '1주차', span: 3 },
  { label: '2주차', span: 3 }
]

// 냉각기 B의 '정전' 셀이 rowSpan=2로 펌프 C 행까지 1열을 세로 병합한다.
// 점유 매트릭스가 이월분을 처리하므로 펌프 C 행은 1열 셀을 직접 선언하지 않는다.
const groupRows: MatrixRow[] = [
  {
    label: '가압기 A',
    cells: [
      { key: 'ga-0', status: 'success' },
      { key: 'ga-1', content: '정기점검', status: 'warning', colSpan: 2 },
      { key: 'ga-2', status: 'success' },
      { key: 'ga-3', status: 'success' },
      { key: 'ga-4', status: 'success' }
    ]
  },
  {
    label: '냉각기 B',
    cells: [
      { key: 'gb-0', content: '정전', status: 'idle', rowSpan: 2 },
      { key: 'gb-1', status: 'success' },
      { key: 'gb-2', status: 'success' },
      { key: 'gb-3', status: 'error' },
      { key: 'gb-4', status: 'success' },
      { key: 'gb-5', status: 'success' }
    ]
  },
  {
    label: '펌프 C',
    cells: [
      { key: 'gc-1', status: 'success' },
      { key: 'gc-2', status: 'success' },
      { key: 'gc-3', status: 'warning' },
      { key: 'gc-4', status: 'success' },
      { key: 'gc-5', status: 'success' }
    ]
  },
  {
    label: '압축기 D',
    cells: [
      { key: 'gd-0', status: 'success' },
      { key: 'gd-1', status: 'success' },
      { key: 'gd-2', status: 'success' },
      { key: 'gd-3', status: 'idle' },
      { key: 'gd-4', status: 'success' },
      { key: 'gd-5', status: 'success' }
    ]
  }
]

// -------- Matrix(라이트/다크) — 그룹 헤더·병합 셀·highlight·요약행을 한 데이터셋에 모음 --------
const matrixColumns: MatrixColumn[] = [
  { key: 'x1', label: '7/1' },
  { key: 'x2', label: '7/2' },
  { key: 'x3', label: '7/3', highlight: true },
  { key: 'x4', label: '7/4' },
  { key: 'x5', label: '7/5' },
  { key: 'x6', label: '7/6' }
]

const matrixSummaryRow: { label: string; cells: MatrixCell[] } = {
  label: '종합판정',
  cells: [
    { key: 'ms-0', content: '정상', status: 'success' },
    { key: 'ms-1', content: '주의', status: 'warning' },
    { key: 'ms-2', content: '주의', status: 'warning' },
    { key: 'ms-3', content: '점검', status: 'error' },
    { key: 'ms-4', content: '정상', status: 'success' },
    { key: 'ms-5', content: '정상', status: 'success' }
  ]
}

function MatrixBlock({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div
      data-theme={theme}
      style={{ background: 'var(--surface)', padding: 16, display: 'grid', gap: 8 }}
    >
      <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-variant)' }}>
        {theme === 'light' ? '라이트' : '다크'}
      </div>
      <MatrixGrid
        aria-label={`설비 가동 현황 · 그룹 헤더 · 병합 셀 · 요약행 (${theme === 'light' ? '라이트' : '다크'})`}
        columns={matrixColumns}
        rows={groupRows}
        groupHeaders={groupHeaders}
        summaryRow={matrixSummaryRow}
      />
    </div>
  )
}

const meta = {
  title: 'Components/MatrixGrid',
  component: MatrixGrid,
  args: {
    'aria-label': '주간 설비 가동 현황',
    columns: weeklyColumns,
    rows: weeklyRows
  }
} satisfies Meta<typeof MatrixGrid>
export default meta
type Story = StoryObj<typeof meta>

// 주간(7열) — 기본 밀집 매트릭스. status-only 셀은 진한 톤 단색 채움(가정 2)
export const Weekly: Story = {}

// 월간(31열) — 열 개수 가변 레이아웃 확인 + highlight 관통 열(18일 = 오늘)
export const Monthly: Story = {
  args: {
    'aria-label': '7월 설비 가동 현황',
    columns: monthlyColumns,
    rows: monthlyRows
  }
}

// 요약행(tfoot) — 일자별 종합판정을 본문과 구분되는 밴드로 하단 렌더
export const WithSummary: Story = {
  args: {
    'aria-label': '주간 설비 가동 현황 (종합판정 포함)',
    summaryRow: weeklySummaryRow
  }
}

// 그룹 헤더(1주차/2주차) + colSpan(정기점검 2일 병합)/rowSpan(정전 2행 병합) 셀
export const WithGroupHeaders: Story = {
  args: {
    'aria-label': '설비 가동 현황 (그룹 헤더 · 병합 셀)',
    columns: groupColumns,
    rows: groupRows,
    groupHeaders
  }
}

// onCellClick 드릴다운 — 클릭 또는 포커스 후 Enter/Space로 셀 활성화
export const Clickable: Story = {
  render: (args) => {
    const [selected, setSelected] = useState<string | null>(null)
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <MatrixGrid
          {...args}
          onCellClick={(row, col, cell) => {
            const rowLabel = typeof row.label === 'string' ? row.label : ''
            const colLabel = typeof col.label === 'string' ? col.label : ''
            setSelected(`${rowLabel} · ${colLabel} · ${cell.status ?? 'none'}`)
          }}
        />
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--on-surface-variant)' }}>
          {selected ? `선택된 셀: ${selected}` : '셀을 클릭하거나 포커스 후 Enter/Space를 눌러보세요'}
        </div>
      </div>
    )
  }
}

// size='sm' — 컴팩트 밀도(24px 데이터 열, --type-label-sm)
export const SmallSize: Story = {
  args: { size: 'sm' }
}

// 그룹 헤더·병합 셀·highlight·요약행을 한 데이터셋에 모아 라이트/다크 전수 배열.
// 2단계 상태 톤(solid/container)·highlight 링·요약 밴드가 두 테마에서 모두 올바르게
// 스왑되는지(다크 오버라이드는 styles/themes.css) 확인한다.
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <MatrixBlock theme="light" />
      <MatrixBlock theme="dark" />
    </div>
  )
}
