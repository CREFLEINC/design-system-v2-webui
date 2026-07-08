import type { Meta, StoryObj } from '@storybook/react-vite'
import { Switch } from './Switch'

const meta = {
  title: 'Components/Switch',
  component: Switch,
  args: { label: '알림', labelPlacement: 'end' }
} satisfies Meta<typeof Switch>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 20 }}>
      {([false, true] as const).map((checked) => (
        <div key={String(checked)} style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Switch label={checked ? '자동 저장' : '알림'} defaultChecked={checked} />
          <Switch label="다크 모드" defaultChecked={checked} disabled />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <Switch label="자동 저장" labelPlacement="start" defaultChecked />
        <Switch label="알림" labelPlacement="start" />
      </div>
    </div>
  )
}
