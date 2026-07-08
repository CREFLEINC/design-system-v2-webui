import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tooltip } from './Tooltip'
import { Button } from '../Button/Button'

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  args: {
    content: '저장합니다',
    placement: 'top',
    delay: 400,
    children: <Button>저장</Button>,
  },
  argTypes: {
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
    delay: { control: { type: 'number', min: 0, step: 50 } },
  },
} satisfies Meta<typeof Tooltip>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div style={{ padding: 64, display: 'inline-flex' }}>
      <Tooltip {...args}>
        <Button>저장</Button>
      </Tooltip>
    </div>
  ),
}

// Matrix: 모든 placement를 한눈에. delay={0}은 스크린샷 캡처용(실제 기본값은 400ms).
// 툴팁은 hover/focus로만 열리므로, 스크린샷 하네스가 각 트리거를 Tab/focus 해야 버블이 보인다.
export const Matrix: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, max-content)',
        gap: 96,
        padding: 96,
        placeItems: 'center',
      }}
    >
      <Tooltip content="확인" placement="top" delay={0}>
        <Button>확인</Button>
      </Tooltip>
      <Tooltip content="취소" placement="bottom" delay={0}>
        <Button variant="outlined">취소</Button>
      </Tooltip>
      <Tooltip content="설정" placement="left" delay={0}>
        <Button variant="tonal">설정</Button>
      </Tooltip>
      <Tooltip content="삭제합니다" placement="right" delay={0}>
        <Button variant="text">삭제</Button>
      </Tooltip>
    </div>
  ),
}

// 키보드 접근: Tab으로 트리거에 focus하면 열리고, Escape로 닫힌다 (focus는 트리거에 유지).
export const KeyboardAndEscape: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Tab으로 버튼에 focus하면 툴팁이 열리고, Escape를 누르면 focus는 버튼에 남긴 채 툴팁만 닫힌다. 포인터 없이도 완전히 조작 가능하다.',
      },
    },
  },
  render: () => (
    <div style={{ padding: 64, display: 'inline-flex' }}>
      <Tooltip content="Tab으로 열고 Esc로 닫기" placement="bottom">
        <Button>도움말</Button>
      </Tooltip>
    </div>
  ),
}
