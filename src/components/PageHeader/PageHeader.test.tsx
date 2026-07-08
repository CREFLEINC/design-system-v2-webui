import { expect, test } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageHeader } from './PageHeader'

test('제목은 기본 h1로 렌더되고 텍스트를 노출한다', () => {
  render(<PageHeader title="대시보드" />)
  const h = screen.getByRole('heading', { level: 1, name: '대시보드' })
  expect(h.tagName).toBe('H1')
})

test('headingLevel은 시맨틱 레벨만 바꾸고 size(시각)와 분리된다', () => {
  render(<PageHeader title="설비 현황" headingLevel={2} size="compact" />)
  const h = screen.getByRole('heading', { level: 2, name: '설비 현황' })
  expect(h.tagName).toBe('H2')
  // 레벨을 2로 내려도 h1은 존재하지 않음 (시각/시맨틱 분리)
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
})

test('선택 슬롯이 header 안에 모두 렌더된다', () => {
  const { container } = render(
    <PageHeader
      title="주문"
      breadcrumb={<nav aria-label="탐색 경로">경로</nav>}
      description="최근 30일 주문 내역"
      actions={<button>새 주문</button>}
      tabs={<div role="tablist" aria-label="주문 보기">탭</div>}
    />
  )
  const header = container.querySelector('header') as HTMLElement
  expect(header).toBeInTheDocument()
  expect(within(header).getByRole('navigation', { name: '탐색 경로' })).toBeInTheDocument()
  expect(within(header).getByText('최근 30일 주문 내역')).toBeInTheDocument()
  expect(within(header).getByRole('button', { name: '새 주문' })).toBeInTheDocument()
  expect(within(header).getByRole('tablist', { name: '주문 보기' })).toBeInTheDocument()
})

test('선택 슬롯 미지정 시 해당 요소가 렌더되지 않는다', () => {
  render(<PageHeader title="빈 헤더" />)
  expect(screen.queryByRole('navigation')).toBeNull()
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.getByRole('heading', { name: '빈 헤더' })).toBeInTheDocument()
})

test('ref는 header 요소로 전달되고 rest가 스프레드된다', () => {
  const ref = { current: null as HTMLElement | null }
  const { container } = render(
    <PageHeader ref={ref} title="설비" data-testid="ph" aria-label="설비 페이지 헤더" />
  )
  const header = container.querySelector('header') as HTMLElement
  expect(ref.current).toBe(header)
  expect(header.tagName).toBe('HEADER')
  expect(header).toHaveAttribute('data-testid', 'ph')
  expect(header).toHaveAttribute('aria-label', '설비 페이지 헤더')
})

test('actions 슬롯 버튼의 onClick이 삼켜지지 않고 동작한다', async () => {
  const user = userEvent.setup()
  let clicked = 0
  render(
    <PageHeader title="주문" actions={<button onClick={() => { clicked++ }}>내보내기</button>} />
  )
  await user.click(screen.getByRole('button', { name: '내보내기' }))
  expect(clicked).toBe(1)
})

test('size가 root의 data-size로 반영된다', () => {
  const { container, rerender } = render(<PageHeader title="x" size="compact" />)
  expect(container.querySelector('header')).toHaveAttribute('data-size', 'compact')
  rerender(<PageHeader title="x" />)
  expect(container.querySelector('header')).toHaveAttribute('data-size', 'default')
})
