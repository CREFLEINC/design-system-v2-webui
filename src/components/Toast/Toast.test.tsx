import { useRef } from 'react'
import { expect, test, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast, type ToastOptions, type ToastProviderProps } from './Toast'

// src/test/setup.ts already installs the fake-timers jest shim, so vi.useFakeTimers() + userEvent cooperate.
const EXIT_MS = 150 // must match Toast.tsx EXIT_MS

function Trigger({ options }: { options?: ToastOptions }) {
  const { show } = useToast()
  return <button onClick={() => show(options ?? { description: '저장되었습니다' })}>알림</button>
}

function setup(providerProps: Partial<ToastProviderProps> = {}, options?: ToastOptions) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<ToastProvider {...providerProps}><Trigger options={options} /></ToastProvider>)
  return { user, click: () => user.click(screen.getByRole('button', { name: '알림' })) }
}

// 증가 카운터로 서로 다른 토스트를 쌓는 하네스 (max 테스트용)
function Counter() {
  const { show } = useToast()
  const n = useRef(0)
  return <button onClick={() => { n.current += 1; show({ description: `토스트 ${n.current}`, duration: 0 }) }}>추가</button>
}

test('show()는 role=status 토스트를 렌더하고 error 변형은 role=alert가 된다', async () => {
  vi.useFakeTimers()
  try {
    const a = setup({}, { description: '저장되었습니다' })
    await a.click()
    expect(screen.getByRole('status')).toHaveTextContent('저장되었습니다')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})

test('error 변형은 role=alert(assertive)로 announce된다', async () => {
  vi.useFakeTimers()
  try {
    const a = setup({}, { variant: 'error', description: '업로드 실패' })
    await a.click()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('업로드 실패')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
  } finally { vi.useRealTimers() }
})

test('duration 경과 후 종료 애니메이션 시간까지 지나면 자동 제거된다', async () => {
  vi.useFakeTimers()
  try {
    const a = setup({}, { description: '자동 사라짐', duration: 3000 })
    await a.click()
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(3000) })       // duration 만료 → leaving 표시 + 제거 예약
    act(() => { vi.advanceTimersByTime(EXIT_MS) })     // 종료 애니메이션 시간 후 실제 제거
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})

test('호버 중에는 자동 dismiss가 일시정지되고 벗어나면 재개된다', async () => {
  vi.useFakeTimers()
  try {
    const a = setup({}, { description: '호버 유지', duration: 3000 })
    await a.click()
    const toast = screen.getByRole('status')
    await a.user.hover(toast)
    act(() => { vi.advanceTimersByTime(6000) })        // 일시정지 → 만료 시간 한참 지나도 유지
    expect(screen.getByRole('status')).toBeInTheDocument()
    await a.user.unhover(toast)
    act(() => { vi.advanceTimersByTime(3000 + EXIT_MS) }) // 남은 시간 재개 → 제거
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})

test('닫기 버튼 클릭이 토스트를 수동 제거한다', async () => {
  vi.useFakeTimers()
  try {
    const a = setup({}, { description: '수동 닫기', duration: 0 }) // 자동 dismiss 없음
    await a.click()
    expect(screen.getByRole('status')).toBeInTheDocument()
    await a.user.click(screen.getByRole('button', { name: '알림 닫기' }))
    act(() => { vi.advanceTimersByTime(EXIT_MS) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})

test('max를 넘기면 가장 오래된 토스트가 즉시 제거된다', async () => {
  vi.useFakeTimers()
  try {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ToastProvider max={2}><Counter /></ToastProvider>)
    const add = screen.getByRole('button', { name: '추가' })
    await user.click(add); await user.click(add); await user.click(add)
    expect(screen.queryByText('토스트 1')).not.toBeInTheDocument() // 강제 축출은 애니메이션 없이 즉시
    expect(screen.getByText('토스트 2')).toBeInTheDocument()
    expect(screen.getByText('토스트 3')).toBeInTheDocument()
  } finally { vi.useRealTimers() }
})
