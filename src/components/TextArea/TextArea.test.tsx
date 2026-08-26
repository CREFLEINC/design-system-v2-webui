import { expect, test, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { TextArea } from './TextArea'
import styles from './TextArea.module.css'

test('label이 textarea와 연결되고 타이핑이 onChange로 전달된다', async () => {
  const onChange = vi.fn()
  render(<TextArea label="비고" onChange={onChange} />)
  const textarea = screen.getByLabelText('비고')
  await userEvent.type(textarea, '홍길동')
  expect(textarea).toHaveValue('홍길동')
  expect(onChange).toHaveBeenCalled()
})

test('helperText가 aria-describedby로 연결되고 aria-invalid는 없다', () => {
  render(<TextArea label="설명" helperText="자유롭게 작성하세요" />)
  const textarea = screen.getByLabelText('설명')
  const describedBy = textarea.getAttribute('aria-describedby')
  expect(describedBy).toBeTruthy()
  expect(document.getElementById(describedBy!)).toHaveTextContent('자유롭게 작성하세요')
  expect(textarea).not.toHaveAttribute('aria-invalid')
})

test('error면 aria-invalid=true, helperText 대체, describedby가 error를 가리킨다', () => {
  render(<TextArea label="설명" helperText="도움말" error="필수 항목입니다" />)
  const textarea = screen.getByLabelText('설명')
  expect(textarea).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText('필수 항목입니다')).toBeInTheDocument()
  expect(screen.queryByText('도움말')).not.toBeInTheDocument()
  const describedBy = textarea.getAttribute('aria-describedby')!
  expect(document.getElementById(describedBy)).toHaveTextContent('필수 항목입니다')
})

test('disabled면 입력이 차단된다', async () => {
  const onChange = vi.fn()
  render(<TextArea label="설명" disabled onChange={onChange} />)
  const textarea = screen.getByLabelText('설명')
  expect(textarea).toBeDisabled()
  await userEvent.type(textarea, '실패')
  expect(onChange).not.toHaveBeenCalled()
})

test('ref가 실제 HTMLTextAreaElement로 전달되어 포커스 가능하다', () => {
  const ref = createRef<HTMLTextAreaElement>()
  render(<TextArea label="설명" ref={ref} />)
  expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  expect(ref.current).toBe(screen.getByLabelText('설명'))
  ref.current?.focus()
  expect(ref.current).toHaveFocus()
})

test('size 클래스가 적용된다 (기본 md, lg·xl 지정)', () => {
  const { rerender } = render(<TextArea label="설명" />)
  expect(screen.getByLabelText('설명').parentElement?.className).toContain(styles.md)
  rerender(<TextArea label="설명" size="lg" />)
  expect(screen.getByLabelText('설명').parentElement?.className).toContain(styles.lg)
  rerender(<TextArea label="설명" size="xl" />)
  expect(screen.getByLabelText('설명').parentElement?.className).toContain(styles.xl)
})

test('disabled + disabledReason이면 사유가 DOM에 렌더되고 aria-describedby로 연결된다', () => {
  render(<TextArea label="설명" disabled disabledReason="외부 시스템 원본 값이라 수정할 수 없습니다" />)
  const textarea = screen.getByLabelText('설명')
  expect(screen.getByText('외부 시스템 원본 값이라 수정할 수 없습니다')).toBeInTheDocument()
  const describedBy = textarea.getAttribute('aria-describedby')
  expect(describedBy).toBeTruthy()
  expect(document.getElementById(describedBy!)).toHaveTextContent('외부 시스템 원본 값이라 수정할 수 없습니다')
})

test('disabled + disabledReason + error면 error만 표시되고 사유는 렌더되지 않는다', () => {
  render(
    <TextArea
      label="설명"
      disabled
      disabledReason="외부 시스템 원본 값이라 수정할 수 없습니다"
      error="필수 항목입니다"
    />
  )
  expect(screen.getByText('필수 항목입니다')).toBeInTheDocument()
  expect(screen.queryByText('외부 시스템 원본 값이라 수정할 수 없습니다')).not.toBeInTheDocument()
})

