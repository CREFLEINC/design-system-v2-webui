import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { LineChart } from './LineChart'
import { BarChart } from './BarChart'
import { PieChart } from './PieChart'
import { Chart } from './Chart'
import styles from './Chart.module.css'

test('LineChart polyline + point count + aria summary', () => {
  const { container } = render(
    <LineChart
      title="월별 가동률"
      showPoints
      formatValue={(v) => `${v}%`}
      series={[{ name: '가동률', data: [
        { label: '1월', value: 82 },
        { label: '2월', value: 88 },
        { label: '3월', value: 91 },
      ] }]}
    />
  )
  expect(container.querySelectorAll('polyline').length).toBe(1)
  expect(container.querySelectorAll('[data-chart-point]').length).toBe(3)
  const img = screen.getByRole('img')
  const label = img.getAttribute('aria-label') ?? ''
  expect(label).toContain('1월 82%')
  expect(label).toContain('3월 91%')
})

test('BarChart bar count + taller bar for larger value', () => {
  const { container } = render(
    <BarChart min={0} max={40} series={[{ name: '생산량', data: [
      { label: 'A', value: 10 },
      { label: 'B', value: 40 },
    ] }]} />
  )
  const bars = container.querySelectorAll('[data-chart-bar]')
  expect(bars.length).toBe(2)
  const hA = parseFloat(bars[0].getAttribute('height') || '0')
  const hB = parseFloat(bars[1].getAttribute('height') || '0')
  expect(hB).toBeGreaterThan(hA)
})

test('grouped BarChart renders series*points rects', () => {
  const { container } = render(
    <BarChart series={[
      { name: '양품', data: [{ label: '1월', value: 90 }, { label: '2월', value: 95 }] },
      { name: '불량', data: [{ label: '1월', value: 10 }, { label: '2월', value: 5 }] },
    ]} />
  )
  expect(container.querySelectorAll('[data-chart-bar]').length).toBe(4)
})

test('stacked BarChart domain fits the tallest category total (no clipped top segment)', () => {
  const { container } = render(
    <BarChart stacked series={[
      { name: '양품', data: [{ label: 'A', value: 90 }] },
      { name: '불량', data: [{ label: 'A', value: 10 }] },
    ]} />
  )
  const bars = container.querySelectorAll('[data-chart-bar]')
  expect(bars.length).toBe(2)
  // 두 세그먼트 모두 plot 영역 안(음수 y 없음)에 있어야 한다.
  bars.forEach((bar) => {
    expect(parseFloat(bar.getAttribute('y') || '0')).toBeGreaterThanOrEqual(0)
  })
  // 스택 합(100)이 도메인을 채워야 한다 — 두 세그먼트 높이 합이 plot 전체 높이(plotBottom - plotTop)에 근접.
  const heights = Array.from(bars).map((b) => parseFloat(b.getAttribute('height') || '0'))
  const totalHeight = heights[0] + heights[1]
  const plotH = 320 - 32 - 16 // DEFAULT_HEIGHT - PADDING.bottom - PADDING.top
  expect(totalHeight).toBeCloseTo(plotH, 0)
})

test('donut slice count + dasharray proportion', () => {
  const { container } = render(
    <PieChart donut data={[
      { label: '가동', value: 25 },
      { label: '유휴', value: 75 },
    ]} />
  )
  const slices = container.querySelectorAll('[data-chart-slice]')
  expect(slices.length).toBe(2)
  const r = parseFloat(slices[0].getAttribute('r') || '0')
  const circ = 2 * Math.PI * r
  const dash = slices[0].getAttribute('stroke-dasharray') || ''
  const arc = parseFloat(dash.split(/[ ,]+/)[0])
  expect(arc).toBeCloseTo(circ / 4, 1)
})

test('legend renders one labelled item per series', () => {
  render(
    <LineChart showLegend series={[
      { name: '가동률', data: [{ label: '1월', value: 80 }] },
      { name: '목표', data: [{ label: '1월', value: 90 }] },
    ]} />
  )
  const legend = screen.getByRole('list', { name: /범례/ })
  expect(within(legend).getAllByRole('listitem').length).toBe(2)
  expect(within(legend).getByText('가동률')).toBeInTheDocument()
  expect(within(legend).getByText('목표')).toBeInTheDocument()
})

