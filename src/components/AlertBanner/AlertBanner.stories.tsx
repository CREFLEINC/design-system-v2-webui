import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AlertBanner } from './AlertBanner'
import { Button } from '../Button/Button'

const meta = {
  title: 'Components/AlertBanner',
  component: AlertBanner,
  args: { variant: 'info', title: '안내', children: '변경 사항이 저장되었습니다.' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['success', 'error', 'warning', 'info'] },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AlertBanner>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AlertBanner variant="success" title="저장 완료">
        변경 사항이 성공적으로 저장되었습니다.
      </AlertBanner>
      <AlertBanner variant="error" title="저장 실패">
        네트워크를 확인하고 다시 시도하세요.
      </AlertBanner>
      <AlertBanner variant="warning" title="용량 부족">
        저장 공간이 얼마 남지 않았습니다.
      </AlertBanner>
      <AlertBanner variant="info" title="안내">
        새 버전이 곧 배포될 예정입니다.
      </AlertBanner>
    </div>
  ),
}

export const WithAction: Story = {
  render: () => (
    <AlertBanner
      variant="error"
      title="업로드 실패"
      action={
        <Button size="sm" variant="tonal">
          재시도
        </Button>
      }
    >
      파일 업로드 중 오류가 발생했습니다.
    </AlertBanner>
  ),
}

export const Dismissible: Story = {
  render: function DismissibleStory() {
    const [visible, setVisible] = useState(true)
    return visible ? (
      <AlertBanner
        variant="info"
        title="업데이트 안내"
        dismissLabel="알림 닫기"
        onDismiss={() => setVisible(false)}
      >
        시스템 점검이 오늘 밤 진행됩니다.
      </AlertBanner>
    ) : (
      <Button size="sm" variant="outlined" onClick={() => setVisible(true)}>
        다시 표시
      </Button>
    )
  },
}

export const TitleOnly: Story = {
  args: { variant: 'success', title: '저장되었습니다.', children: undefined },
}

export const DescriptionOnly: Story = {
  args: { variant: 'warning', title: undefined, children: '입력값을 다시 확인해주세요.' },
}

export const NoIcon: Story = {
  args: { variant: 'info', icon: false, title: '아이콘 없음', children: '앞머리 아이콘을 숨긴 배너입니다.' },
}

/**
 * assertive prop으로 success의 라이브 강도를 role="alert"(assertive)로 강제하는 데모.
 * 시각적으로는 일반 success 배너와 동일하며, 스크린리더 낭독 우선순위만 달라진다.
 */
export const Assertive: Story = {
  args: {
    variant: 'success',
    assertive: true,
    title: '긴급 알림',
    children: '이 성공 메시지는 스크린리더에서 즉시(assertive) 낭독됩니다.',
  },
}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['success', 'error', 'warning', 'info'] as const).map((v) => (
        <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AlertBanner
            variant={v}
            title="제목과 설명, 닫기"
            dismissLabel="닫기"
            onDismiss={() => {}}
          >
            {v} variant의 설명 텍스트입니다.
          </AlertBanner>
          <AlertBanner variant={v}>설명만 있는 {v} 배너입니다.</AlertBanner>
          <AlertBanner
            variant={v}
            title="액션 포함"
            action={
              <Button size="sm" variant="tonal">
                확인
              </Button>
            }
          >
            {v} variant에 액션 버튼이 있는 배너입니다.
          </AlertBanner>
        </div>
      ))}
    </div>
  ),
}
