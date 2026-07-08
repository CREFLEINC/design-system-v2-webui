import type { Meta, StoryObj } from '@storybook/react-vite'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const meta = {
  title: 'Components/Breadcrumb',
  component: Breadcrumb,
  args: {
    items: [
      { label: '홈', href: '/' },
      { label: '제품', href: '/products' },
      { label: '센서', href: '/products/sensors' },
      { label: 'CX-500', href: '/products/sensors/cx-500' },
      { label: '사양' }
    ]
  }
} satisfies Meta<typeof Breadcrumb>
export default meta
type Story = StoryObj<typeof meta>

const FULL_ITEMS: BreadcrumbItem[] = [
  { label: '홈', href: '/' },
  { label: '제품', href: '/products' },
  { label: '센서', href: '/products/sensors' },
  { label: 'CX-500', href: '/products/sensors/cx-500' },
  { label: '사양' }
]

export const Playground: Story = {}

export const Collapsed: Story = {
  args: { items: FULL_ITEMS, maxItems: 3 },
  render: (args) => (
    <div style={{ display: 'grid', gap: 8 }}>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' }}>
        경로가 길면 가운데를 접어 &quot;첫 항목 + … + 마지막 2개&quot;로 축약한다. …(생략) 버튼을 클릭하면 숨은 항목이 인라인으로 펼쳐진다.
      </p>
      <Breadcrumb {...args} />
    </div>
  )
}

export const CustomSeparator: Story = {
  args: { items: FULL_ITEMS, separatorIcon: 'arrow_forward_ios' }
}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <strong>짧은 경로 (2항목)</strong>
        <Breadcrumb items={[{ label: '홈', href: '/' }, { label: '대시보드' }]} />
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <strong>전체 경로 (5항목, 축약 없음)</strong>
        <Breadcrumb items={FULL_ITEMS} />
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <strong>축약 (maxItems=3)</strong>
        <Breadcrumb items={FULL_ITEMS} maxItems={3} />
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <strong>href 없는 중간 정적 항목 포함</strong>
        <Breadcrumb
          items={[
            { label: '홈', href: '/' },
            { label: '분류' },
            { label: '로봇 팔', href: '/robots/arm' },
            { label: '상세 사양' }
          ]}
        />
      </div>
    </div>
  )
}