test('disabled + disabledReason + helperText면 사유만 표시되고 helperText는 렌더되지 않는다', () => {
  render(
    <TextArea
      label="설명"
      disabled
      disabledReason="외부 시스템 원본 값이라 수정할 수 없습니다"
      helperText="도움말"
    />
  )
  expect(screen.getByText('외부 시스템 원본 값이라 수정할 수 없습니다')).toBeInTheDocument()
  expect(screen.queryByText('도움말')).not.toBeInTheDocument()
})

test('disabled가 아니면 disabledReason은 무시되고 helperText가 대신 표시된다', () => {
  render(<TextArea label="설명" disabledReason="외부 시스템 원본 값이라 수정할 수 없습니다" helperText="도움말" />)
  const textarea = screen.getByLabelText('설명')
  expect(screen.queryByText('외부 시스템 원본 값이라 수정할 수 없습니다')).not.toBeInTheDocument()
  expect(screen.getByText('도움말')).toBeInTheDocument()
  const describedBy = textarea.getAttribute('aria-describedby')!
  expect(document.getElementById(describedBy)).toHaveTextContent('도움말')
})

test('소비자가 넘긴 aria-describedby와 disabledReason의 id가 함께 병합된다', () => {
  render(
    <TextArea
      label="설명"
      disabled
      disabledReason="외부 시스템 원본 값이라 수정할 수 없습니다"
      aria-describedby="ext"
    />
  )
  const textarea = screen.getByLabelText('설명')
  const describedBy = textarea.getAttribute('aria-describedby')!
  const ids = describedBy.split(' ')
  expect(ids).toContain('ext')
  const reasonId = ids.find((i) => i !== 'ext')
  expect(reasonId).toBeTruthy()
  expect(document.getElementById(reasonId!)).toHaveTextContent('외부 시스템 원본 값이라 수정할 수 없습니다')
})

test('rows 기본값은 3이고, rows=5 지정 시 반영된다', () => {
  const { rerender } = render(<TextArea label="설명" />)
  expect(screen.getByLabelText('설명')).toHaveAttribute('rows', '3')
  rerender(<TextArea label="설명" rows={5} />)
  expect(screen.getByLabelText('설명')).toHaveAttribute('rows', '5')
})

test('maxLength=200이면 카운터 "0/200"을 렌더하고 네이티브 maxlength는 부여하지 않으며 입력이 차단되지 않는다', async () => {
  render(<TextArea label="설명" maxLength={200} />)
  const textarea = screen.getByLabelText('설명')
  expect(screen.getByText('0/200')).toBeInTheDocument()
  expect(textarea).not.toHaveAttribute('maxlength')
  await userEvent.type(textarea, '가나다')
  expect(textarea).toHaveValue('가나다')
})

test('카운터가 describedby에 포함된다 — helperText와 함께일 때 [helper, count] 순서, 접근 가능 이름은 오염되지 않는다', () => {
  render(<TextArea label="설명" helperText="도움말" maxLength={10} />)
  const textarea = screen.getByLabelText('설명')
  const describedBy = textarea.getAttribute('aria-describedby')!
  const ids = describedBy.split(' ')
  const helperEl = document.getElementById(ids[0])
  const countEl = document.getElementById(ids[1])
  expect(helperEl).toHaveTextContent('도움말')
  expect(countEl).toHaveTextContent('0/10')
  expect(textarea).toHaveAccessibleDescription('도움말 0/10')
  expect(textarea).toHaveAccessibleName('설명')
})

test('showCount={false}면 카운터가 렌더되지 않는다', () => {
  render(<TextArea label="설명" maxLength={200} showCount={false} />)
  expect(screen.queryByText('0/200')).not.toBeInTheDocument()
})

test('maxLength 없이 showCount면 현재 글자 수만 표시된다', () => {
  render(<TextArea label="설명" showCount defaultValue="abc" />)
  expect(screen.getByText('3')).toBeInTheDocument()
})

