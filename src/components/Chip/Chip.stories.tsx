import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Chip, type ChipStatus, type ChipSize } from './Chip'
import { Icon } from '../Icon/Icon'

const meta = {
  title: 'Components/Chip',
  component: Chip,
  args: { children: '진행중', variant: 'status', status: 'idle', size: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['status', 'filter'] },
    status: { control: 'inline-radio', options: ['success', 'error', 'warning', 'info', 'idle'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] }
  }
} satisfies Meta<typeof Chip>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

const STATUSES: { status: ChipStatus; label: string }[] = [
  { status: 'success', label: '양품' },
  { status: 'error', label: '불량' },
  { status: 'warning', label: '주의' },
  { status: 'info', label: '정보' },
  { status: 'idle', label: '대기' }
]

const SIZES: ChipSize[] = ['sm', 'md']

export const StatusMatrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {SIZES.map((size) => (
        <div key={size} style={{ display: 'grid', gap: 8 }}>
          <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-variant)' }}>size: {size}</div>
          {STATUSES.map(({ status, label }) => (
            <div key={status} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip status={status} size={size}>{label}</Chip>
              <Chip status={status} size={size} leadingIcon={<Icon name="circle" size={16} />}>{label}</Chip>
              <Chip status={status} size={size} onRemove={() => {}}>{label}</Chip>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function FilterChips() {
  const [selected, setSelected] = useState<Record<string, boolean>>({
    전체: true, 카메라: false, 센서: true, 로봇: false
  })
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {Object.keys(selected).map((name) => (
        <Chip
          key={name}
          variant="filter"
          selected={selected[name]}
          onSelectedChange={(next) => setSelected((s) => ({ ...s, [name]: next }))}
        >
          {name}
        </Chip>
      ))}
    </div>
  )
}

export const FilterRow: Story = {
  render: () => <FilterChips />
}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, maxWidth: '100%' }}>
      <div style={{ display: 'grid', gap: 16 }}>
        {SIZES.map((size) => (
          <div key={size} style={{ display: 'grid', gap: 8 }}>
            <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-variant)' }}>size: {size}</div>
            {STATUSES.map(({ status, label }) => (
              <div key={status} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip status={status} size={size}>{label}</Chip>
                <Chip status={status} size={size} leadingIcon={<Icon name="circle" size={16} />}>{label}</Chip>
                <Chip status={status} size={size} onRemove={() => {}}>{label}</Chip>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Chip variant="filter" selected>전체</Chip>
        <Chip variant="filter">카메라</Chip>
        <Chip variant="filter" selected>센서</Chip>
        <Chip variant="filter">로봇</Chip>
      </div>
    </div>
  )
}
