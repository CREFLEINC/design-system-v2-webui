import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { LineChart } from './LineChart'
import { BarChart } from './BarChart'
import { PieChart } from './PieChart'
import { Chart } from './Chart'

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
