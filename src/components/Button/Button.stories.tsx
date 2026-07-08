import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { Icon } from '../Icon/Icon'

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: '버튼', variant: 'filled', size: 'md' }
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['filled', 'tonal', 'outlined', 'text'] as const).map((v) => (
        <div key={v} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <Button key={s} variant={v} size={s}>버튼</Button>
          ))}
          <Button variant={v} leadingIcon={<Icon name="add" size={20} />}>추가</Button>
          <Button variant={v} disabled>비활성</Button>
          <Button variant={v} loading>로딩</Button>
        </div>
      ))}
    </div>
  )
}
