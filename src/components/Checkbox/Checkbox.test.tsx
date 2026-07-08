import { expect, test, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

test('라벨을 렌더하고 클릭하면 체크된다 (비제어)', async () => {
  render(<Checkbox>이용약관 동의</Checkbox>)
  const cb = screen.getByRole('checkbox', { name: '이용약관 동의' }) as HTMLInputElement
  expect(cb.checked).toBe(false)
  await userEvent.click(cb)
  expect(cb.checked).toBe(true)
})

test('클릭 시 onChange가 호출된다', async () => {
  const onChange = vi.fn()
  render(<Checkbox onChange={onChange}>수신 동의</Checkbox>)
  await userEvent.click(screen.getByRole('checkbox', { name: '수신 동의' }))
  expect(onChange).toHaveBeenCalledOnce()
  expect(onChange.mock.calls[0][0].target.checked).toBe(true)
})

test('라벨 텍스트 클릭으로도 토글된다 (label 연결)', async () => {
  render(<Checkbox>전체 선택</Checkbox>)
  const cb = screen.getByRole('checkbox') as HTMLInputElement
  await userEvent.click(screen.getByText('전체 선택'))
  expect(cb.checked).toBe(true)
})

test('indeterminate prop이 네이티브 input.indeterminate로 반영된다', () => {
  const { rerender } = render(<Checkbox indeterminate>부분 선택</Checkbox>)
  const cb = screen.getByRole('checkbox') as HTMLInputElement
  expect(cb.indeterminate).toBe(true)
  rerender(<Checkbox indeterminate={false}>부분 선택</Checkbox>)
  expect(cb.indeterminate).toBe(false)
})

test('disabled면 토글이 차단되고 onChange가 호출되지 않는다', async () => {
  const onChange = vi.fn()
  render(<Checkbox disabled onChange={onChange}>비활성</Checkbox>)
  const cb = screen.getByRole('checkbox') as HTMLInputElement
  expect(cb).toBeDisabled()
  await userEvent.click(cb)
  expect(cb.checked).toBe(false)
  expect(onChange).not.toHaveBeenCalled()
})

test('Space 키로 토글된다 (키보드 조작)', async () => {
  render(<Checkbox>키보드</Checkbox>)
  const cb = screen.getByRole('checkbox') as HTMLInputElement
  await userEvent.tab()
  expect(cb).toHaveFocus()
  await userEvent.keyboard(' ')
  expect(cb.checked).toBe(true)
})

test('forwardRef가 input 엘리먼트를 가리킨다', () => {
  const ref = createRef<HTMLInputElement>()
  render(<Checkbox ref={ref}>라벨</Checkbox>)
  expect(ref.current).toBeInstanceOf(HTMLInputElement)
  expect(ref.current?.type).toBe('checkbox')
})

test('라벨 없이 aria-label로 접근성 이름을 갖는다', () => {
  render(<Checkbox aria-label="전체 선택" />)
  expect(screen.getByRole('checkbox', { name: '전체 선택' })).toBeInTheDocument()
})
