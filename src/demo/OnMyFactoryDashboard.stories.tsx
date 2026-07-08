import type { Meta, StoryObj } from '@storybook/react-vite'
import { OnMyFactoryDashboard } from './OnMyFactoryDashboard'

// CAPSTONE — 배포된 @crefle/web-ui 라이브러리를 실제 소비 앱처럼 조립한 전체 페이지.
// 테마는 하드코딩하지 않는다: Storybook 툴바(Theme)가 <html data-theme>를 세팅하며
// 라이트/다크 모두에서 올바르게 렌더되어야 한다.
const meta = {
  title: 'Pages/OnMyFactory Dashboard',
  component: OnMyFactoryDashboard,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof OnMyFactoryDashboard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
