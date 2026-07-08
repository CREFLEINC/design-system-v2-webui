import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Icon } from './Icon'

test('장식용(기본)은 aria-hidden', () => {
  const { container } = render(<Icon name="factory" />)
  const el = container.querySelector('span')!
  expect(el).toHaveAttribute('aria-hidden', 'true')
  expect(el).toHaveTextContent('factory')
})

test('label이 있으면 img 롤 + aria-label', () => {
  render(<Icon name="warning" label="경고" />)
  const el = screen.getByRole('img', { name: '경고' })
  expect(el).not.toHaveAttribute('aria-hidden')
})

test('size가 fontSize로 반영된다', () => {
  const { container } = render(<Icon name="factory" size={40} />)
  expect(container.querySelector('span')!.style.fontSize).toBe('40px')
})
