import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs, type TabItem } from './Tabs'
import { Icon } from '../Icon/Icon'
import { Badge } from '../Chip/Badge'

const items: TabItem[] = [
  { value: 'overview', label: '개요', content: <p style={{ padding: 16 }}>개요 패널</p> },
  { value: 'settings', label: '설정', content: <p style={{ padding: 16 }}>설정 패널</p> },
  { value: 'members', label: '멤버', content: <p style={{ padding: 16 }}>멤버 패널</p> }
]

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  args: { size: 'md', 'aria-label': '프로젝트 뷰', items }
} satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj<typeof meta>

// 비제어 — defaultValue는 첫 번째 enabled 탭, 화살표/Home/End로 이동
export const Playground: Story = {}

export const WithIcons: Story = {
  args: {
    'aria-label': '대시보드',
    items: [
      {
        value: 'dashboard',
        label: (
          <>
            <Icon name="dashboard" size={20} />대시보드
          </>
        ),
        content: <p style={{ padding: 16 }}>대시보드 패널</p>
      },
      {
        value: 'analytics',
        label: (
          <>
            <Icon name="analytics" size={20} />분석
          </>
        ),
        content: <p style={{ padding: 16 }}>분석 패널</p>
      },
      {
        value: 'reports',
        label: (
          <>
            <Icon name="description" size={20} />보고서
          </>
        ),
        content: <p style={{ padding: 16 }}>보고서 패널</p>
      }
    ]
  }
}

// 제어 모드 — 선택은 부모가 결정한다
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState('settings')
    return (
      <div>
        <p style={{ marginBottom: 12 }}>선택은 부모 상태가 제어합니다. 현재: {value}</p>
        <Tabs {...args} value={value} onChange={setValue} />
      </div>
    )
  }
}

// 뱃지 유/무 · 0 표기 정책 · max 초과 표기를 한 화면에서 확인.
// 0 정책: <Badge count={0}/>는 Badge 자체 동작으로 null을 반환해 숨겨진다(Tabs에 별도 옵션 없음).
// 노출하려면 소비자가 <Badge count={0} showZero/>로 명시한다. max(기본 99) 초과는 '99+'로 축약된다.
export const WithBadge: Story = {
  args: {
    'aria-label': '뱃지 데모',
    items: [
      {
        value: 'pending',
        label: '결재 대기',
        content: <p style={{ padding: 16 }}>결재 대기 패널</p>,
        badge: <Badge count={3} />
      },
      { value: 'plain', label: '뱃지 없음', content: <p style={{ padding: 16 }}>뱃지 없음 패널</p> },
      {
        value: 'zero-hidden',
        label: '0건(숨김)',
        content: <p style={{ padding: 16 }}>count=0 — 기본값은 뱃지 숨김</p>,
        badge: <Badge count={0} />
      },
      {
        value: 'zero-shown',
        label: '0건(노출)',
        content: <p style={{ padding: 16 }}>count=0 showZero — 뱃지 노출</p>,
        badge: <Badge count={0} showZero />
      },
      {
        value: 'over-max',
        label: '초과',
        content: <p style={{ padding: 16 }}>count=120 — max(99) 초과로 '99+' 표기</p>,
        badge: <Badge count={120} />
      }
    ]
  }
}

// Matrix — 사이즈 x 상태 (기본 / 아이콘 / disabled / 뱃지). renderVerify 스크린샷 타깃.
export const Matrix: Story = {
  render: () => {
    const rowItems: TabItem[] = [
      { value: 'a', label: '개요', content: <p style={{ padding: 12 }}>개요</p> },
      {
        value: 'b',
        label: (
          <>
            <Icon name="settings" size={20} />설정
          </>
        ),
        content: <p style={{ padding: 12 }}>설정</p>
      },
      { value: 'c', label: '멤버', content: <p style={{ padding: 12 }}>멤버</p> },
      {
        value: 'd',
        label: '뱃지',
        content: <p style={{ padding: 12 }}>뱃지</p>,
        badge: <Badge count={3} />
      },
      { value: 'x', label: '비활성', content: <p style={{ padding: 12 }}>비활성</p>, disabled: true }
    ]
    return (
      <div style={{ display: 'grid', gap: 32 }}>
        {(['sm', 'md'] as const).map((s) => (
          <div key={s} style={{ display: 'grid', gap: 8 }}>
            <strong>size = {s}</strong>
            <Tabs size={s} items={rowItems} defaultValue="a" aria-label={`매트릭스 ${s}`} />
          </div>
        ))}
      </div>
    )
  }
}