test('상한 초과 시 aria-invalid=true, 카운터에 countOver, 래퍼에 invalid 클래스가 붙는다', () => {
  render(<TextArea label="설명" maxLength={10} value="12345678901" onChange={() => {}} />)
  const textarea = screen.getByLabelText('설명')
  expect(textarea).toHaveAttribute('aria-invalid', 'true')
  const count = screen.getByText('11/10')
  expect(count.className).toContain(styles.countOver)
  expect(textarea.parentElement?.className).toContain(styles.invalid)
})

test('live 영역이 zone 전환에 따라 갱신된다 (near/over 진입 시에만, 같은 zone 유지 중엔 불변)', () => {
  const { container, rerender } = render(
    <TextArea label="설명" maxLength={10} value="12345" onChange={() => {}} />
  )
  const live = container.querySelector('[aria-live="polite"]')
  expect(live).toHaveTextContent('')

  rerender(<TextArea label="설명" maxLength={10} value="123456789" onChange={() => {}} />)
  expect(live).toHaveTextContent('글자 수 상한 10자에 가까워졌습니다')

  rerender(<TextArea label="설명" maxLength={10} value="1234567890" onChange={() => {}} />)
  expect(live).toHaveTextContent('글자 수 상한 10자에 가까워졌습니다')

  rerender(<TextArea label="설명" maxLength={10} value="12345678901" onChange={() => {}} />)
  expect(live).toHaveTextContent('글자 수 상한 10자를 초과했습니다')

  rerender(<TextArea label="설명" maxLength={10} value="12345" onChange={() => {}} />)
  expect(live).toHaveTextContent('')
})

test('resize: 기본은 resizeVertical, resize="none"이면 없음, maxRows 지정 시엔 resize="vertical"이어도 없음', () => {
  const { rerender } = render(<TextArea label="설명" />)
  expect(screen.getByLabelText('설명').className).toContain(styles.resizeVertical)

  rerender(<TextArea label="설명" resize="none" />)
  expect(screen.getByLabelText('설명').className).not.toContain(styles.resizeVertical)

  rerender(<TextArea label="설명" maxRows={6} resize="vertical" />)
  expect(screen.getByLabelText('설명').className).not.toContain(styles.resizeVertical)
})

test('uncontrolled(defaultValue="abc", maxLength=10)에서 타이핑 시 카운터가 갱신된다', async () => {
  render(<TextArea label="설명" defaultValue="abc" maxLength={10} />)
  expect(screen.getByText('3/10')).toBeInTheDocument()
  const textarea = screen.getByLabelText('설명')
  await userEvent.type(textarea, 'd')
  expect(screen.getByText('4/10')).toBeInTheDocument()
})

test('controlled value 변경 시 카운터가 갱신된다', () => {
  const { rerender } = render(<TextArea label="설명" maxLength={10} value="ab" onChange={() => {}} />)
  expect(screen.getByText('2/10')).toBeInTheDocument()
  rerender(<TextArea label="설명" maxLength={10} value="abcd" onChange={() => {}} />)
  expect(screen.getByText('4/10')).toBeInTheDocument()
})

test('maxRows 지정 렌더가 크래시 없이 동작한다', async () => {
  render(<TextArea label="설명" rows={3} maxRows={8} />)
  const textarea = screen.getByLabelText('설명')
  await userEvent.type(textarea, '여러 줄\n텍스트\n입력')
  expect(textarea).toHaveValue('여러 줄\n텍스트\n입력')
})

