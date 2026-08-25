import { useEffect, useRef, useState } from 'react'
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

type FocusRingProbeResult = {
  focusVisible: string
  ringOk: string
  restingValid: string
  focused: string
  resting: string
}

const FOCUS_RING_PROBE_PENDING: FocusRingProbeResult = {
  focusVisible: 'pending',
  ringOk: 'pending',
  restingValid: 'pending',
  focused: 'pending',
  resting: 'pending'
}

/** interactive+bordered(elevation 0) 카드를 스크립트로 포커스하고 computed box-shadow를 프로브한다 */
function FocusRingProbe() {
  const interactiveRef = useRef<HTMLElement>(null)
  const restingRef = useRef<HTMLElement>(null)
  const [result, setResult] = useState<FocusRingProbeResult>(FOCUS_RING_PROBE_PENDING)

  useEffect(() => {
    const interactiveEl = interactiveRef.current
    const restingEl = restingRef.current
    if (!interactiveEl || !restingEl) return

    let measured = false
    const measure = () => {
      if (measured) return
      measured = true
      interactiveEl.removeEventListener('transitionend', onTransitionEnd)
      const focusVisible = interactiveEl.matches(':focus-visible')
      const focused = getComputedStyle(interactiveEl).boxShadow
      const resting = getComputedStyle(restingEl).boxShadow
      const ringOk =
        focused !== 'none' && focused.includes('0px 0px 0px 2px') && focused.includes('0px 0px 0px 4px')
      const restingValid = resting !== 'none'
      setResult({
        focusVisible: String(focusVisible),
        ringOk: String(ringOk),
        restingValid: String(restingValid),
        focused,
        resting
      })
    }
    // `.card`에 `transition: box-shadow`가 걸려 있어 focus 직후 고정 지연으로 측정하면
    // 전이 중간값을 잡을 수 있다(실측) — box-shadow transitionend를 기다려 최종 값이
    // 안정된 뒤 측정한다. reduced-motion 등으로 이벤트가 안 뜨는 경우의 안전망으로
    // --motion-base(200ms)보다 넉넉한 타임아웃을 병행한다.
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'box-shadow') measure()
    }
    interactiveEl.addEventListener('transitionend', onTransitionEnd)
    const fallback = setTimeout(measure, 1000)
    interactiveEl.focus()

    return () => {
      clearTimeout(fallback)
      interactiveEl.removeEventListener('transitionend', onTransitionEnd)
    }
  }, [])

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ width: 200 }}>
        <Card ref={interactiveRef} interactive bordered aria-label="포커스 링 회귀 프로브 대상 카드">
          <CardHeader>포커스 대상</CardHeader>
          <CardBody>interactive + bordered, elevation 미지정(=0)</CardBody>
        </Card>
      </div>
      <div style={{ width: 200 }}>
        <Card ref={restingRef} bordered>
          <CardHeader>대조군</CardHeader>
          <CardBody>비-interactive resting bordered</CardBody>
        </Card>
      </div>
      <pre data-testid="focus-ring-probe">
        {`focusVisible=${result.focusVisible} ringOk=${result.ringOk} restingValid=${result.restingValid} focusedBoxShadow=${result.focused} restingBoxShadow=${result.resting}`}
      </pre>
    </div>
  )
}

/** 회귀(#77): interactive+bordered(elevation 0)의 focus-visible 링 — computed box-shadow 프로브 */
export const FocusRingBordered: Story = {
  render: () => <FocusRingProbe />
}
