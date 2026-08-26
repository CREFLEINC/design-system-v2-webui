import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextArea } from './TextArea'

const meta = {
  title: 'Components/TextArea',
  component: TextArea,
  args: { label: '비고', placeholder: '전달할 내용을 입력하세요', size: 'md' }
} satisfies Meta<typeof TextArea>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const WithHelper: Story = {
  args: { helperText: '최대한 구체적으로 작성해 주세요' }
}

export const WithCount: Story = {
  args: { maxLength: 200, helperText: '최대 200자까지 입력할 수 있습니다' }
}

export const ErrorState: Story = {
  args: { error: '필수 항목입니다', value: '' }
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

export const AutoResize: Story = {
  args: {
    rows: 3,
    maxRows: 8,
    helperText: '내용이 길어지면 최대 8줄까지 자동으로 늘어나고, 그 이후에는 내부 스크롤됩니다'
  }
}

export const OverLimit: Story = {
  args: {
    maxLength: 20,
    defaultValue: '이 값은 스무 글자라는 상한을 이미 넘어선 상태입니다'
  }
}

export const ResizeNone: Story = {
  args: { resize: 'none', helperText: '사용자가 크기를 조절할 수 없습니다' }
}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
        <div key={s} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <TextArea
            label="비고"
            size={s}
            placeholder="전달할 내용을 입력하세요"
            helperText="구체적으로 작성해 주세요"
          />
          <TextArea
            label="비고"
            size={s}
            placeholder="전달할 내용을 입력하세요"
            defaultValue="확인했습니다. 문제 없이 진행하겠습니다."
          />
          <TextArea
            label="비고"
            size={s}
            placeholder="전달할 내용을 입력하세요"
            error="필수 항목입니다"
          />
          <TextArea
            label="비고"
            size={s}
            placeholder="전달할 내용을 입력하세요"
            disabled
            defaultValue="수정 불가"
          />
          <TextArea
            label="비고"
            size={s}
            placeholder="전달할 내용을 입력하세요"
            disabled
            defaultValue="수정 불가"
            disabledReason="외부 시스템 원본 값이라 수정할 수 없습니다"
          />
        </div>
      ))}
      <div style={{ width: 320 }}>
        <TextArea
          label="비고"
          placeholder="전달할 내용을 입력하세요"
          helperText="메모를 자유롭게 남겨주세요"
          fullWidth
        />
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <TextArea
          label="비고"
          placeholder="전달할 내용을 입력하세요"
          maxLength={200}
          defaultValue="글자 수 카운터가 노출됩니다."
        />
        <TextArea
          label="비고"
          placeholder="전달할 내용을 입력하세요"
          maxLength={20}
          defaultValue="이 값은 스무 글자라는 상한을 이미 넘어선 상태입니다"
        />
      </div>
    </div>
  )
}
