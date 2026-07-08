import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { AppShell, useAppShell } from './AppShell'
import { Sidebar, SidebarItem, Topbar } from '../Navigation/Navigation'

test('AppShell가 main만 추가하고 nav/banner는 슬롯에서 온다', () => {
  render(
    <AppShell
      topbar={<Topbar aria-label="앱 바" brand={<span>CREFLE</span>} />}
      sidebar={
        <Sidebar aria-label="주요 탐색" collapsible={false}>
          <SidebarItem icon="dashboard" href="/" active>대시보드</SidebarItem>
        </Sidebar>
      }
      mainLabel="본문"
    >
      <p>콘텐츠</p>
    </AppShell>
  )
  // 각 랜드마크가 정확히 하나
  expect(screen.getAllByRole('main')).toHaveLength(1)
  expect(screen.getAllByRole('navigation', { name: '주요 탐색' })).toHaveLength(1)
  expect(screen.getAllByRole('banner')).toHaveLength(1)
  // main은 skip 타깃: tabIndex=-1 + 접근명
  const main = screen.getByRole('main', { name: '본문' })
  expect(main).toHaveAttribute('tabindex', '-1')
  expect(main).toHaveTextContent('콘텐츠')
})

test('skip-to-content 링크가 mainId를 정확히 가리키고 첫 탭에서 포커스된다', async () => {
  const user = userEvent.setup()
  render(
    <AppShell mainId="main-content" skipLinkLabel="본문으로 건너뛰기"><p>본문</p></AppShell>
  )
  const link = screen.getByRole('link', { name: '본문으로 건너뛰기' })
  expect(link).toHaveAttribute('href', '#main-content')
  // main의 실제 id와 링크 타깃이 일치
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  // 문서의 첫 탭 정지점 = skip 링크
  await user.tab()
  expect(link).toHaveFocus()
})

test('collapsed prop이 루트 data-collapsed를 제어한다', () => {
  const { rerender, container } = render(
    <AppShell collapsed={false}><p>x</p></AppShell>
  )
  const root = container.firstElementChild as HTMLElement
  expect(root).toHaveAttribute('data-collapsed', 'false')
  rerender(<AppShell collapsed={true}><p>x</p></AppShell>)
  expect(root).toHaveAttribute('data-collapsed', 'true')
})

function RailToggle() {
  const { collapsed, setCollapsed } = useAppShell()
  return <button onClick={() => setCollapsed(!collapsed)}>토글</button>
}

test('슬롯 내부 커스텀 토글이 접힘을 뒤집고 콜백을 호출한다', async () => {
  const user = userEvent.setup()
  const onCollapsedChange = vi.fn()
  const { container } = render(
    <AppShell defaultCollapsed={false} onCollapsedChange={onCollapsedChange}
      topbar={<RailToggle />}><p>x</p></AppShell>
  )
  const root = container.firstElementChild as HTMLElement
  expect(root).toHaveAttribute('data-collapsed', 'false')
  await user.click(screen.getByRole('button', { name: '토글' }))
  expect(onCollapsedChange).toHaveBeenCalledWith(true)
  // 비제어이므로 내부 상태가 갱신되어 data-collapsed가 뒤집힌다
  expect(root).toHaveAttribute('data-collapsed', 'true')
})

test('rest는 루트에 스프레드되고 data-collapsed는 소비자가 덮지 못한다', () => {
  const { container } = render(
    <AppShell
      className="custom"
      data-testid="shell"
      id="my-shell"
      collapsed={true}
      // 소비자가 강제로 넣어도 컴포넌트 소유 속성이 뒤에 스프레드되어 이긴다
      data-collapsed={false as unknown as boolean}
    >
      <p>x</p>
    </AppShell>
  )
  const root = container.firstElementChild as HTMLElement
  expect(root).toHaveClass('custom')          // cx로 병합 (styles.shell + custom)
  expect(root).toHaveAttribute('data-testid', 'shell')
  expect(root).toHaveAttribute('id', 'my-shell')
  expect(root).toHaveAttribute('data-collapsed', 'true') // 상태가 소비자 값을 덮음
})
