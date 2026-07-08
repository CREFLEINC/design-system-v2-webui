import { createRef } from 'react'
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertBanner } from './AlertBanner'
import { Button } from '../Button/Button'

test('error variant은 role=alert이며 제목과 설명을 렌더한다', () => {
  render(<AlertBanner variant="error" title="저장 실패">네트워크를 확인하세요.</AlertBanner>)
  const alert = screen.getByRole('alert')
  expect(alert).toHaveTextContent('저장 실패')
  expect(alert).toHaveTextContent('네트워크를 확인하세요.')
})

test('success variant은 role=status다', () => {
  render(<AlertBanner variant="success">저장되었습니다.</AlertBanner>)
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('assertive prop이 variant 기본 라이브 강도를 양방향으로 오버라이드한다', () => {
  const { rerender } = render(<AlertBanner variant="success" assertive>업로드 중단됨</AlertBanner>)
  expect(screen.getByRole('alert')).toBeInTheDocument()
  rerender(<AlertBanner variant="error" assertive={false}>완료됨</AlertBanner>)
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('onDismiss가 있으면 닫기 버튼을 렌더하고 클릭 시 호출한다', async () => {
  const onDismiss = vi.fn()
  render(<AlertBanner variant="info" onDismiss={onDismiss} dismissLabel="알림 닫기">안내</AlertBanner>)
  await userEvent.click(screen.getByRole('button', { name: '알림 닫기' }))
  expect(onDismiss).toHaveBeenCalledOnce()
})

test('onDismiss가 없으면 닫기 버튼이 없다', () => {
  render(<AlertBanner variant="info">안내</AlertBanner>)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

test('action 슬롯의 버튼이 렌더되고 클릭된다', async () => {
  const onRetry = vi.fn()
  render(
    <AlertBanner variant="error" action={<Button onClick={onRetry}>재시도</Button>}>
      실패했습니다.
    </AlertBanner>
  )
  await userEvent.click(screen.getByRole('button', { name: '재시도' }))
  expect(onRetry).toHaveBeenCalledOnce()
})

test('컴포넌트 소유 role이 rest보다 우선하고 ref·className·data-*는 통과된다', () => {
  const ref = createRef<HTMLDivElement>()
  render(
    <AlertBanner ref={ref} variant="error" className="custom" data-testid="banner" role="banner">
      본문
    </AlertBanner>
  )
  const el = screen.getByTestId('banner')
  expect(el).toBe(ref.current)
  expect(el).toHaveClass('custom')
  // 소비자가 role="banner"를 넘겨도 접근성 보호를 위해 무시되고 alert이 유지된다
  expect(el).toHaveAttribute('role', 'alert')
})

test('icon=false면 앞머리 아이콘을 숨기고, 기본값은 렌더한다', () => {
  const { rerender, container } = render(<AlertBanner variant="warning">주의</AlertBanner>)
  // 기본 아이콘(Material Symbols span, 장식용 aria-hidden)이 존재
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  rerender(<AlertBanner variant="warning" icon={false}>주의</AlertBanner>)
  expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
})
