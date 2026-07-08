import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton, SkeletonText, type SkeletonVariant } from './Skeleton'

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
  args: { variant: 'text', width: 240 },
  argTypes: {
    variant: { control: 'select', options: ['text', 'rect', 'circle'] },
    width: { control: 'text' },
    height: { control: 'text' },
    size: { control: 'text' }
  }
} satisfies Meta<typeof Skeleton>
export default meta
type Story = StoryObj<typeof meta>

/** variant/치수를 컨트롤로 조절해 확인 */
export const Playground: Story = {
  render: (args) => <Skeleton {...args} />
}

/**
 * 실제 로딩 레이아웃 예시 — 카드형 스켈레톤(원형 아바타 + 텍스트 3줄).
 * 실제 사용 시 소비자가 데이터 영역에 aria-busy 또는 시각적으로 숨긴
 * status 라이브 리전을 붙여 "불러오는 중" 안내를 제공해야 한다
 * (Skeleton 자체는 aria-hidden 순수 장식).
 */
export const RealWorld: Story = {
  render: () => (
    <div
      aria-busy="true"
      style={{
        display: 'flex',
        gap: 'var(--space-4)',
        alignItems: 'flex-start',
        width: 320,
        padding: 'var(--space-4)',
        background: 'var(--surface)'
      }}
    >
      <Skeleton variant="circle" size={48} />
      <div style={{ flex: 1 }}>
        <SkeletonText lines={3} />
      </div>
    </div>
  )
}

const variants: SkeletonVariant[] = ['text', 'rect', 'circle']

/** id: components-skeleton--matrix — variant 3종 + SkeletonText 라인 수 변형을 라이트/다크 나란히 배열 */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-6)', background: 'var(--surface)', padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {variants.map((v) => (
          <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {v === 'text' && <Skeleton variant="text" width={160} />}
            {v === 'rect' && <Skeleton variant="rect" width={160} height={96} />}
            {v === 'circle' && <Skeleton variant="circle" size={64} />}
            <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        {[2, 3, 5].map((n) => (
          <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: 200 }}>
            <SkeletonText lines={n} />
            <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)' }}>lines={n}</div>
          </div>
        ))}
      </div>

      {/* prefers-reduced-motion: reduce 설정 시 시머가 멈추고 --skeleton-base 정적 단색으로 남는다 (감속 아님) */}
      <div style={{ font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' }}>
        OS 모션 축소(prefers-reduced-motion: reduce) 시 시머 애니메이션이 완전히 정지하고 정적 --skeleton-base 채움으로 표시됩니다.
      </div>
    </div>
  )
}
