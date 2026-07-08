import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppShell } from './AppShell'
import { Sidebar, SidebarItem, SidebarSection, Topbar } from '../Navigation/Navigation'
import { Breadcrumb } from '../Breadcrumb/Breadcrumb'
import { Button } from '../Button/Button'
import { IconButton } from '../IconButton/IconButton'
import { Icon } from '../Icon/Icon'
import { Badge } from '../Chip/Badge'
import { StatCard } from '../StatCard/StatCard'

const meta = {
  title: 'Components/AppShell',
  component: AppShell,
  args: { children: null }
} satisfies Meta<typeof AppShell>
export default meta
type Story = StoryObj<typeof meta>

/** 제어 접힘: 하나의 useState를 AppShell과 Sidebar 슬롯에 함께 배선 — 사이드바 내장 토글이 그리드/라벨을 동시에 움직이는 정석 사용 */
export const Playground: Story = {
  render: () => {
    function Demo() {
      const [collapsed, setCollapsed] = useState(false)
      return (
        <div style={{ height: 480 }}>
          <AppShell
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            topbar={
              <Topbar
                aria-label="앱 바"
                brand={<strong>CREFLE</strong>}
                breadcrumb={
                  <Breadcrumb
                    items={[{ label: '홈', href: '/' }, { label: '대시보드' }]}
                  />
                }
                actions={
                  <>
                    <IconButton icon="notifications" aria-label="알림" />
                    <Button variant="text" leadingIcon={<Icon name="account_circle" size={20} />}>프로필</Button>
                  </>
                }
              />
            }
            sidebar={
              <Sidebar
                aria-label="주요 탐색"
                collapsed={collapsed}
                onCollapsedChange={setCollapsed}
                header={<strong style={{ color: 'var(--on-surface)' }}>CREFLE</strong>}
              >
                <SidebarSection label="워크스페이스">
                  <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
                  <SidebarItem icon="inbox" href="/inbox" badge={<Badge count={3} />}>받은함</SidebarItem>
                  <SidebarItem icon="factory" href="/lines">생산 라인</SidebarItem>
                </SidebarSection>
                <SidebarSection label="설정">
                  <SidebarItem icon="group" href="/members">구성원</SidebarItem>
                </SidebarSection>
              </Sidebar>
            }
            mainLabel="본문"
          >
            <div style={{ display: 'grid', gap: 16 }}>
              <h1 style={{ font: 'var(--type-title-lg)', color: 'var(--on-surface)', margin: 0 }}>대시보드</h1>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ width: 200 }}>
                  <StatCard label="설비 A 가동률" value="98.2" unit="%" delta={{ direction: 'up', value: '+3.2%' }} />
                </div>
                <div style={{ width: 200 }}>
                  <StatCard label="주간 생산량" value="1,240" unit="건" delta={{ direction: 'down', value: '-1.1%' }} />
                </div>
              </div>
              <p style={{ color: 'var(--on-surface-muted)' }}>
                사이드바 내장 토글을 눌러 접힘 상태가 그리드 컬럼과 함께 바뀌는지 확인하세요.
              </p>
            </div>
          </AppShell>
        </div>
      )
    }
    return <Demo />
  }
}

/** defaultCollapsed로 아이콘 레일 초기 상태 */
export const Collapsed: Story = {
  render: () => (
    <div style={{ height: 480 }}>
      <AppShell
        defaultCollapsed
        topbar={<Topbar aria-label="앱 바" brand={<strong>C</strong>} />}
        sidebar={
          <Sidebar aria-label="주요 탐색" defaultCollapsed collapsible={false} header={<strong style={{ color: 'var(--on-surface)' }}>C</strong>}>
            <SidebarSection label="워크스페이스">
              <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
              <SidebarItem icon="inbox" href="/inbox" badge={<Badge count={3} />}>받은함</SidebarItem>
            </SidebarSection>
          </Sidebar>
        }
        mainLabel="본문"
      >
        <h1 style={{ font: 'var(--type-title-lg)', color: 'var(--on-surface)', margin: 0 }}>대시보드</h1>
      </AppShell>
    </div>
  )
}

/** main에 긴 더미 콘텐츠 → topbar/sidebar는 고정, main만 독립 스크롤됨을 시연 */
export const ScrollingMain: Story = {
  render: () => (
    <div style={{ height: 480 }}>
      <AppShell
        topbar={<Topbar aria-label="앱 바" brand={<strong>CREFLE</strong>} />}
        sidebar={
          <Sidebar aria-label="주요 탐색" collapsible={false} header={<strong style={{ color: 'var(--on-surface)' }}>CREFLE</strong>}>
            <SidebarSection label="워크스페이스">
              <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
            </SidebarSection>
          </Sidebar>
        }
        mainLabel="본문"
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <h1 style={{ font: 'var(--type-title-lg)', color: 'var(--on-surface)', margin: 0 }}>긴 본문</h1>
          {Array.from({ length: 20 }, (_, i) => (
            <p key={i} style={{ color: 'var(--on-surface-muted)' }}>
              문단 {i + 1} — 이 영역만 스크롤되고 상단 바와 사이드바는 고정되어야 합니다.
            </p>
          ))}
        </div>
      </AppShell>
    </div>
  )
}

