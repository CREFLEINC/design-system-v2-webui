import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stepper, type StepperItem, type StepperOrientation, type StepperSize } from './Stepper'
import { Chip } from '../Chip/Chip'

const meta = {
  title: 'Components/Stepper',
  component: Stepper,
  args: {
    steps: [
      { label: '기안', status: 'complete' },
      { label: '검토', status: 'current' },
      { label: '승인', status: 'pending' }
    ]
  }
} satisfies Meta<typeof Stepper>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

const ORIENTATIONS: StepperOrientation[] = ['horizontal', 'vertical']
const SIZES: StepperSize[] = ['sm', 'md']
const ALL_STATUS_STEPS: StepperItem[] = [
  { label: '기안', status: 'complete' },
  { label: '검토', status: 'current' },
  { label: '승인', status: 'pending' },
  { label: '반려', status: 'rejected' }
]

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 32 }}>
      {ORIENTATIONS.map((orientation) => (
        <div key={orientation} style={{ display: 'grid', gap: 20 }}>
          <strong>{orientation}</strong>
          {SIZES.map((size) => (
            <div key={size} style={{ display: 'grid', gap: 8 }}>
              <span style={{ font: 'var(--type-body-sm)', color: 'var(--on-surface-variant)' }}>{size}</span>
              <Stepper steps={ALL_STATUS_STEPS} orientation={orientation} size={size} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export const RejectedFlow: Story = {
  args: {
    steps: [
      { label: '기안', status: 'complete' },
      { label: '1차 검토', status: 'complete' },
      { label: '2차 검토', status: 'rejected' },
      { label: '재검토', status: 'pending' },
      { label: '승인', status: 'pending' }
    ]
  }
}

export const Composition: Story = {
  args: {
    steps: [
      {
        label: '기안',
        status: 'complete',
        description: '홍길동 · 2024-01-05'
      },
      {
        label: '검토',
        status: 'current',
        description: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            김철수 · 2024-01-08 <Chip status="idle" size="sm">진행중</Chip>
          </span>
        )
      },
      {
        label: '승인',
        status: 'pending',
        description: '이영희 · 예정'
      }
    ] satisfies StepperItem[]
  }
}
