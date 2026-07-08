import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { SearchInput } from './SearchInput'
import styles from './SearchInput.module.css'

test('타이핑하면 clear 버튼이 나타나고 onChange가 발화한다', async () => {
  const onChange = vi.fn()
  render(<SearchInput aria-label="검색" onChange={onChange} />)
  const input = screen.getByRole('searchbox')
  expect(screen.queryByRole('button', { name: '지우기' })).toBeNull()
  await userEvent.type(input, '스마트폰')
  expect(input).toHaveValue('스마트폰')
  expect(onChange).toHaveBeenCalled()
  expect(screen.getByRole('button', { name: '지우기' })).toBeInTheDocument()
})

test('Enter를 누르면 onSearch가 현재 값과 함께 호출된다', async () => {
  const onSearch = vi.fn()
  render(<SearchInput aria-label="검색" onSearch={onSearch} />)
  await userEvent.type(screen.getByRole('searchbox'), '노트북{Enter}')
  expect(onSearch).toHaveBeenCalledWith('노트북')
})

test('clear 버튼은 값을 비우고 input으로 포커스를 되돌린다', async () => {
  const onChange = vi.fn()
  render(<SearchInput aria-label="검색" defaultValue="키워드" onChange={onChange} />)
  const input = screen.getByRole('searchbox')
  expect(input).toHaveValue('키워드')
  onChange.mockClear()
  await userEvent.click(screen.getByRole('button', { name: '지우기' }))
  expect(input).toHaveValue('')
  expect(input).toHaveFocus()
  expect(onChange).toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: '지우기' })).toBeNull()
})

test('loading이면 검색 아이콘 대신 스피너가 표시된다', () => {
  const { container, rerender } = render(<SearchInput aria-label="검색" />)
  expect(screen.getByText('search')).toBeInTheDocument()
  expect(container.querySelector(`.${styles.spinner}`)).toBeNull()
  rerender(<SearchInput aria-label="검색" loading />)
  expect(screen.queryByText('search')).toBeNull()
  expect(container.querySelector(`.${styles.spinner}`)).toBeTruthy()
})

test('controlled 모드에서 value가 반영되고 clear가 빈 값 onChange를 발화시킨다', async () => {
  function Ctrl() {
    const [v, setV] = useState('초기값')
    return <SearchInput aria-label="검색" value={v} onChange={(e) => setV(e.target.value)} />
  }
  render(<Ctrl />)
  const input = screen.getByRole('searchbox')
  expect(input).toHaveValue('초기값')
  await userEvent.click(screen.getByRole('button', { name: '지우기' }))
  expect(input).toHaveValue('')
})

test('error면 aria-invalid이고 helperText 대신 에러를 보여준다', () => {
  render(<SearchInput aria-label="검색" helperText="도움말" error="검색어를 입력하세요" />)
  const input = screen.getByRole('searchbox')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText('검색어를 입력하세요')).toBeInTheDocument()
  expect(screen.queryByText('도움말')).not.toBeInTheDocument()
  const describedBy = input.getAttribute('aria-describedby')!
  expect(document.getElementById(describedBy)).toHaveTextContent('검색어를 입력하세요')
})

test('ref가 실제 input(searchbox)으로 전달된다', () => {
  const ref = createRef<HTMLInputElement>()
  render(<SearchInput aria-label="검색" ref={ref} />)
  expect(ref.current).toBe(screen.getByRole('searchbox'))
  ref.current?.focus()
  expect(ref.current).toHaveFocus()
})

test('disabled면 입력이 차단되고 clear 버튼이 없다', async () => {
  const onChange = vi.fn()
  render(<SearchInput aria-label="검색" disabled defaultValue="고정" onChange={onChange} />)
  const input = screen.getByRole('searchbox')
  expect(input).toBeDisabled()
  expect(screen.queryByRole('button', { name: '지우기' })).toBeNull()
  await userEvent.type(input, '변경')
  expect(onChange).not.toHaveBeenCalled()
})
