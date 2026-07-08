import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { within, userEvent } from 'storybook/test'
import { Select, type SelectItems } from './Select'
import { Icon } from '../Icon/Icon'

const CITIES: SelectItems = [
  { value: 'seoul', label: '서울' },
  { value: 'busan', label: '부산' },
  { value: 'incheon', label: '인천', disabled: true },
  { value: 'jeju', label: '제주' },
]

const GROUPED: SelectItems = [
  { label: '수도권', options: [
    { value: 'seoul', label: '서울' },
    { value: 'incheon', label: '인천' },
  ] },
  { label: '영남', options: [
    { value: 'busan', label: '부산' },
    { value: 'daegu', label: '대구' },
  ] },
]

const LONG: SelectItems = [
  '서울', '부산', '인천', '대구', '대전', '광주',
  '울산', '수원', '고양', '용인', '창원', '성남', '청주', '전주',
].map((label, i) => ({ value: `c${i}`, label }))

const meta = {
  title: 'Components/Select',
  component: Select,
  args: {
    options: CITIES,
    placeholder: '도시 선택',
    size: 'md',
    'aria-label': '도시',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const WithValue: Story = {
  args: { defaultValue: 'busan' },
}

export const Invalid: Story = {
  args: { invalid: true, placeholder: '도시 선택' },
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const Grouped: Story = {
  args: { options: GROUPED },
}

export const LongList: Story = {
  args: { options: LONG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
  },
}

export const OpenState: Story = {
  args: { defaultValue: 'busan' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
  },
}

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | null>('seoul')
    return (
      <div style={{ width: 240 }}>
        <Select {...args} value={value} onChange={setValue} />
        <p style={{ marginTop: 8, font: 'var(--type-body-md)', color: 'var(--on-surface-muted)' }}>
          선택된 값: {value ?? '없음'}
        </p>
      </div>
    )
  },
}

export const Matrix: Story = {
  render: () => {
    const sizes = ['sm', 'md', 'lg'] as const
    const cell = { width: 200 }
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {sizes.map((s) => (
          <div key={s} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={cell}>
              <Select options={CITIES} size={s} placeholder="도시 선택" aria-label={`기본 ${s}`} />
            </div>
            <div style={cell}>
              <Select options={CITIES} size={s} defaultValue="busan" aria-label={`선택됨 ${s}`} />
            </div>
            <div style={cell}>
              <Select options={CITIES} size={s} invalid placeholder="도시 선택" aria-label={`invalid ${s}`} />
            </div>
            <div style={cell}>
              <Select options={CITIES} size={s} disabled placeholder="도시 선택" aria-label={`disabled ${s}`} />
            </div>
            <div style={cell}>
              <Select
                options={CITIES}
                size={s}
                placeholder="도시 선택"
                leadingIcon={<Icon name="place" size={20} />}
                aria-label={`leadingIcon ${s}`}
              />
            </div>
          </div>
        ))}
      </div>
    )
  },
}
