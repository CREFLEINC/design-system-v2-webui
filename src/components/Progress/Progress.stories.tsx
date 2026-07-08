import type { Meta, StoryObj } from '@storybook/react-vite'
import { Progress } from './Progress'
import { Gauge } from './Gauge'

const meta = {
  title: 'Components/Progress',
  component: Progress,
  args: { value: 40, size: 'md', tone: 'primary', label: '업로드 진행률' }
} satisfies Meta<typeof Progress>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const GaugePlayground: StoryObj<typeof Gauge> = {
  render: (args) => <Gauge {...args} />,
  args: { value: 65, size: 'md', tone: 'primary', label: '완성도' }
}

const TONES = ['primary', 'success', 'error', 'warning', 'info', 'idle'] as const
const SIZES = ['sm', 'md'] as const
const GAUGE_SIZES = ['sm', 'md', 'lg'] as const

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* 선형 Progress — 사이즈 × 톤 */}
      {SIZES.map((size) => (
        <div key={size} style={{ display: 'grid', gap: 12 }}>
          {TONES.map((tone) => (
            <div key={tone} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 80, fontSize: 12 }}>{size}/{tone}</span>
              <div style={{ width: 240 }}>
                <Progress value={65} size={size} tone={tone} label={`${tone} 진행률`} showValue />
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Indeterminate */}
      <div style={{ display: 'grid', gap: 12 }}>
        {SIZES.map((size) => (
          <div key={size} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 80, fontSize: 12 }}>indeterminate/{size}</span>
            <div style={{ width: 240 }}>
              <Progress indeterminate size={size} label="로딩 중" />
            </div>
          </div>
        ))}
      </div>

      {/* threshold demo — 30(error) / 65(warning) / 95(success) */}
      <div style={{ display: 'grid', gap: 12 }}>
        {[30, 65, 95].map((v) => (
          <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 80, fontSize: 12 }}>threshold {v}</span>
            <div style={{ width: 240 }}>
              <Progress
                value={v}
                tone="success"
                thresholds={[{ upTo: 50, tone: 'error' }, { upTo: 80, tone: 'warning' }]}
                label="점수"
                showValue
              />
            </div>
          </div>
        ))}
      </div>

      {/* Gauge — 사이즈 × threshold/showValue */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        {GAUGE_SIZES.map((size) => (
          <Gauge key={size} size={size} value={72} tone="primary" label={`완성도 ${size}`} />
        ))}
        <Gauge
          size="md"
          value={35}
          tone="success"
          thresholds={[{ upTo: 50, tone: 'error' }, { upTo: 80, tone: 'warning' }]}
          label="점수 게이지"
        />
        <Gauge size="lg" value={88} tone="info" showValue label="완료율" />
      </div>
    </div>
  )
}
