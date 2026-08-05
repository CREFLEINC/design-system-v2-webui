import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { within, userEvent } from 'storybook/test'
import { DatePicker, type DateRangeValue } from './DatePicker'

const helpText = { marginTop: 8, font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' } as const

// 메타 레벨 `decorators`는 쓰지 않는다 — DatePickerProps가 판별 유니온(single|range)이라
// `decorators` 배열과 결합되면 TS가 콜백 매개변수(반공변 위치)에서 유니온을 인터섹션으로
// 접어 Args가 `never`가 되는 추론 버그가 실측됐다(Chip처럼 다른 유니온 props 컴포넌트도
// 이 리포에서 decorators를 쓰지 않는 것과 같은 이유). 폭 제약은 스토리별 render에서 감싼다.
const meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  args: {
    placeholder: '발행일 선택',
    size: 'md',
    'aria-label': '발행일'
  }
} satisfies Meta<typeof DatePicker>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: 260 }}>
      <DatePicker {...args} />
    </div>
  )
}

/**
 * 단일 모드 컨트롤드 데모. value는 항상 'YYYY-MM-DD' 문자열이다(Date 객체 아님) —
 * 화면에 그 문자열을 그대로 노출해 계약을 드러낸다.
 */
function ControlledSingleDemo() {
  const [value, setValue] = useState<string | null>('2026-03-14')
  return (
    <div style={{ width: 260 }}>
      <DatePicker
        value={value}
        onChange={setValue}
        placeholder="발행일 선택"
        aria-label="발행일"
      />
      <p style={helpText}>선택된 값: {value ?? '없음'} (&apos;YYYY-MM-DD&apos; 문자열)</p>
    </div>
  )
}

export const WithValue: Story = {
  render: () => <ControlledSingleDemo />
}

/**
 * 기간(range) 컨트롤드 데모.
 * onChange는 완결된 [from, to] 쌍만 방출한다 — from <= to는 컴포넌트가 보장한다.
 * 두 번째로 고른 날짜가 첫 번째보다 이르면(역순) onChange는 호출되지 않고,
 * 그 날짜가 새 시작일이 되어 선택이 다시 시작된다. 즉 방출되는 값은 항상
 * 시작일 <= 종료일인 ['YYYY-MM-DD', 'YYYY-MM-DD'] 쌍이다.
 */
function RangeDemo() {
  const [value, setValue] = useState<DateRangeValue | null>(['2026-03-01', '2026-03-10'])
  const [from, to] = value ?? [null, null]
  return (
    <div style={{ width: 280 }}>
      <DatePicker
        mode="range"
        value={value}
        onChange={(range) => setValue(range)}
        placeholder="조회 기간 선택"
        aria-label="조회 기간"
      />
      <p style={helpText}>선택된 기간: {from && to ? `${from} ~ ${to}` : '없음'}</p>
      <p style={helpText}>
        두 번째 선택이 첫 번째보다 이르면 시작일이 그 날짜로 바뀌며 다시 선택이
        시작됩니다(역순으로 골라도 종료일보다 앞선 값은 나오지 않습니다).
      </p>
    </div>
  )
}

export const Range: Story = {
  render: () => <RangeDemo />
}

export const MinMax: Story = {
  args: {
    min: '2026-08-01',
    max: '2026-08-20',
    defaultValue: '2026-08-10',
    placeholder: '발행일 선택',
    'aria-label': '발행일 (8/1~8/20만 선택 가능)'
  },
  render: (args) => (
    <div style={{ width: 260 }}>
      <DatePicker {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
  }
}

export const Invalid: Story = {
  args: { invalid: true, placeholder: '발행일 선택' },
  render: (args) => (
    <div style={{ width: 260 }}>
      <DatePicker {...args} />
    </div>
  )
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: '2026-03-14' },
  render: (args) => (
    <div style={{ width: 260 }}>
      <DatePicker {...args} />
    </div>
  )
}

export const OpenState: Story = {
  args: { defaultValue: '2026-03-14' },
  render: (args) => (
    <div style={{ width: 260 }}>
      <DatePicker {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
  }
}

/** xl(터치 단말) — 트리거뿐 아니라 날짜 셀도 함께 커진다. */
export const XL: Story = {
  args: { size: 'xl', defaultValue: '2026-03-14', placeholder: '발행일 선택' },
  render: (args) => (
    <div style={{ width: 260 }}>
      <DatePicker {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
  }
}

export const Matrix: Story = {
  render: () => {
    const sizes = ['sm', 'md', 'lg', 'xl'] as const
    const cell = { width: 220 }
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {sizes.map((s) => (
          <div key={s} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={cell}>
              <DatePicker size={s} placeholder="발행일 선택" aria-label={`기본 ${s}`} />
            </div>
            <div style={cell}>
              <DatePicker size={s} defaultValue="2026-03-14" aria-label={`선택됨 ${s}`} />
            </div>
            <div style={cell}>
              <DatePicker
                mode="range"
                size={s}
                defaultValue={['2026-03-01', '2026-03-10']}
                aria-label={`기간 ${s}`}
              />
            </div>
            <div style={cell}>
              <DatePicker size={s} invalid placeholder="발행일 선택" aria-label={`invalid ${s}`} />
            </div>
            <div style={cell}>
              <DatePicker size={s} disabled placeholder="발행일 선택" aria-label={`disabled ${s}`} />
            </div>
          </div>
        ))}
      </div>
    )
  }
}
