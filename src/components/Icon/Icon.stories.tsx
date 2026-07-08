import type { Meta, StoryObj } from '@storybook/react-vite'
import { Icon } from './Icon'

const meta = {
  title: 'Foundation/Icon',
  component: Icon,
  args: { name: 'factory', size: 24 }
} satisfies Meta<typeof Icon>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Gallery: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {['factory', 'smart_toy', 'monitoring', 'warning', 'settings', 'search'].map((n) => (
        <Icon key={n} name={n} size={40} />
      ))}
    </div>
  )
}
