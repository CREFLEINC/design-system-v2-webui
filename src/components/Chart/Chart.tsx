import { forwardRef } from 'react'
import { LineChart, type LineChartProps } from './LineChart'
import { BarChart, type BarChartProps } from './BarChart'
import { PieChart, type PieChartProps } from './PieChart'
import type { ChartBaseProps, ChartPoint, ChartSeries, ReferenceLine, ReferenceLineTone } from './Chart.shared'

export type { ChartPoint, ChartSeries, ChartBaseProps, ReferenceLine, ReferenceLineTone }

export type ChartType = 'line' | 'bar' | 'pie'

export type ChartProps =
  | ({ type: 'line' } & LineChartProps)
  | ({ type: 'bar' } & BarChartProps)
  | ({ type: 'pie' } & PieChartProps)

/**
 * 얇은 디스패처 — type(판별 유니온)에 따라 LineChart/BarChart/PieChart로 switch-render하고
 * ref/rest를 그대로 전달한다. config 기반("타입 문자열이 있다")으로 하나의 import만 쓰고 싶을 때 사용.
 * 주 API는 LineChart/BarChart/PieChart 개별 export — 각 타입의 prop surface를 좁게 유지하기 위함.
 */
export const Chart = forwardRef<HTMLElement, ChartProps>(function Chart(props, ref) {
  const { type, ...rest } = props
  switch (type) {
    case 'line':
      return <LineChart ref={ref} {...(rest as LineChartProps)} />
    case 'bar':
      return <BarChart ref={ref} {...(rest as BarChartProps)} />
    case 'pie':
      return <PieChart ref={ref} {...(rest as PieChartProps)} />
    default:
      return null
  }
})
