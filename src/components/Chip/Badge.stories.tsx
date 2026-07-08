import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge, type BadgeTone } from './Badge'
import { Icon } from '../Icon/Icon'

const meta = {
  title: 'Components/Badge',
  component: Badge,
  args: { count: 3, tone: 'primary' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['primary', 'neutral', 'error'] },
    dot: { control: 'boolean' }
  }
} satisfies Meta<typeof Badge>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

const TONES: BadgeTone[] = ['primary', 'neutral', 'error']

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: '100%' }}>
      {TONES.map((tone) => (
        <div key={tone} style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 72, font: 'var(--type-label-sm)', color: 'var(--on-surface-variant)' }}>{tone}</div>
          <Badge count={5} tone={tone} aria-label="읽지 않음 5개" />
          <Badge count={150} tone={tone} aria-label="읽지 않음 99개 이상" />
          <Badge dot tone={tone} aria-label="새 알림" />
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Icon name="inbox" size={24} label="받은편지함" />
            <span style={{ position: 'absolute', top: -4, right: -8 }}>
              <Badge count={8} tone={tone} aria-label="읽지 않음 8개" />
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