test('form reset 시 uncontrolled 값·카운터·invalid·live 안내가 복귀한다', async () => {
  const { container } = render(
    <form data-testid="form">
      <TextArea label="비고" maxLength={5} />
    </form>
  )
  const textarea = screen.getByLabelText('비고')
  const live = container.querySelector('[aria-live="polite"]')
  await userEvent.type(textarea, '123456')

  expect(textarea).toHaveValue('123456')
  expect(screen.getByText('6/5')).toBeInTheDocument()
  expect(textarea).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText('6/5').className).toContain(styles.countOver)
  expect(live).toHaveTextContent('글자 수 상한 5자를 초과했습니다')

  const form = screen.getByTestId('form') as HTMLFormElement
  await act(async () => {
    form.reset()
  })

  expect(textarea).toHaveValue('')
  expect(screen.getByText('0/5')).toBeInTheDocument()
  expect(textarea).not.toHaveAttribute('aria-invalid')
  expect(screen.getByText('0/5').className).not.toContain(styles.countOver)
  expect(live).toHaveTextContent('')
})

test('form reset 시 비어 있지 않은 defaultValue로 복귀한다', async () => {
  render(
    <form data-testid="form">
      <TextArea label="비고" defaultValue="abc" maxLength={10} />
    </form>
  )
  const textarea = screen.getByLabelText('비고')
  await userEvent.type(textarea, 'def')
  expect(screen.getByText('6/10')).toBeInTheDocument()

  const form = screen.getByTestId('form') as HTMLFormElement
  await act(async () => {
    form.reset()
  })

  expect(textarea).toHaveValue('abc')
  expect(screen.getByText('3/10')).toBeInTheDocument()
})

test('maxRows 해제 시 컴포넌트가 쓴 인라인 높이/overflow만 제거된다 (소비자 style 미지정)', () => {
  const spy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '8px',
    paddingBottom: '8px'
  } as unknown as CSSStyleDeclaration)
  try {
    const { rerender } = render(<TextArea label="비고" maxRows={6} defaultValue={'줄1\n줄2'} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('0px')
    expect(textarea.style.overflowY).toBe('hidden')
    expect(textarea.className).not.toContain(styles.resizeVertical)

    rerender(<TextArea label="비고" defaultValue={'줄1\n줄2'} />)

    expect(textarea.style.height).toBe('')
    expect(textarea.style.overflowY).toBe('')
    expect(textarea.className).toContain(styles.resizeVertical)
  } finally {
    spy.mockRestore()
  }
})

test('소비자가 style로 준 height/overflow는 마운트 시 제거되지 않는다 (maxRows 미지정)', () => {
  render(<TextArea label="비고" style={{ height: '120px', overflowY: 'scroll' }} />)
  const textarea = screen.getByLabelText('비고')
  expect(textarea.style.height).toBe('120px')
  expect(textarea.style.overflowY).toBe('scroll')
})

test('maxRows 해제 시 소비자 style이 유지되면 그 값으로 복원된다', () => {
  const spy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '8px',
    paddingBottom: '8px'
  } as unknown as CSSStyleDeclaration)
  try {
    const { rerender } = render(
      <TextArea label="비고" style={{ height: '120px', overflowY: 'scroll' }} maxRows={6} />
    )
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('0px')

    rerender(<TextArea label="비고" style={{ height: '120px', overflowY: 'scroll' }} />)

    expect(textarea.style.height).toBe('120px')
    expect(textarea.style.overflowY).toBe('scroll')
  } finally {
    spy.mockRestore()
  }
})

test('maxRows 해제와 동시에 새 style을 주면 새 값이 유지된다', () => {
  const spy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '8px',
    paddingBottom: '8px'
  } as unknown as CSSStyleDeclaration)
  try {
    const { rerender } = render(
      <TextArea label="비고" style={{ height: '120px', overflowY: 'scroll' }} maxRows={6} />
    )
    rerender(<TextArea label="비고" style={{ height: '150px', overflowY: 'scroll' }} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('150px')
    expect(textarea.style.overflowY).toBe('scroll')
  } finally {
    spy.mockRestore()
  }
})

