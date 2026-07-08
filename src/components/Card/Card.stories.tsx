import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card, CardHeader, CardBody, CardFooter, type CardSurface, type CardElevation } from './Card'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'

const meta = {
  title: 'Components/Card',
  component: Card,
  args: { surface: 'low', elevation: 0 }
} satisfies Meta<typeof Card>
export default meta
type Story = StoryObj<typeof meta>

/** 비-interactive Card + 내부 실제 Button 조합 (권장 패턴) */
export const Playground: Story = {
  render: (args) => (
    <div style={{ maxWidth: 360 }}>
      <Card {...args}>
        <CardHeader>월간 검사 요약</CardHeader>
        <CardBody>총 1,240건 중 불량 32건이 검출되었습니다.</CardBody>
        <CardFooter>
          <Button variant="text">자세히</Button>
          <Button>확인</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

/** 전체 표면이 클릭 가능한 카드 — 내부에 다른 포커스 컨트롤을 두지 않는다 */
export const Interactive: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Card
        interactive
        elevation={1}
        onClick={() => alert('설비 A 상세로 이동')}
        aria-label="설비 A, 가동중, 상세 보기"
      >
        <CardHeader style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="factory" size={24} />
          설비 A · 가동중
        </CardHeader>
        <CardBody>카드 전체를 클릭하면 상세 화면으로 이동합니다.</CardBody>
      </Card>
    </div>
  )
}

const surfaces: CardSurface[] = ['base', 'low', 'default', 'high']
const elevations: CardElevation[] = [0, 1, 2, 3]

/** 축을 열거: surface × elevation 그리드 + bordered + interactive 상태 행 */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, background: 'var(--surface)', padding: 24 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        {surfaces.map((s) => (
          <div key={s} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {elevations.map((e) => (
              <div key={e} style={{ width: 200 }}>
                <Card surface={s} elevation={e}>
                  <CardHeader>카드</CardHeader>
                  <CardBody>본문 텍스트</CardBody>
                </Card>
                <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)', marginTop: 4 }}>
                  {s} · elev{e}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* surface별 bordered 1px --outline-variant 경계선 확인 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {surfaces.map((s) => (
          <div key={s} style={{ width: 200 }}>
            <Card surface={s} bordered>
              <CardHeader>bordered</CardHeader>
              <CardBody>{s} · 1px 경계선</CardBody>
            </Card>
          </div>
        ))}
      </div>

      {/* interactive 상태 행: 기본 / 비활성 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 200 }}>
          <Card interactive elevation={1}>
            <CardHeader>클릭 가능</CardHeader>
            <CardBody>탭·호버·포커스 상태를 확인하세요.</CardBody>
          </Card>
        </div>
        <div style={{ width: 200 }}>
          <Card interactive disabled elevation={1}>
            <CardHeader>비활성</CardHeader>
            <CardBody>상태 레이어 없음, 내용은 그대로.</CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
