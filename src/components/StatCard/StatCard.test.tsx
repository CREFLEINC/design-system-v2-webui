import { expect, test } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { StatCard } from './StatCard'
import cardStyles from '../Card/Card.module.css'

test('group 롤 + label에서 파생된 aria-label, value·unit 렌더', () => {
  render(<StatCard label="가동률" value="98.2" unit="%" />)
  const group = screen.getByRole('group', { name: '가동률' })
  expect(group).toBeInTheDocument()
  expect(within(group).getByText('98.2')).toBeInTheDocument()
  expect(within(group).getByText('%')).toBeInTheDocument()
  expect(within(group).getByText('가동률')).toBeInTheDocument()
})

test('consumer aria-label이 label 파생 이름을 덮어쓴다', () => {
  render(<StatCard label="가동률" value="98.2" aria-label="설비 A 가동률" />)
  expect(screen.getByRole('group', { name: '설비 A 가동률' })).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: '가동률' })).toBeNull()
})

test('delta up: data-direction=up + SR용 상승 텍스트, 화살표·값은 aria-hidden', () => {
  render(<StatCard label="양품률" value="96" delta={{ direction: 'up', value: '+3.2%' }} />)
  // SR 소스: 방향어 + 값 (자동 구성)
  expect(screen.getByText('상승 +3.2%')).toBeInTheDocument()
  const deltaEl = screen.getByText('상승 +3.2%').parentElement as HTMLElement
  expect(deltaEl).toHaveAttribute('data-direction', 'up')
  // 시각 값은 aria-hidden (이중 낭독 방지)
  const visible = within(deltaEl).getByText('+3.2%')
  expect(visible).toHaveAttribute('aria-hidden', 'true')
})

test('delta down: data-direction=down, delta.label이 자동 텍스트를 대체', () => {
  render(<StatCard label="불량" value="32" delta={{ direction: 'down', value: '-12', label: '전월 대비 12건 감소' }} />)
  const srText = screen.getByText('전월 대비 12건 감소')
  const deltaEl = srText.parentElement as HTMLElement
  expect(deltaEl).toHaveAttribute('data-direction', 'down')
  expect(screen.queryByText('하락 -12')).toBeNull()
})

test('status 점은 statusLabel을 가진 img로 렌더, status 없으면 없음', () => {
  const { rerender } = render(<StatCard label="설비 A" value="1,240" status="success" statusLabel="가동중" />)
  const dot = screen.getByRole('img', { name: '가동중' })
  expect(dot).toHaveAttribute('data-status', 'success')
  rerender(<StatCard label="설비 A" value="1,240" />)
  expect(screen.queryByRole('img')).toBeNull()
})

test('스파크라인 슬롯(children)이 group 안에 렌더된다', () => {
  render(
    <StatCard label="추세" value="1,240">
      <svg data-testid="spark" role="img" aria-label="7일 추세"><polyline points="0,10 10,4 20,6" /></svg>
    </StatCard>
  )
  const group = screen.getByRole('group', { name: '추세' })
  expect(within(group).getByTestId('spark')).toBeInTheDocument()
})

test('ref 전달 + rest spread(data-*), surface/elevation/bordered가 Card에 반영', () => {
  const ref = { current: null as HTMLElement | null }
  render(<StatCard ref={ref} label="매출" value="12.4" unit="억" surface="high" elevation={2} bordered data-testid="sc" />)
  expect(ref.current).not.toBeNull()
  const el = screen.getByTestId('sc')
  expect(el).toBe(ref.current)
  expect(el.className).toContain(cardStyles.high)
  expect(el.className).toContain(cardStyles.elev2)
  expect(el.className).toContain(cardStyles.bordered)
})
