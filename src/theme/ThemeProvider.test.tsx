import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeProvider'

function Toggle() {
  const { theme, setTheme } = useTheme()
  return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme}</button>
}

test('defaultTheme이 <html data-theme>에 반영된다', () => {
  render(<ThemeProvider defaultTheme="dark"><div>x</div></ThemeProvider>)
  expect(document.documentElement.dataset.theme).toBe('dark')
})

test('setTheme으로 테마가 전환된다', async () => {
  render(<ThemeProvider defaultTheme="light"><Toggle /></ThemeProvider>)
  await userEvent.click(screen.getByRole('button', { name: 'light' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(screen.getByRole('button', { name: 'dark' })).toBeInTheDocument()
})

test('system은 matchMedia로 해석된다 (jsdom 스텁 = light)', () => {
  render(<ThemeProvider defaultTheme="system"><div>x</div></ThemeProvider>)
  expect(document.documentElement.dataset.theme).toBe('light')
})

test('Provider 밖 useTheme은 throw', () => {
  expect(() => render(<Toggle />)).toThrow(/ThemeProvider/)
})
