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
