import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Sidebar, SidebarItem, SidebarSection, Topbar } from './Navigation'
import { Badge } from '../Chip/Badge'
import { Button } from '../Button/Button'
import { IconButton } from '../IconButton/IconButton'
import { Icon } from '../Icon/Icon'

const meta = {
  title: 'Components/Navigation',
  component: Sidebar,
  args: { 'aria-label': '주요 탐색', children: null }
} satisfies Meta<typeof Sidebar>
export default meta
type Story = StoryObj<typeof meta>

/** header 브랜드 + 2개 섹션(워크스페이스/설정), active 항목, badge, footer 사용자 슬롯 */
export const SidebarPlayground: Story = {
  render: () => (
    <div style={{ height: 360 }}>
      <Sidebar
        aria-label="주요 탐색"
        header={<strong style={{ color: 'var(--on-surface)' }}>CREFLE</strong>}
        footer={<span style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)' }}>김지구 · 관리자</span>}
      >
        <SidebarSection label="워크스페이스">
          <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
          <SidebarItem icon="inbox" href="/inbox" badge={<Badge count={3} />}>받은함</SidebarItem>
          <SidebarItem icon="factory" href="/lines">생산 라인</SidebarItem>
        </SidebarSection>
        <SidebarSection label="설정">
          <SidebarItem icon="group" href="/members">구성원</SidebarItem>
          <SidebarItem icon="lock" href="/admin" disabled>관리(권한 없음)</SidebarItem>
        </SidebarSection>
      </Sidebar>
    </div>
  )
}

/** defaultCollapsed로 아이콘 레일 */
export const Collapsed: Story = {
  render: () => (
    <div style={{ height: 360 }}>
      <Sidebar
        aria-label="주요 탐색"
        defaultCollapsed
        header={<strong style={{ color: 'var(--on-surface)' }}>C</strong>}
      >
        <SidebarSection label="워크스페이스">
          <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
          <SidebarItem icon="inbox" href="/inbox" badge={<Badge count={3} />}>받은함</SidebarItem>
          <SidebarItem icon="factory" href="/lines">생산 라인</SidebarItem>
        </SidebarSection>
      </Sidebar>
    </div>
  )
}

/** useState로 접힘 제어 + 상태 표기 */
export const ControlledCollapse: Story = {
  render: () => {
    function Demo() {
      const [collapsed, setCollapsed] = useState(false)
      return (
        <div style={{ display: 'grid', gap: 8 }}>
          <span style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)' }}>
            collapsed = {String(collapsed)}
          </span>
          <div style={{ height: 360 }}>
            <Sidebar
              aria-label="주요 탐색"
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
              header={<strong style={{ color: 'var(--on-surface)' }}>CREFLE</strong>}
            >
              <SidebarSection label="워크스페이스">
                <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
                <SidebarItem icon="inbox" href="/inbox">받은함</SidebarItem>
              </SidebarSection>
            </Sidebar>
          </div>
        </div>
      )
    }
    return <Demo />
  }
}

/** brand(로고 텍스트) + breadcrumb(홈/프로젝트/상세 링크) + actions(IconButton 알림 + 프로필 Button) */
export const TopbarPlayground: Story = {
  render: () => (
    <Topbar
      aria-label="앱 바"
      brand={<strong>CREFLE</strong>}
      breadcrumb={
        <>
          <a href="/">홈</a>
          <Icon name="chevron_right" size={16} />
          <a href="/projects">프로젝트</a>
          <Icon name="chevron_right" size={16} />
          <span>상세</span>
        </>
      }
      actions={
        <>
          <IconButton icon="notifications" aria-label="알림" />
          <Button variant="text" leadingIcon={<Icon name="account_circle" size={20} />}>프로필</Button>
        </>
      }
    />
  )
}

/** Topbar + Sidebar 조합(실사용 셸 미리보기, 우측에 더미 본문) */
export const AppShell: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: 420 }}>
      <Topbar
        aria-label="앱 바"
        brand={<strong>CREFLE</strong>}
        breadcrumb={
          <>
            <a href="/">홈</a>
            <Icon name="chevron_right" size={16} />
            <span>대시보드</span>
          </>
        }
        actions={<IconButton icon="notifications" aria-label="알림" />}
      />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar aria-label="주요 탐색" header={<strong style={{ color: 'var(--on-surface)' }}>메뉴</strong>}>
          <SidebarSection label="워크스페이스">
            <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
            <SidebarItem icon="inbox" href="/inbox" badge={<Badge count={3} />}>받은함</SidebarItem>
          </SidebarSection>
        </Sidebar>
        <div style={{ flex: 1, padding: 24, background: 'var(--surface)', color: 'var(--on-surface-muted)' }}>
          본문 영역
        </div>
      </div>
    </div>
  )
}

function MatrixSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <div style={{ height: 360 }}>
      <Sidebar
        aria-label={collapsed ? '탐색(접힘)' : '탐색(펼침)'}
        defaultCollapsed={collapsed}
        collapsible={false}
        header={<strong style={{ color: 'var(--on-surface)' }}>CREFLE</strong>}
      >
        <SidebarSection label="워크스페이스">
          <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
          <SidebarItem icon="inbox" href="/inbox" badge={<Badge count={3} />}>받은함</SidebarItem>
          <SidebarItem icon="lock" href="/admin" disabled>관리</SidebarItem>
        </SidebarSection>
      </Sidebar>
    </div>
  )
}

function MatrixTheme({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div data-theme={theme} style={{ background: 'var(--surface)', padding: 24, display: 'grid', gap: 16 }}>
      <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-variant)' }}>
        {theme === 'light' ? '라이트' : '다크'}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <MatrixSidebar collapsed={false} />
        <MatrixSidebar collapsed />
      </div>
      <Topbar
        aria-label="앱 바"
        brand={<strong>CREFLE</strong>}
        breadcrumb={
          <>
            <a href="/">홈</a>
            <Icon name="chevron_right" size={16} />
            <span>대시보드</span>
          </>
        }
        actions={
          <>
            <IconButton icon="notifications" aria-label="알림" />
            <Button variant="text">프로필</Button>
          </>
        }
      />
    </div>
  )
}

/** [펼침 + 접힘] × [기본/active/badge/disabled 항목] + 섹션 라벨 + 하단 Topbar. 라이트/다크 스크린샷 타깃 */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <MatrixTheme theme="light" />
      <MatrixTheme theme="dark" />
    </div>
  )
}
