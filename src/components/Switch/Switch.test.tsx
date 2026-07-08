import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './Switch'
import styles from './Switch.module.css'

test('라벨을 렌더하고 role=switch로 접근 가능하다 (기본 off)', () => {
  render(<Switch label="알림" />)
  const el = screen.getByRole('switch', { name: '알림' })
  expect(el).not.toBeChecked()
})

test('클릭하면 켜지고 onChange가 호출된다', async () => {
  const onChange = vi.fn()
  render(<Switch label="알림" onChange={onChange} />)
  const el = screen.getByRole('switch', { name: '알림' })
  await userEvent.click(el)
  expect(el).toBeChecked()
  expect(onChange).toHaveBeenCalledOnce()
})

test('Space 키로 토글된다 (키보드 조작)', async () => {
  render(<Switch label="알림" />)
  const el = screen.getByRole('switch', { name: '알림' })
  el.focus()
  expect(el).toHaveFocus()
  await userEvent.keyboard(' ')
  expect(el).toBeChecked()
})

test('disabled면 토글되지 않고 onChange가 호출되지 않는다', async () => {
  const onChange = vi.fn()
  render(<Switch label="알림" disabled onChange={onChange} />)
  const el = screen.getByRole('switch')
  expect(el).toBeDisabled()
  await userEvent.click(el)
  expect(el).not.toBeChecked()
  expect(onChange).not.toHaveBeenCalled()
})

test('controlled: checked가 반영되고 클릭 시 onChange만 발생한다', async () => {
  const onChange = vi.fn()
  render(<Switch label="알림" checked onChange={onChange} />)
  const el = screen.getByRole('switch')
  expect(el).toBeChecked()
  await userEvent.click(el)
  expect(onChange).toHaveBeenCalledOnce()
  // controlled — 부모가 state를 갱신하지 않으면 여전히 on
  expect(el).toBeChecked()
})

test('labelPlacement 클래스가 root에 적용된다 (기본 end)', () => {
  const { rerender } = render(<Switch label="알림" />)
  const root = () => screen.getByRole('switch').closest('label') as HTMLElement
  expect(root().className).toContain(styles.end)
  rerender(<Switch label="알림" labelPlacement="start" />)
  expect(root().className).toContain(styles.start)
})

test('ref가 네이티브 input에 연결된다', () => {
  const ref = { current: null as HTMLInputElement | null }
  render(<Switch label="알림" ref={ref} />)
  expect(ref.current).toBeInstanceOf(HTMLInputElement)
  expect(ref.current?.getAttribute('role')).toBe('switch')
})

test('label 없이 aria-label로 이름을 제공할 수 있다', () => {
  render(<Switch aria-label="다크 모드" />)
  expect(screen.getByRole('switch', { name: '다크 모드' })).toBeInTheDocument()
})
