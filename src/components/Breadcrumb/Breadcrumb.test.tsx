import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const items: BreadcrumbItem[] = [
  { label: '홈', href: '/' },
  { label: '제품', href: '/products' },
  { label: '센서', href: '/products/sensors' },
  { label: 'CX-500', href: '/products/sensors/cx-500' },
  { label: '사양' }
]

test('nav[aria-label]과 ordered list로 렌더하고 마지막 항목만 현재 위치(비링크)로 표시한다', () => {
  const { container } = render(<Breadcrumb items={items} />)
  const nav = screen.getByRole('navigation', { name: '탐색 경로' })
  expect(nav).toBeInTheDocument()
  expect(container.querySelector('ol')).toBeTruthy()
  const current = screen.getByText('사양')
  expect(current).toHaveAttribute('aria-current', 'page')
  expect(current.closest('a')).toBeNull()
  expect(screen.queryByRole('link', { name: '사양' })).toBeNull()
})

test('현재가 아닌 href 항목은 href를 가진 링크로 렌더된다', () => {
  render(<Breadcrumb items={items} />)
  expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: '제품' })).toHaveAttribute('href', '/products')
  // 4개 링크(마지막 현재 항목 제외)
  expect(screen.getAllByRole('link')).toHaveLength(4)
})

test('구분자는 항목 사이(N-1개)에만 있고 aria-hidden이다', () => {
  const { container } = render(<Breadcrumb items={items} />)
  const seps = container.querySelectorAll('[data-crefle-separator]')
  expect(seps).toHaveLength(items.length - 1)
  seps.forEach((s) => expect(s).toHaveAttribute('aria-hidden', 'true'))
})

test('maxItems 초과 시 첫 항목 + … + 마지막 2개로 축약한다', () => {
  render(<Breadcrumb items={items} maxItems={3} />)
  // 노출: 홈, (…), CX-500, 사양
  expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'CX-500' })).toBeInTheDocument()
  expect(screen.getByText('사양')).toHaveAttribute('aria-current', 'page')
  // 숨김: 제품, 센서
  expect(screen.queryByRole('link', { name: '제품' })).toBeNull()
  expect(screen.queryByRole('link', { name: '센서' })).toBeNull()
  // 생략 트리거
  const trigger = screen.getByRole('button', { name: '생략된 경로 펼치기' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

test('생략 버튼 클릭 시 숨은 항목이 모두 펼쳐지고 트리거가 사라진다', async () => {
  render(<Breadcrumb items={items} maxItems={3} />)
  await userEvent.click(screen.getByRole('button', { name: '생략된 경로 펼치기' }))
  expect(screen.getByRole('link', { name: '제품' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '센서' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '생략된 경로 펼치기' })).toBeNull()
  expect(screen.getAllByRole('link')).toHaveLength(4)
})

test('Tab으로 생략 버튼에 도달하고 Enter로 확장한다', async () => {
  render(<Breadcrumb items={items} maxItems={3} />)
  await userEvent.tab()
  expect(screen.getByRole('link', { name: '홈' })).toHaveFocus()
  await userEvent.tab()
  const trigger = screen.getByRole('button', { name: '생략된 경로 펼치기' })
  expect(trigger).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  expect(screen.getByRole('link', { name: '센서' })).toBeInTheDocument()
})

test('aria-label override + rest props가 nav로 전달된다', () => {
  const overrideItems: BreadcrumbItem[] = [
    { label: '홈', href: '/' },
    { label: '문서', href: '/docs' },
    { label: '가이드' }
  ]
  render(<Breadcrumb items={overrideItems} aria-label="문서 경로" data-testid="bc" />)
  const nav = screen.getByRole('navigation', { name: '문서 경로' })
  expect(nav).toHaveAttribute('data-testid', 'bc')
})

test('href 없는 비현재 항목은 링크가 아니다', () => {
  const mixedItems: BreadcrumbItem[] = [
    { label: '홈', href: '/' },
    { label: '분류' }, // href 없음, 비현재 → 정적 텍스트
    { label: '항목', href: '/x' },
    { label: '상세' } // 현재
  ]
  render(<Breadcrumb items={mixedItems} />)
  expect(screen.queryByRole('link', { name: '분류' })).toBeNull()
  expect(screen.getByText('분류')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '항목' })).toHaveAttribute('href', '/x')
})
