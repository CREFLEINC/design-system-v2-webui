import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatCard, type StatCardStatus, type DeltaDirection } from './StatCard'

const meta = {
  title: 'Components/StatCard',
  component: StatCard,
  args: { label: '설비 A 가동률', value: '98.2', unit: '%' }
} satisfies Meta<typeof StatCard>
export default meta
type Story = StoryObj<typeof meta>

/** 로컬 스파크라인 헬퍼 — 런타임 의존성 없는 손그림 SVG polyline. 차트 라이브러리 아님, 슬롯 데모용. */
function Sparkline({ points, label }: { points: string; label: string }) {
  return (
    <svg width="100%" height="32" viewBox="0 0 100 32" role="img" aria-label={label} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="var(--chart-1)" strokeWidth="2" />
    </svg>
  )
}

export const Playground: Story = {
  args: {
    delta: { direction: 'up', value: '+3.2%' },
    status: 'success',
    statusLabel: '가동중'
  },
  render: (args) => (
    <div style={{ maxWidth: 240 }}>
      <StatCard {...args} />
    </div>
  )
}

export const WithSparkline: Story = {
  args: {
    label: '주간 생산량 추세',
    value: '1,240',
    unit: '건',
    delta: { direction: 'up', value: '+8.1%' }
  },
  render: (args) => (
    <div style={{ maxWidth: 240 }}>
      <StatCard {...args}>
        <Sparkline points="0,20 15,18 30,22 45,12 60,15 75,6 100,4" label="7일 생산량 추세" />
      </StatCard>
    </div>
  )
}

export const Deltas: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ maxWidth: 220 }}>
        <StatCard label="양품률" value="99.1" unit="%" delta={{ direction: 'up', value: '+1.4%' }} />
      </div>
      <div style={{ maxWidth: 220 }}>
        <StatCard label="불량" value="32" unit="건" delta={{ direction: 'down', value: '-12' }} />
      </div>
      <div style={{ maxWidth: 220 }}>
        <StatCard label="재고" value="4,820" unit="ea" delta={{ direction: 'flat', value: '0' }} />
      </div>
    </div>
  )
}

const directions: DeltaDirection[] = ['up', 'down', 'flat']
const statuses: (StatCardStatus | undefined)[] = [undefined, 'success', 'error', 'warning', 'info', 'idle']
const surfaces = ['base', 'low', 'default', 'high'] as const

function Tile({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div style={{ width: 220 }}>
      <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)', marginBottom: 8 }}>{caption}</div>
      {children}
    </div>
  )
}

/** 라이트/다크 스크린샷 스윕: delta 방향 × status × surface 조합 + bordered + elevation + sparkline */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, background: 'var(--surface)', padding: 24 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {directions.map((d) => (
          <Tile key={`dir-${d}`} caption={`delta=${d}`}>
            <StatCard label="지표" value="42.0" unit="%" delta={{ direction: d, value: d === 'up' ? '+4.0%' : d === 'down' ? '-4.0%' : '0' }} />
          </Tile>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {statuses.map((s) => (
          <Tile key={`status-${s ?? 'none'}`} caption={`status=${s ?? 'none'}`}>
            <StatCard label="설비" value="1,240" status={s} statusLabel={s ? `${s} 상태` : undefined} />
          </Tile>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {surfaces.map((s) => (
          <Tile key={`surface-${s}`} caption={`surface=${s}`}>
            <StatCard label="지표" value="12.4" unit="억" surface={s} />
          </Tile>
        ))}
        <Tile caption="bordered">
          <StatCard label="지표" value="12.4" unit="억" bordered />
        </Tile>
        <Tile caption="elevation=2">
          <StatCard label="지표" value="12.4" unit="억" elevation={2} />
        </Tile>
        <Tile caption="sparkline">
          <StatCard label="추세" value="1,240" delta={{ direction: 'up', value: '+2.0%' }}>
            <Sparkline points="0,20 15,18 30,22 45,12 60,15 75,6 100,4" label="추세" />
          </StatCard>
        </Tile>
      </div>
    </div>
  )
}
