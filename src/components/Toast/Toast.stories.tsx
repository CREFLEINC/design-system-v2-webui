import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ToastProvider, useToast, type ToastPosition, type ToastVariant } from './Toast'
import { Button } from '../Button/Button'

const meta = {
  title: 'Components/Toast',
  component: ToastProvider,
  args: { children: null }
} satisfies Meta<typeof ToastProvider>
export default meta
type Story = StoryObj<typeof meta>

const VARIANTS: { variant: ToastVariant; title: string; description: string }[] = [
  { variant: 'success', title: '저장됨', description: '변경 사항이 저장되었습니다.' },
  { variant: 'error', title: '업로드 실패', description: '파일을 업로드하지 못했습니다. 다시 시도해 주세요.' },
  { variant: 'warning', title: '용량 경고', description: '저장 공간이 얼마 남지 않았습니다.' },
  { variant: 'info', title: '업데이트 알림', description: '새 버전이 배포되었습니다.' },
  { variant: 'idle', title: '알림', description: '작업이 대기열에 추가되었습니다.' }
]

function PlaygroundDemo() {
  const { show } = useToast()
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {VARIANTS.map(({ variant, title, description }) => (
        <Button key={variant} onClick={() => show({ variant, title, description })}>
          {title} 토스트
        </Button>
      ))}
    </div>
  )
}

export const Playground: Story = {
  render: () => (
    <ToastProvider position="bottom-right">
      <PlaygroundDemo />
    </ToastProvider>
  )
}

function AutoDismissDemo() {
  const { show } = useToast()
  return (
    <Button
      onClick={() =>
        show({ variant: 'success', title: '저장됨', description: '2초 후 자동으로 사라집니다.', duration: 2000 })
      }
    >
      짧은 자동 사라짐 토스트
    </Button>
  )
}

export const AutoDismiss: Story = {
  render: () => (
    <ToastProvider position="bottom-right">
      <AutoDismissDemo />
    </ToastProvider>
  )
}

function PersistentWithActionDemo() {
  const { show } = useToast()
  return (
    <Button
      onClick={() =>
        show({
          variant: 'info',
          title: '항목이 삭제되었습니다',
          description: '목록에서 제거되었습니다.',
          duration: 0,
          action: { label: '실행 취소', onClick: () => window.alert('실행 취소되었습니다') }
        })
      }
    >
      액션 포함 지속 토스트
    </Button>
  )
}

export const PersistentWithAction: Story = {
  render: () => (
    <ToastProvider position="bottom-right">
      <PersistentWithActionDemo />
    </ToastProvider>
  )
}

function ErrorAssertiveDemo() {
  const { show } = useToast()
  return (
    <Button
      variant="outlined"
      onClick={() => show({ variant: 'error', title: '업로드 실패', description: '네트워크 연결을 확인해 주세요.' })}
    >
      에러 토스트(assertive)
    </Button>
  )
}

export const ErrorAssertive: Story = {
  render: () => (
    <ToastProvider position="bottom-right">
      <ErrorAssertiveDemo />
    </ToastProvider>
  )
}

const POSITIONS: ToastPosition[] = [
  'top-left', 'top-center', 'top-right',
  'bottom-left', 'bottom-center', 'bottom-right'
]

function PositionsDemo({ position }: { position: ToastPosition }) {
  const { show } = useToast()
  return (
    <Button onClick={() => show({ variant: 'info', title: position, description: '코너 위치를 확인하세요.' })}>
      {position} 위치로 띄우기
    </Button>
  )
}

export const Positions: Story = {
  render: () => {
    const [position, setPosition] = useState<ToastPosition>('bottom-right')
    return (
      <ToastProvider position={position}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {POSITIONS.map((p) => (
              <Button key={p} variant={p === position ? 'filled' : 'outlined'} size="sm" onClick={() => setPosition(p)}>
                {p}
              </Button>
            ))}
          </div>
          <PositionsDemo position={position} />
        </div>
      </ToastProvider>
    )
  }
}

// Matrix: 실제 토스트는 일시적이므로, 마운트 시 다섯 변형을 duration:0으로 한 번에 띄워
// 스크린샷 한 장으로 모든 container/on-container 조합을 검증한다.
// Dialog.stories의 Matrix와 마찬가지로 전용 ToastProvider를 사용해 코너 스택으로 렌더한다.
function MatrixDemo() {
  const { show } = useToast()
  useEffect(() => {
    VARIANTS.forEach(({ variant, title, description }) => {
      show({ variant, title, description, duration: 0, dismissible: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

export const Matrix: Story = {
  render: () => (
    <ToastProvider position="bottom-right" max={VARIANTS.length}>
      <MatrixDemo />
    </ToastProvider>
  )
}
