import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from './EmptyState'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import styles from './EmptyState.module.css'

test('title과 description을 렌더한다', () => {
  render(<EmptyState title="데이터가 없습니다" description="첫 항목을 추가해 보세요" />)
  expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument()
  expect(screen.getByText('첫 항목을 추가해 보세요')).toBeInTheDocument()
})

test('action 슬롯의 버튼 클릭이 전달된다', async () => {
  const onClick = vi.fn()
  render(
    <EmptyState
      title="결과 없음"
      action={<Button onClick={onClick}>새로 만들기</Button>}
    />
  )
  await userEvent.click(screen.getByRole('button', { name: '새로 만들기' }))
  expect(onClick).toHaveBeenCalledOnce()
})

test('primary/secondary 액션을 모두 렌더한다', () => {
  render(
    <EmptyState
      title="결과 없음"
      action={<Button>새로 만들기</Button>}
      secondaryAction={<Button variant="text">도움말</Button>}
    />
  )
  expect(screen.getByRole('button', { name: '새로 만들기' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '도움말' })).toBeInTheDocument()
})

test('size 클래스가 적용된다 (기본 md)', () => {
  const { rerender, container } = render(<EmptyState title="빈 상태" />)
  expect(container.firstChild).toHaveClass(styles.md)
  rerender(<EmptyState title="빈 상태" size="lg" />)
  expect(container.firstChild).toHaveClass(styles.lg)
})

test('live면 role=status, 기본은 status 없음', () => {
  const { rerender } = render(<EmptyState title="검색 결과가 없습니다" live />)
  expect(screen.getByRole('status')).toHaveTextContent('검색 결과가 없습니다')
  rerender(<EmptyState title="검색 결과가 없습니다" />)
  expect(screen.queryByRole('status')).toBeNull()
})

test('icon 슬롯은 장식용 aria-hidden 래퍼에 담긴다', () => {
  const { container } = render(
    <EmptyState title="빈 상태" icon={<Icon name="inbox" />} />
  )
  const iconWrap = container.querySelector(`.${styles.icon}`)
  expect(iconWrap).not.toBeNull()
  expect(iconWrap).toHaveAttribute('aria-hidden', 'true')
})

test('consumer className과 data-* 속성을 병합한다 (소비자 우선)', () => {
  const { container } = render(
    <EmptyState title="빈 상태" className="mine" data-testid="es" />
  )
  const root = container.firstChild as HTMLElement
  expect(root).toHaveClass('mine')
  expect(root).toHaveClass(styles.root)
  expect(root).toHaveAttribute('data-testid', 'es')
})