/** Tab 키를 누르면 좌상단에 나타나는 skip-to-content 링크 시연 */
export const SkipLink: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <p style={{ color: 'var(--on-surface-muted)' }}>Tab 키를 누르면 좌상단에 나타납니다.</p>
      <div style={{ height: 480 }}>
        <AppShell
          topbar={<Topbar aria-label="앱 바" brand={<strong>CREFLE</strong>} />}
          sidebar={
            <Sidebar aria-label="주요 탐색" collapsible={false} header={<strong style={{ color: 'var(--on-surface)' }}>CREFLE</strong>}>
              <SidebarSection label="워크스페이스">
                <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
              </SidebarSection>
            </Sidebar>
          }
          mainLabel="본문"
        >
          <h1 style={{ font: 'var(--type-title-lg)', color: 'var(--on-surface)', margin: 0 }}>대시보드</h1>
        </AppShell>
      </div>
    </div>
  )
}

/** 좁은 컨테이너(width 420)로 @media 레일 강제를 시연. 라벨 클립은 알려진 zero-JS 한계 — 실제 모바일 드로어는 future 작업 */
export const Responsive: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <p style={{ color: 'var(--on-surface-muted)' }}>
        768px 이하에서 그리드 좌측 트랙이 아이콘 레일 폭으로 강제됩니다. Sidebar 라벨은 React 상태 기반이라 CSS만으로 숨겨지지 않고 레일 폭에 클립됩니다.
      </p>
      <div style={{ width: 420, height: 480, border: '1px solid var(--outline-variant)' }}>
        <AppShell
          topbar={<Topbar aria-label="앱 바" brand={<strong>C</strong>} />}
          sidebar={
            <Sidebar aria-label="주요 탐색" collapsible={false} header={<strong style={{ color: 'var(--on-surface)' }}>C</strong>}>
              <SidebarSection label="워크스페이스">
                <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
                <SidebarItem icon="inbox" href="/inbox">받은함</SidebarItem>
              </SidebarSection>
            </Sidebar>
          }
          mainLabel="본문"
        >
          <h1 style={{ font: 'var(--type-title-lg)', color: 'var(--on-surface)', margin: 0 }}>대시보드</h1>
        </AppShell>
      </div>
    </div>
  )
}

function MatrixShell({ theme, collapsed }: { theme: 'light' | 'dark'; collapsed: boolean }) {
  return (
    <div data-theme={theme} style={{ background: 'var(--surface)', padding: 24, display: 'grid', gap: 8 }}>
      <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-variant)' }}>
        {theme === 'light' ? '라이트' : '다크'} · {collapsed ? '접힘' : '펼침'}
      </div>
      <div style={{ height: 420, width: 640 }}>
        <AppShell
          defaultCollapsed={collapsed}
          topbar={
            <Topbar
              aria-label="앱 바"
              brand={<strong>CREFLE</strong>}
              breadcrumb={<Breadcrumb items={[{ label: '홈', href: '/' }, { label: '대시보드' }]} />}
              actions={
                <>
                  <IconButton icon="notifications" aria-label="알림" />
                  <Button variant="text">프로필</Button>
                </>
              }
            />
          }
          sidebar={
            <Sidebar
              aria-label="주요 탐색"
              defaultCollapsed={collapsed}
              collapsible={false}
              header={<strong style={{ color: 'var(--on-surface)' }}>CREFLE</strong>}
            >
              <SidebarSection label="워크스페이스">
                <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
                <SidebarItem icon="inbox" href="/inbox" badge={<Badge count={3} />}>받은함</SidebarItem>
                <SidebarItem icon="lock" href="/admin" disabled>관리</SidebarItem>
              </SidebarSection>
              <SidebarSection label="설정">
                <SidebarItem icon="group" href="/members">구성원</SidebarItem>
              </SidebarSection>
            </Sidebar>
          }
          mainLabel="본문"
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <h1 style={{ font: 'var(--type-title-lg)', color: 'var(--on-surface)', margin: 0 }}>대시보드</h1>
            <div style={{ width: 200 }}>
              <StatCard label="설비 A 가동률" value="98.2" unit="%" delta={{ direction: 'up', value: '+3.2%' }} />
            </div>
          </div>
        </AppShell>
      </div>
    </div>
  )
}

/** [라이트/다크] × [펼침/접힘] 4개 풀 셸. 라이트/다크 전수 스크린샷 타깃 */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <MatrixShell theme="light" collapsed={false} />
      <MatrixShell theme="light" collapsed />
      <MatrixShell theme="dark" collapsed={false} />
      <MatrixShell theme="dark" collapsed />
    </div>
  )
}