test('form 속성이 바뀌면 reset listener가 새 owner form으로 재구독된다', async () => {
  const ui = (formId: string) => (
    <>
      <form data-testid="fa" id="ta-form-a" />
      <form data-testid="fb" id="ta-form-b" />
      <TextArea label="비고" form={formId} defaultValue="abc" maxLength={5} />
    </>
  )
  const { container, rerender } = render(ui('ta-form-a'))
  const textarea = screen.getByLabelText('비고')
  const live = container.querySelector('[aria-live="polite"]')
  await userEvent.type(textarea, 'def')

  expect(screen.getByText('6/5')).toBeInTheDocument()
  expect(textarea).toHaveAttribute('aria-invalid', 'true')

  rerender(ui('ta-form-b'))

  const fa = screen.getByTestId('fa') as HTMLFormElement
  const fb = screen.getByTestId('fb') as HTMLFormElement

  await act(async () => {
    fa.reset()
  })
  expect(textarea).toHaveValue('abcdef')
  expect(screen.getByText('6/5')).toBeInTheDocument()
  expect(textarea).toHaveAttribute('aria-invalid', 'true')

  await act(async () => {
    fb.reset()
  })
  expect(textarea).toHaveValue('abc')
  expect(screen.getByText('3/5')).toBeInTheDocument()
  expect(textarea).not.toHaveAttribute('aria-invalid')
  expect(live).toHaveTextContent('')
})

test('reset 직후 unmount되어도 예약된 microtask가 안전하다', async () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const { unmount } = render(
      <form data-testid="form">
        <TextArea label="비고" defaultValue="abc" />
      </form>
    )
    const form = screen.getByTestId('form') as HTMLFormElement
    form.reset()
    unmount()
    await act(async () => {})
    expect(errorSpy).not.toHaveBeenCalled()
  } finally {
    errorSpy.mockRestore()
  }
})

test('maxRows 유지 중 style height 단독 변경에도 자동 높이가 유지되고 해제 시 최신 height가 복원된다', () => {
  const spy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '8px',
    paddingBottom: '8px'
  } as unknown as CSSStyleDeclaration)
  try {
    const { rerender } = render(<TextArea label="비고" maxRows={6} defaultValue={'줄1\n줄2'} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('0px')
    expect(textarea.style.overflowY).toBe('hidden')

    rerender(<TextArea label="비고" maxRows={6} defaultValue={'줄1\n줄2'} style={{ height: '150px' }} />)

    expect(textarea.style.height).toBe('0px')
    expect(textarea.style.overflowY).toBe('hidden')

    rerender(<TextArea label="비고" defaultValue={'줄1\n줄2'} style={{ height: '150px' }} />)

    expect(textarea.style.height).toBe('150px')
    expect(textarea.style.overflowY).toBe('')
    expect(textarea.className).toContain(styles.resizeVertical)
  } finally {
    spy.mockRestore()
  }
})

test('maxRows 유지 중 style overflowY 단독 변경에도 자동 overflow가 유지되고 해제 시 최신 overflowY가 복원된다', () => {
  const spy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '8px',
    paddingBottom: '8px'
  } as unknown as CSSStyleDeclaration)
  try {
    const { rerender } = render(<TextArea label="비고" maxRows={6} defaultValue={'줄1\n줄2'} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('0px')
    expect(textarea.style.overflowY).toBe('hidden')

    rerender(<TextArea label="비고" maxRows={6} defaultValue={'줄1\n줄2'} style={{ overflowY: 'scroll' }} />)

    expect(textarea.style.overflowY).toBe('hidden')
    expect(textarea.style.height).toBe('0px')

    rerender(<TextArea label="비고" defaultValue={'줄1\n줄2'} style={{ overflowY: 'scroll' }} />)

    expect(textarea.style.overflowY).toBe('scroll')
    expect(textarea.style.height).toBe('')
  } finally {
    spy.mockRestore()
  }
})

