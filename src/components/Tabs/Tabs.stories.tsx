import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs, type TabItem } from './Tabs'
import { Icon } from '../Icon/Icon'

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

// Matrix — 사이즈 x 상태 (기본 / 아이콘 / disabled). renderVerify 스크린샷 타깃.
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
