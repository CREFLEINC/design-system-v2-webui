import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Tooltip } from './Tooltip'
import styles from './Tooltip.module.css'

// fake-timers 호환 심은 src/test/setup.ts로 이관됨 (모든 컴포넌트 공용).

test('hover하면 delay 후 tooltip이 열린다', async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<Tooltip content="저장합니다"><button>저장</button></Tooltip>)
  await user.hover(screen.getByRole('button', { name: '저장' }))
  expect(screen.queryByRole('tooltip')).toBeNull()
  act(() => { vi.advanceTimersByTime(400) })
  expect(screen.getByRole('tooltip')).toHaveTextContent('저장합니다')
  vi.useRealTimers()
})

test('열리면 aria-describedby가 tooltip id로 연결된다', async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<Tooltip content="도움말"><button>도움</button></Tooltip>)
  const btn = screen.getByRole('button', { name: '도움' })
  expect(btn).not.toHaveAttribute('aria-describedby')
  await user.hover(btn)
  act(() => { vi.advanceTimersByTime(400) })
  const tip = screen.getByRole('tooltip')
  expect(tip.id).not.toBe('')
  expect(btn).toHaveAttribute('aria-describedby', tip.id)
  vi.useRealTimers()
})

test('mouseleave하면 즉시 닫힌다', async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<Tooltip content="도움말"><button>도움</button></Tooltip>)
  const btn = screen.getByRole('button', { name: '도움' })
  await user.hover(btn)
  act(() => { vi.advanceTimersByTime(400) })
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  await user.unhover(btn)
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(btn).not.toHaveAttribute('aria-describedby')
  vi.useRealTimers()
})

test('focus에서 열리고 blur에서 닫힌다', () => {
  vi.useFakeTimers()
  render(<Tooltip content="도움말"><button>도움</button></Tooltip>)
  const btn = screen.getByRole('button', { name: '도움' })
  act(() => { btn.focus() })
  act(() => { vi.advanceTimersByTime(400) })
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  act(() => { btn.blur() })
  expect(screen.queryByRole('tooltip')).toBeNull()
  vi.useRealTimers()
})

test('Escape를 누르면 닫힌다', async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<Tooltip content="도움말"><button>도움</button></Tooltip>)
  const btn = screen.getByRole('button', { name: '도움' })
  act(() => { btn.focus() })
  act(() => { vi.advanceTimersByTime(400) })
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('tooltip')).toBeNull()
  vi.useRealTimers()
})

test('placement 클래스 적용 + delay 존중', () => {
  vi.useFakeTimers()
  render(
    <Tooltip content="도움말" placement="bottom" delay={100}>
      <button>도움</button>
    </Tooltip>,
  )
  act(() => { screen.getByRole('button', { name: '도움' }).focus() })
  act(() => { vi.advanceTimersByTime(99) })
  expect(screen.queryByRole('tooltip')).toBeNull()
  act(() => { vi.advanceTimersByTime(1) })
  const tip = screen.getByRole('tooltip')
  expect(tip.className).toContain(styles.bottom)
  vi.useRealTimers()
})