// 아래 레이아웃 재측정 테스트용 인프라 — jsdom 에는 ResizeObserver 가 없고(실측) rAF 는 ~16ms
// 타이머 기반이라 비결정적이므로, 전역을 스텁으로 주입해 알림·프레임을 테스트가 직접 구동한다.
class MockResizeObserver {
  static instances: MockResizeObserver[] = []
  callback: ResizeObserverCallback
  observed: Element[] = []
  disconnected = false
  constructor(cb: ResizeObserverCallback) { this.callback = cb; MockResizeObserver.instances.push(this) }
  observe(el: Element) { this.observed.push(el) }
  unobserve(el: Element) { this.observed = this.observed.filter((e) => e !== el) }
  disconnect() { this.disconnected = true; this.observed = [] }
  trigger(width: number, height = 0) {
    this.callback(
      [{ contentRect: { width, height } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver
    )
  }
}
const createRafStub = () => {
  const queue = new Map<number, FrameRequestCallback>()
  let nextId = 1
  const raf = (cb: FrameRequestCallback) => { const id = nextId++; queue.set(id, cb); return id }
  const caf = (id: number) => { queue.delete(id) }
  const flush = () => { const cbs = [...queue.values()]; queue.clear(); cbs.forEach((cb) => cb(0)) }
  return { raf, caf, flush, queue }
}

test('같은 value에서 className·fullWidth·containerClassName·style.width 변경 시 재측정된다', () => {
  // RO 스텁 없이 — jsdom 에 ResizeObserver 가 없으므로 컴포넌트의 typeof 가드가 걸린다.
  // 즉 이 테스트는 deps 채널만으로 재측정이 일어나는지를 본다.
  let sh = 40
  const gcs = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '0px',
    paddingBottom: '0px'
  } as unknown as CSSStyleDeclaration)
  const shSpy = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => sh)
  try {
    const { rerender } = render(<TextArea label="비고" maxRows={3} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('40px')
    expect(textarea.style.overflowY).toBe('hidden')

    sh = 120
    rerender(<TextArea label="비고" maxRows={3} className="narrow" />)
    expect(textarea.style.height).toBe('60px')
    expect(textarea.style.overflowY).toBe('auto')

    sh = 40
    rerender(<TextArea label="비고" maxRows={3} className="narrow" fullWidth />)
    expect(textarea.style.height).toBe('40px')
    expect(textarea.style.overflowY).toBe('hidden')

    sh = 120
    rerender(<TextArea label="비고" maxRows={3} className="narrow" fullWidth containerClassName="wide" />)
    expect(textarea.style.height).toBe('60px')

    sh = 40
    rerender(
      <TextArea label="비고" maxRows={3} className="narrow" fullWidth containerClassName="wide" style={{ width: '50%' }} />
    )
    expect(textarea.style.height).toBe('40px')
  } finally {
    gcs.mockRestore()
    shSpy.mockRestore()
  }
})

test('prop 변화 없이 부모 폭이 바뀌면 rAF 후 재측정된다', () => {
  MockResizeObserver.instances = []
  const rafStub = createRafStub()
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  vi.stubGlobal('requestAnimationFrame', rafStub.raf)
  vi.stubGlobal('cancelAnimationFrame', rafStub.caf)
  let sh = 40
  const gcs = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '0px',
    paddingBottom: '0px'
  } as unknown as CSSStyleDeclaration)
  const shSpy = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => sh)
  try {
    render(<TextArea label="비고" maxRows={3} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('40px')

    const ro = MockResizeObserver.instances.at(-1)!
    expect(ro.observed).toContain(textarea)

    ro.trigger(500) // 최초 알림 = 기준선만 기록
    expect(rafStub.queue.size).toBe(0)

    sh = 120
    ro.trigger(300) // 부모 폭 변경 — prop 변화도 리렌더도 없다
    expect(rafStub.queue.size).toBe(1)

    rafStub.flush()
    expect(textarea.style.height).toBe('60px')
    expect(textarea.style.overflowY).toBe('auto')
  } finally {
    vi.unstubAllGlobals()
    gcs.mockRestore()
    shSpy.mockRestore()
  }
})

