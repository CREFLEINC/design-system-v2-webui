import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'
import styles from './Badge.module.css'

test('count를 그대로 렌더한다', () => {
  render(<Badge count={3} aria-label="알림 3개" />)
  expect(screen.getByText('3')).toBeInTheDocument()
  expect(screen.getByLabelText('알림 3개')).toBeInTheDocument()
})

test('max를 초과하면 99+로 캡한다', () => {
  render(<Badge count={150} max={99} />)
  expect(screen.getByText('99+')).toBeInTheDocument()
})

test('count=0은 기본적으로 렌더하지 않는다', () => {
  const { container } = render(<Badge count={0} />)
  expect(container.firstChild).toBeNull()
})

test('showZero면 0을 렌더한다', () => {
  render(<Badge count={0} showZero />)
  expect(screen.getByText('0')).toBeInTheDocument()
})

test('dot 모드는 숫자 없이 aria-hidden + dot/tone 클래스', () => {
  const { container } = render(<Badge dot tone="error" />)
  const el = container.firstChild as HTMLElement
  expect(el).toHaveAttribute('aria-hidden', 'true')
  expect(el.textContent).toBe('')
  expect(el.className).toContain(styles.dot)
  expect(el.className).toContain(styles.error)
})

test('aria-label이 있는 dot은 aria-hidden이 아니다', () => {
  render(<Badge dot aria-label="온라인" />)
  expect(screen.getByLabelText('온라인')).toBeInTheDocument()
})
