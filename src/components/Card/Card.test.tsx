import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card, CardHeader, CardBody, CardFooter } from './Card'
import styles from './Card.module.css'

test('비-interactive Card는 button이 아니라 컨테이너로 렌더한다', () => {
  render(<Card>본문</Card>)
  expect(screen.getByText('본문')).toBeInTheDocument()
  expect(screen.queryByRole('button')).toBeNull()
})

test('surface/elevation/bordered 클래스가 적용된다', () => {
  render(<Card surface="high" elevation={3} bordered data-testid="c">카드</Card>)
  const el = screen.getByTestId('c')
  expect(el.className).toContain(styles.high)
  expect(el.className).toContain(styles.elev3)
  expect(el.className).toContain(styles.bordered)
})

test('interactive면 role=button으로 렌더되고 클릭을 전달한다', async () => {
  const onClick = vi.fn()
  render(<Card interactive onClick={onClick}>클릭</Card>)
  const el = screen.getByRole('button', { name: '클릭' })
  expect(el.tagName).toBe('DIV')
  await userEvent.click(el)
  expect(onClick).toHaveBeenCalledOnce()
})

test('interactive 카드는 탭 포커스 + 키보드(Enter/Space)로 활성화된다', async () => {
  const onClick = vi.fn()
  render(<Card interactive onClick={onClick}>확인</Card>)
  await userEvent.tab()
  expect(screen.getByRole('button', { name: '확인' })).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  await userEvent.keyboard(' ')
  expect(onClick).toHaveBeenCalledTimes(2)
})

test('interactive + disabled면 클릭이 차단된다', async () => {
  const onClick = vi.fn()
  render(<Card interactive disabled onClick={onClick}>비활성</Card>)
  const el = screen.getByRole('button')
  // role="button" div이므로 네이티브 disabled 대신 aria-disabled로 상태를 표현한다
  expect(el).toHaveAttribute('aria-disabled', 'true')
  expect(el).toHaveAttribute('tabindex', '-1')
  await userEvent.click(el)
  expect(onClick).not.toHaveBeenCalled()
})

test('ref를 루트에 전달하고 rest를 spread한다', () => {
  const ref = { current: null as HTMLElement | null }
  render(<Card ref={ref} aria-label="요약 카드">x</Card>)
  expect(ref.current).not.toBeNull()
  expect(ref.current).toHaveAttribute('aria-label', '요약 카드')
})

test('Header/Body/Footer 서브컴포넌트가 각 클래스와 children을 렌더한다', () => {
  render(
    <Card>
      <CardHeader>제목</CardHeader>
      <CardBody>본문</CardBody>
      <CardFooter>
        <button>확인</button>
      </CardFooter>
    </Card>
  )
  expect(screen.getByText('제목').className).toContain(styles.header)
  expect(screen.getByText('본문').className).toContain(styles.body)
  // 비-interactive Card(div) 안에 실제 button을 중첩하는 정상 케이스
  const footerBtn = screen.getByRole('button', { name: '확인' })
  expect(footerBtn.parentElement?.className).toContain(styles.footer)
})
