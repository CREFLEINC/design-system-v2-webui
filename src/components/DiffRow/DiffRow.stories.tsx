import type { Meta, StoryObj } from '@storybook/react-vite'
import { DiffRow } from './DiffRow'

const meta = {
  title: 'Components/DiffRow',
  component: DiffRow,
  args: { label: '표시명', before: '구 명칭', after: '새 명칭' }
} satisfies Meta<typeof DiffRow>
export default meta
type Story = StoryObj<typeof meta>

/** Matrix 전용 캡션 타일 — 런타임 의존성 없는 로컬 데모 래퍼, 컨테이너 컴포넌트 아님. */
function Tile({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div style={{ width: 260 }}>
      <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)', marginBottom: 8 }}>{caption}</div>
      {children}
    </div>
  )
}

export const Playground: Story = {
  render: (args) => (
    <div style={{ maxWidth: 320 }}>
      <DiffRow {...args} />
    </div>
  )
}

export const EmptyToFilled: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <DiffRow label="분류" after="표준" />
      <DiffRow label="분류" after="표준" emptyText="—" />
    </div>
  )
}

export const Removed: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
      <div style={{ font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' }}>
        값이 삭제된 경우에도 취소선이나 빨간색은 쓰지 않는다 — 이전 값과 동일하게 중립 톤으로 "(없음)"만 표기한다.
      </div>
      <DiffRow label="분류" before="표준" after="" />
    </div>
  )
}

export const FullList: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <DiffRow label="표시명" before="구 명칭" after="새 명칭" />
      <DiffRow label="사용 여부" before="사용" after="사용 중지" />
      <DiffRow label="분류" before="표준" after="표준" changed={false} />
    </div>
  )
}

export const LongText: Story = {
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <DiffRow
        label="표시명"
        before="기존 항목 표시명 - 변경 전 전체 문구를 그대로 유지한 긴 설명 텍스트"
        after="새 항목 표시명 - 변경 후 전체 문구를 그대로 유지한 긴 설명 텍스트로 줄바꿈 대비 확인"
      />
    </div>
  )
}

/** 라이트/다크 스크린샷 스윕: 기본 / 빈값→채움 / 삭제 / 미변경 / 긴 텍스트 / emptyText 재정의 */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, background: 'var(--surface)', padding: 24 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Tile caption="기본">
          <DiffRow label="표시명" before="구 명칭" after="새 명칭" />
        </Tile>
        <Tile caption="빈값→채움">
          <DiffRow label="분류" after="표준" />
        </Tile>
        <Tile caption="삭제">
          <DiffRow label="분류" before="표준" after="" />
        </Tile>
        <Tile caption="미변경">
          <DiffRow label="사용 여부" before="사용" after="사용" changed={false} />
        </Tile>
        <Tile caption="긴 텍스트">
          <DiffRow
            label="표시명"
            before="기존 항목 표시명 - 변경 전 전체 문구를 그대로 유지한 긴 설명 텍스트"
            after="새 항목 표시명 - 변경 후 전체 문구를 그대로 유지한 긴 설명 텍스트로 줄바꿈 대비 확인"
          />
        </Tile>
        <Tile caption="emptyText 재정의">
          <DiffRow label="분류" after="표준" emptyText="—" />
        </Tile>
      </div>
    </div>
  )
}
