import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from './Chip'
import { Icon } from '../Icon/Icon'
import styles from './Chip.module.css'

test('status 칩은 텍스트와 시맨틱 클래스를 렌더한다', () => {
  render(<Chip status="success">양품</Chip>)
  const el = screen.getByText('양품').closest('span')!.parentElement!
  expect(screen.getByText('양품')).toBeInTheDocument()
  expect(el.className).toContain(styles['status-success'])
  expect(el.className).toContain(styles.status)
})

test('filter 칩은 클릭 시 aria-pressed 토글 + onSelectedChange(!selected)', async () => {
  const onChange = vi.fn()
  render(<Chip variant="filter" selected={false} onSelectedChange={onChange}>진행중</Chip>)
  const btn = screen.getByRole('button', { name: '진행중' })
  expect(btn).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(btn)
  expect(onChange).toHaveBeenCalledWith(true)
})

test('selected filter 칩은 selected 클래스 + aria-pressed=true', () => {
  render(<Chip variant="filter" selected>선택됨</Chip>)
  const btn = screen.getByRole('button', { name: '선택됨' })
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  expect(btn.className).toContain(styles.selected)
})

test('removable 칩의 X는 onRemove 호출 + type=button, 라벨 텍스트는 유지', async () => {
  const onRemove = vi.fn()
  render(<Chip status="info" onRemove={onRemove}>필터: 서울</Chip>)
  const x = screen.getByRole('button', { name: '제거' })
  expect(x).toHaveAttribute('type', 'button')
  await userEvent.click(x)
  expect(onRemove).toHaveBeenCalledOnce()
  expect(screen.getByText('필터: 서울')).toBeInTheDocument()
})

test('leadingIcon(label 있는 Icon)은 role=img로 렌더된다', () => {
  render(<Chip status="success" leadingIcon={<Icon name="check_circle" label="완료" size={16} />}>완료</Chip>)
  expect(screen.getByRole('img', { name: '완료' })).toBeInTheDocument()
})
