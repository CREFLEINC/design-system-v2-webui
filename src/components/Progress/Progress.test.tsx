import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from './Progress'
import { Gauge } from './Gauge'
import styles from './Progress.module.css'

test('Progress: role=progressbar에 value가 aria-valuenow로 반영된다', () => {
  render(<Progress value={40} label="업로드 진행률" />)
  const bar = screen.getByRole('progressbar', { name: '업로드 진행률' })
  expect(bar).toHaveAttribute('aria-valuenow', '40')
  expect(bar).toHaveAttribute('aria-valuemin', '0')
  expect(bar).toHaveAttribute('aria-valuemax', '100')
})

test('Progress: indeterminate면 aria-valuenow를 생략하고 애니메이션 sliver를 렌더한다', () => {
  render(<Progress indeterminate label="로딩" />)
  const bar = screen.getByRole('progressbar', { name: '로딩' })
  expect(bar).not.toHaveAttribute('aria-valuenow')
  expect(bar.getElementsByClassName(styles.indeterminate).length).toBe(1)
})

test('Progress: thresholds가 value 구간에 따라 fill tone 클래스를 매핑한다', () => {
  const thresholds = [{ upTo: 50, tone: 'error' as const }, { upTo: 80, tone: 'warning' as const }]
  const fill = () => screen.getByRole('progressbar').getElementsByClassName(styles.fill)[0] as HTMLElement
  const { rerender } = render(<Progress value={30} tone="success" thresholds={thresholds} label="점수" />)
  expect(fill().className).toContain(styles['fill-error'])
  rerender(<Progress value={65} tone="success" thresholds={thresholds} label="점수" />)
  expect(fill().className).toContain(styles['fill-warning'])
  rerender(<Progress value={95} tone="success" thresholds={thresholds} label="점수" />)
  expect(fill().className).toContain(styles['fill-success'])
})

test('Progress: tone 미지정 시 fill이 primary 클래스다', () => {
  render(<Progress value={50} label="진행" />)
  const fill = screen.getByRole('progressbar').getElementsByClassName(styles.fill)[0] as HTMLElement
  expect(fill.className).toContain(styles['fill-primary'])
})

test('Progress: min/max 스케일과 valueText를 반영하고 fill 폭을 백분율로 설정한다', () => {
  render(<Progress value={5} min={0} max={10} valueText="5 / 10단계" label="단계" />)
  const bar = screen.getByRole('progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '5')
  expect(bar).toHaveAttribute('aria-valuemax', '10')
  expect(bar).toHaveAttribute('aria-valuetext', '5 / 10단계')
  const fill = bar.getElementsByClassName(styles.fill)[0] as HTMLElement
  expect(fill.style.width).toBe('50%')
})

test('Progress: showValue면 퍼센트 텍스트를 표시한다', () => {
  render(<Progress value={72.4} showValue label="진행" />)
  expect(screen.getByText('72%')).toBeInTheDocument()
})

test('Progress: 범위를 벗어난 value는 클램프된다', () => {
  render(<Progress value={150} label="진행" />)
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
})

test('Progress: data-* 등 rest가 전달되고 컴포넌트 role/aria가 유지된다', () => {
  render(<Progress value={10} label="진행" data-testid="p1" />)
  const bar = screen.getByTestId('p1')
  expect(bar).toHaveAttribute('role', 'progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '10')
})

test('Gauge: role=progressbar와 중앙 값 라벨을 렌더하고 클램프한다', () => {
  render(<Gauge value={120} label="완성도" />)
  const bar = screen.getByRole('progressbar', { name: '완성도' })
  expect(bar).toHaveAttribute('aria-valuenow', '100')
  expect(bar.getElementsByClassName(styles.value).length).toBe(1)
})

test('Gauge: thresholds가 arc stroke tone 클래스를 매핑한다', () => {
  render(<Gauge value={30} tone="success" thresholds={[{ upTo: 50, tone: 'error' }]} label="점수" />)
  const arc = screen.getByRole('progressbar').getElementsByClassName(styles.arc)[0] as SVGElement
  expect(arc.getAttribute('class')).toContain(styles['arc-error'])
})
