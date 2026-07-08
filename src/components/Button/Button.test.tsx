import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'
import styles from './Button.module.css'

test('children을 렌더하고 클릭을 전달한다', async () => {
  const onClick = vi.fn()
  render(<Button onClick={onClick}>저장</Button>)
  await userEvent.click(screen.getByRole('button', { name: '저장' }))
  expect(onClick).toHaveBeenCalledOnce()
})

test('variant/size 클래스가 적용된다 (기본 filled/md)', () => {
  render(<Button variant="outlined" size="lg">버튼</Button>)
  const el = screen.getByRole('button')
  expect(el.className).toContain(styles.outlined)
  expect(el.className).toContain(styles.lg)
})

test('disabled면 클릭이 차단된다', async () => {
  const onClick = vi.fn()
  render(<Button disabled onClick={onClick}>버튼</Button>)
  await userEvent.click(screen.getByRole('button'))
  expect(onClick).not.toHaveBeenCalled()
})

test('loading이면 aria-busy + 비활성 + 스피너', () => {
  render(<Button loading>버튼</Button>)
  const el = screen.getByRole('button')
  expect(el).toHaveAttribute('aria-busy', 'true')
  expect(el).toBeDisabled()
  expect(el.querySelector(`.${styles.spinner}`)).not.toBeNull()
})

test('기본 type은 button (form 우발 제출 방지)', () => {
  render(<Button>버튼</Button>)
  expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
})
