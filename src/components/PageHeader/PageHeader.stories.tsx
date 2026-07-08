import type { Meta, StoryObj } from '@storybook/react-vite'
import { PageHeader } from './PageHeader'
import { Breadcrumb } from '../Breadcrumb/Breadcrumb'
import { Tabs } from '../Tabs/Tabs'
import { Button } from '../Button/Button'

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  args: { title: 'CX-500 센서 상세' }
} satisfies Meta<typeof PageHeader>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: () => (
    <PageHeader
      title="CX-500 센서 상세"
      breadcrumb={
        <Breadcrumb
          items={[{ label: '홈', href: '/' }, { label: '제품', href: '/products' }, { label: 'CX-500' }]}
        />
      }
      description="온도·진동 복합 센서. 최근 30일 가동 데이터를 기준으로 표시됩니다."
      actions={
        <>
          <Button variant="outlined">내보내기</Button>
          <Button>편집</Button>
        </>
      }
      tabs={
        <Tabs
          aria-label="센서 상세 보기"
          items={[
            { value: 'overview', label: '개요', content: '개요 내용' },
            { value: 'spec', label: '사양', content: '사양 내용' },
            { value: 'history', label: '이력', content: '이력 내용' }
          ]}
        />
      }
    />
  )
}

export const Compact: Story = {
  render: () => (
    <PageHeader
      size="compact"
      title="CX-500 센서 상세"
      breadcrumb={
        <Breadcrumb
          items={[{ label: '홈', href: '/' }, { label: '제품', href: '/products' }, { label: 'CX-500' }]}
        />
      }
      description="온도·진동 복합 센서. 최근 30일 가동 데이터를 기준으로 표시됩니다."
      actions={
        <>
          <Button variant="outlined" size="sm">내보내기</Button>
          <Button size="sm">편집</Button>
        </>
      }
      tabs={
        <Tabs
          size="sm"
          aria-label="센서 상세 보기"
          items={[
            { value: 'overview', label: '개요', content: '개요 내용' },
            { value: 'spec', label: '사양', content: '사양 내용' },
            { value: 'history', label: '이력', content: '이력 내용' }
          ]}
        />
      }
    />
  )
}

export const TitleOnly: Story = {
  render: () => <PageHeader title="설비 대시보드" headingLevel={2} />
}

export const ActionsWrap: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <PageHeader
        title="설비 종합 현황 대시보드"
        actions={
          <>
            <Button variant="outlined">필터</Button>
            <Button variant="outlined">내보내기</Button>
            <Button>새 설비 등록</Button>
          </>
        }
      />
    </div>
  )
}

function Tile({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <strong style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)' }}>{caption}</strong>
      {children}
    </div>
  )
}

/** 라이트/다크 스크린샷 스윕: {default, compact} × {title-only, title+description, full} */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, background: 'var(--surface)', padding: 24 }}>
      <Tile caption="default / title-only">
        <PageHeader title="대시보드" />
      </Tile>
      <Tile caption="default / title+description">
        <PageHeader title="대시보드" description="공장 전체 설비 가동 현황을 요약합니다." />
      </Tile>
      <Tile caption="default / full (breadcrumb + description + actions + tabs)">
        <PageHeader
          title="CX-500 센서 상세"
          breadcrumb={
            <Breadcrumb
              items={[{ label: '홈', href: '/' }, { label: '제품', href: '/products' }, { label: 'CX-500' }]}
            />
          }
          description="온도·진동 복합 센서. 최근 30일 가동 데이터를 기준으로 표시됩니다."
          actions={
            <>
              <Button variant="outlined">내보내기</Button>
              <Button>편집</Button>
            </>
          }
          tabs={
            <Tabs
              aria-label="센서 상세 보기"
              items={[
                { value: 'overview', label: '개요', content: '개요 내용' },
                { value: 'spec', label: '사양', content: '사양 내용' },
                { value: 'history', label: '이력', content: '이력 내용' }
              ]}
            />
          }
        />
      </Tile>
      <Tile caption="compact / title-only">
        <PageHeader size="compact" title="대시보드" />
      </Tile>
      <Tile caption="compact / title+description">
        <PageHeader size="compact" title="대시보드" description="공장 전체 설비 가동 현황을 요약합니다." />
      </Tile>
      <Tile caption="compact / full (breadcrumb + description + actions + tabs)">
        <PageHeader
          size="compact"
          title="CX-500 센서 상세"
          breadcrumb={
            <Breadcrumb
              items={[{ label: '홈', href: '/' }, { label: '제품', href: '/products' }, { label: 'CX-500' }]}
            />
          }
          description="온도·진동 복합 센서. 최근 30일 가동 데이터를 기준으로 표시됩니다."
          actions={
            <>
              <Button variant="outlined" size="sm">내보내기</Button>
              <Button size="sm">편집</Button>
            </>
          }
          tabs={
            <Tabs
              size="sm"
              aria-label="센서 상세 보기"
              items={[
                { value: 'overview', label: '개요', content: '개요 내용' },
                { value: 'spec', label: '사양', content: '사양 내용' },
                { value: 'history', label: '이력', content: '이력 내용' }
              ]}
            />
          }
        />
      </Tile>
    </div>
  )
}
