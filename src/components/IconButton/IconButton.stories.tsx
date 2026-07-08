import type { Meta, StoryObj } from '@storybook/react-vite'
import { IconButton } from './IconButton'

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  args: { icon: 'settings', 'aria-label': '설정', variant: 'standard', size: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['standard', 'filled', 'tonal'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    toggle: { control: 'boolean' }
  }
} satisfies Meta<typeof IconButton>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['standard', 'filled', 'tonal'] as const).map((v) => (
        <div key={v} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <IconButton key={s} icon="settings" aria-label={`설정 ${s}`} variant={v} size={s} />
          ))}
          <IconButton icon="settings" aria-label="비활성" variant={v} disabled />
        </div>
      ))}
    </div>
  )
}

export const Toggle: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['standard', 'filled', 'tonal'] as const).map((v) => (
        <div key={v} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <IconButton
            icon="star_border"
            selectedIcon="star"
            aria-label={`즐겨찾기 ${v} 미선택`}
            toggle
            defaultPressed={false}
            variant={v}
          />
          <IconButton
            icon="star_border"
            selectedIcon="star"
            aria-label={`즐겨찾기 ${v} 선택`}
            toggle
            defaultPressed
            variant={v}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * IconButton은 보이는 텍스트가 없으므로 `aria-label`이 타입 레벨에서 필수다.
 * aria-labelledby로 이름을 주고 싶은 소비자는 aria-label=""로 회피할 수 있다.
 */
export const AccessibleName: Story = {
  args: { icon: 'close', 'aria-label': '닫기' }
}
