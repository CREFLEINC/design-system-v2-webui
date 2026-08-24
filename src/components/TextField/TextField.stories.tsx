import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextField } from './TextField'
import { Icon } from '../Icon/Icon'

const meta = {
  title: 'Components/TextField',
  component: TextField,
  args: { label: '이메일', placeholder: 'name@crefle.com', size: 'md' }
} satisfies Meta<typeof TextField>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const WithHelper: Story = {
  args: { helperText: '회사 이메일을 사용하세요' }
}

export const ErrorState: Story = {
  args: { error: '올바른 이메일 형식이 아닙니다', value: 'not-an-email' }
}

export const Required: Story = {
  args: { required: true, helperText: '필수 입력 항목' }
}

export const Disabled: Story = {
  args: { disabled: true, value: '수정 불가' }
}

export const DisabledWithReason: Story = {
  args: {
    disabled: true,
    value: '수정 불가',
    disabledReason: '외부 시스템 원본 값이라 수정할 수 없습니다'
  }
}

export const WithIcons: Story = {
  args: {
    leadingIcon: <Icon name="mail" size={20} />,
    trailingIcon: <Icon name="cancel" size={20} />
  }
}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
        <div key={s} style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <TextField label="이름" size={s} placeholder="홍길동" helperText="표시 이름을 입력하세요" />
          <TextField label="이름" size={s} placeholder="홍길동" defaultValue="홍길동" />
          <TextField label="이름" size={s} placeholder="홍길동" error="필수 항목입니다" />
          <TextField label="이름" size={s} placeholder="홍길동" disabled defaultValue="수정 불가" />
          <TextField
            label="이름"
            size={s}
            placeholder="홍길동"
            disabled
            defaultValue="수정 불가"
            disabledReason="외부 시스템 원본 값이라 수정할 수 없습니다"
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <TextField
          label="검색"
          placeholder="홍길동"
          leadingIcon={<Icon name="search" size={20} />}
          trailingIcon={<Icon name="cancel" size={20} />}
        />
        <TextField
          label="이름"
          placeholder="홍길동"
          error="필수 항목입니다"
          trailingIcon={<Icon name="error" size={20} />}
        />
      </div>
      <div style={{ width: 320 }}>
        <TextField label="이름" placeholder="홍길동" helperText="표시 이름을 입력하세요" fullWidth />
      </div>
    </div>
  )
}
