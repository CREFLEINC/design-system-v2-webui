import { expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar, SidebarItem, SidebarSection, Topbar } from './Navigation'

test('nav 랜드마크 + active 항목 aria-current', () => {
  render(
    <Sidebar aria-label="주요 탐색">
      <SidebarItem icon="dashboard" href="/dash" active>대시보드</SidebarItem>
      <SidebarItem icon="inbox" href="/inbox">받은함</SidebarItem>
    </Sidebar>
  )
  expect(screen.getByRole('navigation', { name: '주요 탐색' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '대시보드' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: '받은함' })).not.toHaveAttribute('aria-current')
})

test('비제어 접힘 토글 + 접근명 보존', async () => {
  const user = userEvent.setup()
  render(
    <Sidebar aria-label="탐색" defaultCollapsed={false}>
      <SidebarItem icon="dashboard" href="/d">대시보드</SidebarItem>
    </Sidebar>
  )
  const toggle = screen.getByRole('button', { name: /접기|펼치기/ })
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument()
  await user.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  // collapsed: 라벨은 visually-hidden(clip)이라 접근명은 그대로 조회된다
  expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument()
})

test('제어 접힘', async () => {
  const user = userEvent.setup()
  const onCollapsedChange = vi.fn()
  render(
    <Sidebar aria-label="탐색" collapsed={false} onCollapsedChange={onCollapsedChange}>
      <SidebarItem icon="dashboard" href="/d">대시보드</SidebarItem>
    </Sidebar>
  )
  const toggle = screen.getByRole('button', { name: /접기|펼치기/ })
  await user.click(toggle)
  expect(onCollapsedChange).toHaveBeenCalledWith(true)
  // 부모가 collapsed를 갱신하지 않았으므로 여전히 펼침 상태
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
})

test('화살표 로빙 + disabled skip', async () => {
  const user = userEvent.setup()
  render(
    <Sidebar aria-label="탐색">
      <SidebarItem icon="a" href="/a">가</SidebarItem>
      <SidebarItem icon="b" href="/b" disabled>나</SidebarItem>
      <SidebarItem icon="c" href="/c">다</SidebarItem>
    </Sidebar>
  )
  const first = screen.getByRole('link', { name: '가' })
  first.focus()
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('link', { name: '다' })).toHaveFocus() // 나(disabled) 건너뜀
  await user.keyboard('{ArrowUp}')
  expect(first).toHaveFocus()
  await user.keyboard('{End}')
  expect(screen.getByRole('link', { name: '다' })).toHaveFocus()
  await user.keyboard('{Home}')
  expect(first).toHaveFocus()
})

test('disabled 항목 클릭 차단', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(
    <Sidebar aria-label="탐색">
      <SidebarItem icon="a" href="/a" disabled onClick={onClick}>가</SidebarItem>
    </Sidebar>
  )
  const link = screen.getByRole('link', { name: '가' })
  expect(link).toHaveAttribute('aria-disabled', 'true')
  expect(link).toHaveAttribute('tabindex', '-1')
  await user.click(link)
  expect(onClick).not.toHaveBeenCalled()
})

test('소비자 onClick 합성', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(
    <Sidebar aria-label="탐색">
      <SidebarItem icon="a" href="#" onClick={onClick}>가</SidebarItem>
    </Sidebar>
  )
  await user.click(screen.getByRole('link', { name: '가' }))
  expect(onClick).toHaveBeenCalledTimes(1)
})

test('섹션 그룹핑', () => {
  render(
    <Sidebar aria-label="탐색">
      <SidebarSection label="관리">
        <SidebarItem icon="a" href="/a">가</SidebarItem>
      </SidebarSection>
    </Sidebar>
  )
  const group = screen.getByRole('group', { name: '관리' })
  expect(within(group).getByRole('link', { name: '가' })).toBeInTheDocument()
})

test('Topbar 슬롯', () => {
  render(
    <Topbar
      aria-label="앱 바"
      brand={<span>CREFLE</span>}
      breadcrumb={<a href="/">홈</a>}
      actions={<button>프로필</button>}
    />
  )
  expect(screen.getByText('CREFLE')).toBeInTheDocument()
  const bc = screen.getByRole('navigation', { name: '브레드크럼' })
  expect(within(bc).getByRole('link', { name: '홈' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '프로필' })).toBeInTheDocument()
})