test('sr-only data table has a row per point with formatValue applied', () => {
  render(
    <BarChart title="가동률" showTable formatValue={(v) => `${v}%`}
      series={[{ name: '가동률', data: [
        { label: '1월', value: 82 },
        { label: '2월', value: 88 },
      ] }]} />
  )
  const table = screen.getByRole('table', { name: '가동률' })
  expect(within(table).getByRole('row', { name: /1월/ })).toBeInTheDocument()
  expect(within(table).getByText('82%')).toBeInTheDocument()
  expect(within(table).getByText('88%')).toBeInTheDocument()
})

test('Chart dispatcher renders bars for type=bar and forwards ref+rest', () => {
  const ref = { current: null as HTMLElement | null }
  const { container } = render(
    <Chart ref={ref} type="bar" data-testid="chart"
      series={[{ name: 's', data: [{ label: 'A', value: 1 }] }]} />
  )
  expect(container.querySelectorAll('[data-chart-bar]').length).toBe(1)
  const root = screen.getByTestId('chart')
  expect(root).toBe(ref.current)
})

test('ariaLabel overrides the auto-generated summary', () => {
  render(
    <LineChart ariaLabel="맞춤 요약"
      series={[{ name: 's', data: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] }]} />
  )
  expect(screen.getByRole('img', { name: '맞춤 요약' })).toBeInTheDocument()
})

test('LineChart referenceLines: y축 위치+라벨+기본 dashed', () => {
  const { container } = render(
    <LineChart min={0} max={40} referenceLines={[{ value: 28, label: '상한 28' }]}
      series={[{ name: 's', data: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }] }]} />
  )
  const lines = container.querySelectorAll('[data-chart-refline]')
  expect(lines.length).toBe(1)
  const line = lines[0]
  expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'))
  expect(parseFloat(line.getAttribute('y1') || '0')).toBeCloseTo(97.6)
  expect(line.getAttribute('stroke-dasharray')).toBeTruthy()
  expect(screen.getByText('상한 28')).toBeInTheDocument()
})

test('LineChart referenceLines: 여러 기준선 + 도메인 밖 skip + solid', () => {
  const { container } = render(
    <LineChart min={0} max={40}
      referenceLines={[{ value: 28 }, { value: 100 }, { value: 10, style: 'solid' }]}
      series={[{ name: 's', data: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }] }]} />
  )
  const lines = container.querySelectorAll('[data-chart-refline]')
  expect(lines.length).toBe(2)
  const solidLine = Array.from(lines).find((l) => l.getAttribute('data-value') === '10')
  expect(solidLine).toBeTruthy()
  expect(solidLine?.getAttribute('stroke-dasharray')).toBeFalsy()
})

test('LineChart referenceLines: 톤 클래스', () => {
  const { container } = render(
    <LineChart min={0} max={40}
      referenceLines={[{ value: 10, tone: 'error' }, { value: 20 }]}
      series={[{ name: 's', data: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }] }]} />
  )
  const lines = container.querySelectorAll('[data-chart-refline]')
  const errorGroup = lines[0].closest('g')
  const neutralGroup = lines[1].closest('g')
  expect(errorGroup?.getAttribute('class')).toContain(styles['ref-error'])
  expect(neutralGroup?.getAttribute('class')).toContain(styles['ref-neutral'])
})

test('LineChart referenceLines: x축 세로 기준선', () => {
  const { container } = render(
    <LineChart referenceLines={[{ axis: 'x', value: 1 }]}
      series={[{ name: 's', data: [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
        { label: 'C', value: 30 },
      ] }]} />
  )
  const lines = container.querySelectorAll('[data-chart-refline]')
  expect(lines.length).toBe(1)
  const line = lines[0]
  expect(line.getAttribute('x1')).toBe(line.getAttribute('x2'))
  expect(parseFloat(line.getAttribute('x1') || '0')).toBeCloseTo(332)
})

test('LineChart referenceLines: aria 요약에 기준선 포함', () => {
  render(
    <LineChart min={0} max={40} formatValue={(v) => `${v}%`}
      referenceLines={[{ value: 28, label: '상한' }]}
      series={[{ name: 's', data: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }] }]} />
  )
  const img = screen.getByRole('img')
  const label = img.getAttribute('aria-label') ?? ''
  expect(label).toContain('기준선: 상한(28%)')
})

test('Chart type="line" 경유에서도 referenceLines가 렌더된다', () => {
  const { container } = render(
    <Chart type="line" min={0} max={40} referenceLines={[{ value: 28 }]}
      series={[{ name: 's', data: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }] }]} />
  )
  expect(container.querySelectorAll('[data-chart-refline]').length).toBe(1)
})
