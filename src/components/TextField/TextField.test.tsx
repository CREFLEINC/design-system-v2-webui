import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { TextField } from './TextField'
import { Icon } from '../Icon/Icon'
import styles from './TextField.module.css'

test('label이 input과 연결되고 onChange로 입력이 전달된다', async () => {
  const onChange = vi.fn()
  render(<TextField label="이름" onChange={onChange} />)
  const input = screen.getByLabelText('이름')
  await userEvent.type(input, '홍길동')
  expect(input).toHaveValue('홍길동')
  expect(onChange).toHaveBeenCalled()
})

test('helperText가 렌더되고 aria-describedby로 연결된다', () => {
  render(<TextField label="이메일" helperText="회사 이메일을 입력하세요" />)
  const input = screen.getByLabelText('이메일')
  const describedBy = input.getAttribute('aria-describedby')
  expect(describedBy).toBeTruthy()
  expect(document.getElementById(describedBy!)).toHaveTextContent('회사 이메일을 입력하세요')
  expect(input).not.toHaveAttribute('aria-invalid')
})

test('error면 aria-invalid=true이고 helperText 대신 에러 메시지를 보여준다', () => {
  render(<TextField label="이메일" helperText="도움말" error="필수 항목입니다" />)
  const input = screen.getByLabelText('이메일')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText('필수 항목입니다')).toBeInTheDocument()
  expect(screen.queryByText('도움말')).not.toBeInTheDocument()
  const describedBy = input.getAttribute('aria-describedby')!
  expect(document.getElementById(describedBy)).toHaveTextContent('필수 항목입니다')
})

test('disabled면 input이 비활성이고 입력이 차단된다', async () => {
  const onChange = vi.fn()
  render(<TextField label="이름" disabled onChange={onChange} />)
  const input = screen.getByLabelText('이름')
  expect(input).toBeDisabled()
  await userEvent.type(input, '실패')
  expect(onChange).not.toHaveBeenCalled()
})

test('ref가 실제 input 요소로 전달되어 포커스 가능하다', () => {
  const ref = createRef<HTMLInputElement>()
  render(<TextField label="이름" ref={ref} />)
  expect(ref.current).toBe(screen.getByLabelText('이름'))
  ref.current?.focus()
  expect(ref.current).toHaveFocus()
})

test('size 클래스가 적용된다 (기본 md, lg 지정)', () => {
  const { rerender } = render(<TextField label="이름" />)
  expect(screen.getByLabelText('이름').parentElement?.className).toContain(styles.md)
  rerender(<TextField label="이름" size="lg" />)
  expect(screen.getByLabelText('이름').parentElement?.className).toContain(styles.lg)
})

test('trailingIcon이 렌더되고 장식용으로 aria-hidden 처리된다', () => {
  render(<TextField label="검색" trailingIcon={<Icon name="search" size={20} />} />)
  const iconText = screen.getByText('search')
  expect(iconText).toBeInTheDocument()
  expect(iconText).toHaveAttribute('aria-hidden', 'true')
})