test('폭이 그대로인 알림(자기 높이 쓰기의 메아리)은 재측정하지 않고, 연속 폭 변경은 하나로 합쳐진다', () => {
  MockResizeObserver.instances = []
  const rafStub = createRafStub()
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  vi.stubGlobal('requestAnimationFrame', rafStub.raf)
  vi.stubGlobal('cancelAnimationFrame', rafStub.caf)
  let sh = 40
  const gcs = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '0px',
    paddingBottom: '0px'
  } as unknown as CSSStyleDeclaration)
  const shSpy = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => sh)
  try {
    render(<TextArea label="비고" maxRows={3} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('40px')

    const ro = MockResizeObserver.instances.at(-1)!
    ro.trigger(500) // 기준선
    ro.trigger(500, 999) // 높이만 변경 = 우리 쓰기의 메아리
    expect(rafStub.queue.size).toBe(0)

    const measuredBefore = gcs.mock.calls.length
    sh = 120
    ro.trigger(300)
    ro.trigger(320)
    expect(rafStub.queue.size).toBe(1) // 연속 알림은 하나로 합쳐진다

    rafStub.flush()
    const measuredAfter = gcs.mock.calls.length
    expect(textarea.style.height).toBe('60px')
    expect(measuredAfter - measuredBefore).toBe(1) // 측정은 정확히 1회
  } finally {
    vi.unstubAllGlobals()
    gcs.mockRestore()
    shSpy.mockRestore()
  }
})

test('maxRows 해제 시 observer가 disconnect되고 재관찰하지 않는다', () => {
  MockResizeObserver.instances = []
  const rafStub = createRafStub()
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  vi.stubGlobal('requestAnimationFrame', rafStub.raf)
  vi.stubGlobal('cancelAnimationFrame', rafStub.caf)
  const sh = 40
  const gcs = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '0px',
    paddingBottom: '0px'
  } as unknown as CSSStyleDeclaration)
  const shSpy = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => sh)
  try {
    const { rerender } = render(<TextArea label="비고" maxRows={3} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('40px')
    expect(textarea.style.overflowY).toBe('hidden')

    rerender(<TextArea label="비고" />)

    expect(MockResizeObserver.instances.length).toBe(1) // 새 인스턴스 없음
    expect(MockResizeObserver.instances[0].disconnected).toBe(true)
    // 회차 2 의 소유권 정리 계약은 RO 도입 후에도 그대로 동작한다
    expect(textarea.style.height).toBe('')
    expect(textarea.style.overflowY).toBe('')
    expect(textarea.className).toContain(styles.resizeVertical)
  } finally {
    vi.unstubAllGlobals()
    gcs.mockRestore()
    shSpy.mockRestore()
  }
})

test('unmount 시 observer와 예약된 rAF 콜백이 정리된다', () => {
  MockResizeObserver.instances = []
  const rafStub = createRafStub()
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  vi.stubGlobal('requestAnimationFrame', rafStub.raf)
  vi.stubGlobal('cancelAnimationFrame', rafStub.caf)
  let sh = 40
  const gcs = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '0px',
    paddingBottom: '0px'
  } as unknown as CSSStyleDeclaration)
  const shSpy = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => sh)
  try {
    const { unmount } = render(<TextArea label="비고" maxRows={3} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('40px')

    const ro = MockResizeObserver.instances.at(-1)!
    ro.trigger(500) // 기준선
    sh = 120
    ro.trigger(300)
    expect(rafStub.queue.size).toBe(1) // 예약됨

    unmount()

    expect(MockResizeObserver.instances[0].disconnected).toBe(true)
    expect(rafStub.queue.size).toBe(0) // pending rAF 취소됨
    expect(() => rafStub.flush()).not.toThrow() // 남은 콜백 없음 — no-op
  } finally {
    vi.unstubAllGlobals()
    gcs.mockRestore()
    shSpy.mockRestore()
  }
})

