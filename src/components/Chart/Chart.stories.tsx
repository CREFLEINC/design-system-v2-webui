import type { Meta, StoryObj } from '@storybook/react-vite'
import { LineChart } from './LineChart'
import { BarChart } from './BarChart'
import { PieChart } from './PieChart'
import type { ChartSeries } from './Chart.shared'

const meta = {
  title: 'Components/Chart',
  component: LineChart,
  args: {
    title: '월별 가동률',
    formatValue: (v: number) => `${v}%`,
    series: [
      {
        name: '가동률',
        data: [
          { label: '1월', value: 82 },
          { label: '2월', value: 88 },
          { label: '3월', value: 79 },
          { label: '4월', value: 91 },
        ]
      }
    ] as ChartSeries[]
  }
} satisfies Meta<typeof LineChart>
export default meta
type Story = StoryObj<typeof meta>

export const LinePlayground: Story = {
  args: { area: true, showPoints: true, caption: '설비 A 라인 · 최근 4개월' }
}

export const BarPlayground: StoryObj<typeof BarChart> = {
  render: (args) => <BarChart {...args} />,
  args: {
    title: '설비별 생산량',
    caption: '양품 대비 불량 비교',
    series: [
      {
        name: '양품',
        data: [
          { label: '1호기', value: 320 },
          { label: '2호기', value: 280 },
          { label: '3호기', value: 350 }
        ]
      },
      {
        name: '불량',
        data: [
          { label: '1호기', value: 12 },
          { label: '2호기', value: 8 },
          { label: '3호기', value: 20 }
        ]
      }
    ]
  }
}

export const DonutPlayground: StoryObj<typeof PieChart> = {
  render: (args) => <PieChart {...args} />,
  args: {
    title: '설비 상태 분포',
    donut: true,
    centerLabel: '가동률',
    centerValue: '82%',
    data: [
      { label: '가동', value: 82 },
      { label: '유휴', value: 12 },
      { label: '정비', value: 6 }
    ]
  }
}

export const AutoDomainVsFixedMinMax: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <p style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)', marginBottom: 8 }}>
          Auto 도메인 (min/max 미지정)
        </p>
        <LineChart
          title="온도 편차"
          formatValue={(v) => `${v}℃`}
          series={[{ name: '편차', data: [
            { label: '09시', value: -2 },
            { label: '10시', value: 3 },
            { label: '11시', value: 5 },
            { label: '12시', value: 1 }
          ] }]}
        />
      </div>
      <div>
        <p style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)', marginBottom: 8 }}>
          Fixed min/max (-10 ~ 10)
        </p>
        <LineChart
          title="온도 편차"
          min={-10}
          max={10}
          formatValue={(v) => `${v}℃`}
          series={[{ name: '편차', data: [
            { label: '09시', value: -2 },
            { label: '10시', value: 3 },
            { label: '11시', value: 5 },
            { label: '12시', value: 1 }
          ] }]}
        />
      </div>
    </div>
  )
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export const LongSeries: Story = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <LineChart
        title="12개월 가동률 추이"
        caption="컨테이너 폭을 줄이면 비례 축소 확인"
        area
        formatValue={(v) => `${v}%`}
        series={[{
          name: '가동률',
          data: MONTHS.map((label, i) => ({ label, value: 70 + Math.round(20 * Math.sin(i / 2)) }))
        }]}
      />
    </div>
  )
}

export const ReducedMotion: Story = {
  decorators: [
    (Story) => (
      <div>
        {/* 글로벌 prefers-reduced-motion:reduce를 흉내내 draw-in 없이 최종 상태가 즉시 렌더되는지 확인 */}
        <style>{'*, *::before, *::after { animation: none !important; transition: none !important; }'}</style>
        <Story />
      </div>
    )
  ],
  args: { area: true, showPoints: true }
}

const CHART_SERIES: ChartSeries[] = [
  { name: '설비1', data: [{ label: '1월', value: 40 }, { label: '2월', value: 55 }, { label: '3월', value: 48 }] },
  { name: '설비2', data: [{ label: '1월', value: 30 }, { label: '2월', value: 42 }, { label: '3월', value: 60 }] },
  { name: '설비3', data: [{ label: '1월', value: 20 }, { label: '2월', value: 25 }, { label: '3월', value: 35 }] },
  { name: '설비4', data: [{ label: '1월', value: 15 }, { label: '2월', value: 18 }, { label: '3월', value: 22 }] },
  { name: '설비5', data: [{ label: '1월', value: 10 }, { label: '2월', value: 12 }, { label: '3월', value: 14 }] }
]

const PIE_DATA = [
  { label: 'A', value: 30 },
  { label: 'B', value: 25 },
  { label: 'C', value: 20 },
  { label: 'D', value: 15 },
  { label: 'E', value: 10 }
]

function MatrixBlock({ theme, containerWidth }: { theme: 'light' | 'dark'; containerWidth: number }) {
  return (
    <div
      data-theme={theme}
      style={{ background: 'var(--surface)', padding: 16, display: 'grid', gap: 20 }}
    >
      <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-variant)' }}>
        {theme === 'light' ? '라이트' : '다크'} · {containerWidth}px
      </div>
      <div style={{ width: containerWidth, display: 'grid', gap: 20 }}>
        <LineChart
          title="라인 · 5색 시리즈"
          area
          showPoints
          series={CHART_SERIES}
        />
        <BarChart
          title="막대 · 5색 시리즈(grouped)"
          series={CHART_SERIES}
        />
        <PieChart
          title="도넛 · 5색 시리즈"
          donut
          centerLabel="비율"
          centerValue="100%"
          data={PIE_DATA}
        />
      </div>
    </div>
  )
}

/** line/bar/pie × light/dark 전수 배열 + 컨테이너 폭 240/480 반응형 병치.
 *  5색 시리즈로 --chart-1..5 램프가 두 테마에서 구분되는지, 범례·축·그리드·도넛 센터라벨 동시 확인. */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
      <MatrixBlock theme="light" containerWidth={240} />
      <MatrixBlock theme="dark" containerWidth={240} />
      <MatrixBlock theme="light" containerWidth={480} />
      <MatrixBlock theme="dark" containerWidth={480} />
    </div>
  )
}
