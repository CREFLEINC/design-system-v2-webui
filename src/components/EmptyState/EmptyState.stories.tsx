import type { Meta, StoryObj } from '@storybook/react-vite'
import { EmptyState, type EmptyStateSize } from './EmptyState'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: {
    title: '데이터가 없습니다',
    description: '첫 항목을 추가해 보세요.',
    size: 'md',
    icon: <Icon name="inbox" size={40} />,
    action: <Button>새로 만들기</Button>
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] }
  }
} satisfies Meta<typeof EmptyState>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

/** 검색 결과 없음 — 동적으로 나타나는 빈 상태이므로 live로 SR에 공지 */
export const SearchEmpty: Story = {
  args: {
    title: '검색 결과가 없습니다',
    description: '다른 키워드로 다시 시도해 보세요.',
    icon: <Icon name="search" size={40} />,
    action: <Button variant="text">필터 초기화</Button>,
    live: true
  }
}

/** 카드/패널 내부에 삽입하는 인라인(sm) 예시 */
export const Inline: Story = {
  render: () => (
    <div
      style={{
        maxWidth: 320,
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-container-low)'
      }}
    >
      <EmptyState
        size="sm"
        icon={<Icon name="inbox" size={24} />}
        title="아직 항목이 없습니다"
        description="여기에 추가된 항목이 표시됩니다."
      />
    </div>
  )
}

const SIZES: EmptyStateSize[] = ['sm', 'md', 'lg']
const ICON_SIZE: Record<EmptyStateSize, number> = { sm: 24, md: 40, lg: 48 }

function MatrixRow({ size }: { size: EmptyStateSize }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
      <div
        style={{
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <EmptyState size={size} icon={<Icon name="inbox" size={ICON_SIZE[size]} />} title="빈 상태" />
      </div>
      <div
        style={{
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <EmptyState size={size} title="빈 상태" description="설명 텍스트가 여기에 표시됩니다." />
      </div>
      <div
        style={{
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <EmptyState
          size={size}
          icon={<Icon name="inbox" size={ICON_SIZE[size]} />}
          title="빈 상태"
          description="설명 텍스트가 여기에 표시됩니다."
          action={<Button>새로 만들기</Button>}
          secondaryAction={<Button variant="text">도움말</Button>}
        />
      </div>
    </div>
  )
}

function MatrixTheme({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div
      data-theme={theme}
      style={{ background: 'var(--surface)', padding: 24, display: 'grid', gap: 16 }}
    >
      <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-variant)' }}>
        {theme === 'light' ? '라이트' : '다크'}
      </div>
      {SIZES.map((size) => (
        <MatrixRow key={size} size={size} />
      ))}
    </div>
  )
}

/** 3 사이즈(행) × (아이콘+제목 / 제목+설명 / 아이콘+제목+설명+주+보조액션)(열). 라이트/다크 동시 배치 */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <MatrixTheme theme="light" />
      <MatrixTheme theme="dark" />
    </div>
  )
}