test('style.lineHeight 변경 시 재측정된다 — 5차 리뷰 재현: lineHeight 20px→30px이면 60px→90px', () => {
  // RO 스텁 없이 — jsdom 에 ResizeObserver 가 없으므로 컴포넌트의 typeof 가드가 걸린다.
  // 즉 이 테스트는 deps 채널(styleLineHeight)만으로 재측정이 일어나는지를 본다.
  let line = '20px'
  const gcs = vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
    lineHeight: line,
    paddingTop: '0px',
    paddingBottom: '0px'
  }) as unknown as CSSStyleDeclaration)
  const shSpy = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(120)
  try {
    const { rerender } = render(<TextArea label="비고" rows={1} maxRows={3} style={{ lineHeight: '20px' }} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('60px')
    expect(textarea.style.overflowY).toBe('auto')

    line = '30px'
    rerender(<TextArea label="비고" rows={1} maxRows={3} style={{ lineHeight: '30px' }} />)

    expect(textarea.style.height).toBe('90px')
    expect(textarea.style.overflowY).toBe('auto')
  } finally {
    gcs.mockRestore()
    shSpy.mockRestore()
  }
})

test('fontSize·fontFamily·paddingTop/paddingBottom 값 변경 시 재측정된다', () => {
  // RO 스텁 없이 — jsdom 에 ResizeObserver 가 없으므로 컴포넌트의 typeof 가드가 걸린다.
  // 즉 이 테스트는 deps 채널(styleFontSize·styleFontFamily·stylePaddingTop·stylePaddingBottom)
  // 만으로 재측정이 일어나는지를 본다. shorthand 혼용 금지 계약에 따라 longhand 키만 사용한다.
  let sh = 40
  const gcs = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '0px',
    paddingBottom: '0px'
  } as unknown as CSSStyleDeclaration)
  const shSpy = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => sh)
  try {
    const { rerender } = render(<TextArea label="비고" maxRows={3} style={{ fontSize: '14px' }} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('40px')
    expect(textarea.style.overflowY).toBe('hidden')

    sh = 120
    rerender(<TextArea label="비고" maxRows={3} style={{ fontSize: '16px' }} />)
    expect(textarea.style.height).toBe('60px')
    expect(textarea.style.overflowY).toBe('auto')

    sh = 40
    rerender(<TextArea label="비고" maxRows={3} style={{ fontSize: '16px', fontFamily: 'serif' }} />)
    expect(textarea.style.height).toBe('40px')
    expect(textarea.style.overflowY).toBe('hidden')

    sh = 120
    rerender(
      <TextArea label="비고" maxRows={3} style={{ fontSize: '16px', fontFamily: 'serif', paddingTop: '4px' }} />
    )
    expect(textarea.style.height).toBe('60px')

    sh = 40
    rerender(
      <TextArea
        label="비고"
        maxRows={3}
        style={{ fontSize: '16px', fontFamily: 'serif', paddingTop: '4px', paddingBottom: '4px' }}
      />
    )
    expect(textarea.style.height).toBe('40px')
  } finally {
    gcs.mockRestore()
    shSpy.mockRestore()
  }
})

test('padding shorthand 값 변경 시 재측정된다', () => {
  // RO 스텁 없이 — jsdom 에 ResizeObserver 가 없으므로 컴포넌트의 typeof 가드가 걸린다.
  // 즉 이 테스트는 deps 채널(stylePadding)만으로 재측정이 일어나는지를 본다. padding 키 단독 —
  // 다른 padding/font 키와 섞지 않는다(shorthand 혼용 금지 계약).
  let sh = 40
  const gcs = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '0px',
    paddingBottom: '0px'
  } as unknown as CSSStyleDeclaration)
  const shSpy = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => sh)
  try {
    const { rerender } = render(<TextArea label="비고" maxRows={3} style={{ padding: '8px' }} />)
    const textarea = screen.getByLabelText('비고')
    expect(textarea.style.height).toBe('40px')
    expect(textarea.style.overflowY).toBe('hidden')

    sh = 120
    rerender(<TextArea label="비고" maxRows={3} style={{ padding: '12px' }} />)
    expect(textarea.style.height).toBe('60px')
    expect(textarea.style.overflowY).toBe('auto')
  } finally {
    gcs.mockRestore()
    shSpy.mockRestore()
  }
})
