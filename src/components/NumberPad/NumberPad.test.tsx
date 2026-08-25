import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { NumberPad, type NumberPadProps } from './NumberPad'

// 컨트롤드 하네스 — value/onChange가 필수인 controlled 전용 컴포넌트를 여러 번
// 연속으로 누르는 시나리오(예: 숫자 이어붙이기)에서 버퍼 진행을 재현한다.
// 단발성 클릭 검증은 굳이 하네스 없이 고정 value + vi.fn()으로 충분하다.
type HarnessProps = Omit<NumberPadProps, 'value' | 'onChange'> & {
  initialValue?: string
  onChangeSpy?: (value: string) => void
}

function Harness({ initialValue = '', onChangeSpy, ...rest }: HarnessProps) {
  const [value, setValue] = useState(initialValue)
  return (
    <NumberPad
      value={value}
      onChange={(next) => {
        setValue(next)
        onChangeSpy?.(next)
      }}
      {...rest}
    />
  )
}

// ── 숫자 이어붙이기 / 선행 0 정규화 ──────────────────────────

test('숫자 키를 연달아 누르면 버퍼가 이어붙는다', async () => {
  const user = userEvent.setup()
  const onChangeSpy = vi.fn()
  render(<Harness onChangeSpy={onChangeSpy} />)
  await user.click(screen.getByRole('button', { name: '1' }))
  await user.click(screen.getByRole('button', { name: '2' }))
  expect(onChangeSpy).toHaveBeenNthCalledWith(1, '1')
  expect(onChangeSpy).toHaveBeenNthCalledWith(2, '12')
})

test('선행 0 정규화: 버퍼가 "0"일 때 다른 숫자를 누르면 대체된다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="0" onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: '5' }))
  expect(onChange).toHaveBeenCalledWith('5')
})

test('선행 0 정규화: 버퍼가 "0"일 때 0을 누르면 변화가 없어 onChange가 호출되지 않는다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="0" onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: '0' }))
  expect(onChange).not.toHaveBeenCalled()
})

// ── C(전체 지움) / ←(한 글자 지움) ───────────────────────────

test('C 키는 버퍼를 전체 지운다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="59" onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: 'C — 전체 지우기' }))
  expect(onChange).toHaveBeenCalledWith('')
})

test('버퍼가 이미 비어 있으면 C를 눌러도 onChange가 호출되지 않는다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="" onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: 'C — 전체 지우기' }))
  expect(onChange).not.toHaveBeenCalled()
})

test('← 키는 마지막 한 글자를 지운다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="12" onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: '한 글자 지우기' }))
  expect(onChange).toHaveBeenCalledWith('1')
})

test('버퍼가 비어 있으면 ←를 눌러도 onChange가 호출되지 않는다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="" onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: '한 글자 지우기' }))
  expect(onChange).not.toHaveBeenCalled()
})

// ── allowDecimal ──────────────────────────────────────────────

test('allowDecimal 기본값(false)이면 소수점 키가 렌더되지 않는다', () => {
  render(<NumberPad value="" onChange={vi.fn()} />)
  expect(screen.queryByRole('button', { name: '.' })).toBeNull()
})

test('allowDecimal=true면 소수점 키가 렌더된다', () => {
  render(<NumberPad value="" onChange={vi.fn()} allowDecimal />)
  expect(screen.getByRole('button', { name: '.' })).toBeInTheDocument()
})

test('빈 버퍼에서 .을 누르면 "0."으로 시작한다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="" onChange={onChange} allowDecimal />)
  await user.click(screen.getByRole('button', { name: '.' }))
  expect(onChange).toHaveBeenCalledWith('0.')
})

test('정수 버퍼에서 .을 누르면 그대로 이어붙는다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="3" onChange={onChange} allowDecimal />)
  await user.click(screen.getByRole('button', { name: '.' }))
  expect(onChange).toHaveBeenCalledWith('3.')
})

test('이미 .을 포함한 버퍼에서 .을 누르면 변화가 없다(소수점 단일성)', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="3.5" onChange={onChange} allowDecimal />)
  await user.click(screen.getByRole('button', { name: '.' }))
  expect(onChange).not.toHaveBeenCalled()
})

// ── maxLength ───────────────────────────────────────────────

test('maxLength를 초과하는 숫자 입력은 무시된다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="12" onChange={onChange} maxLength={2} />)
  await user.click(screen.getByRole('button', { name: '3' }))
  expect(onChange).not.toHaveBeenCalled()
})

test('maxLength: 빈 버퍼에서의 "." 2글자 점프("0.")도 초과분이면 무시된다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="" onChange={onChange} allowDecimal maxLength={1} />)
  await user.click(screen.getByRole('button', { name: '.' }))
  expect(onChange).not.toHaveBeenCalled()
})

// ── max ─────────────────────────────────────────────────────

test('max: 정확히 max가 되는 입력은 허용된다(경계값)', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="4" onChange={onChange} max={42} />)
  await user.click(screen.getByRole('button', { name: '2' }))
  expect(onChange).toHaveBeenCalledWith('42')
})

test('max: Number(candidate) > max가 되는 입력은 무시된다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="4" onChange={onChange} max={41} />)
  await user.click(screen.getByRole('button', { name: '2' }))
  expect(onChange).not.toHaveBeenCalled()
})

test('max: 소수 후보(예: "9." + 5 = "9.5")에도 판정이 적용된다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="9." onChange={onChange} allowDecimal max={9} />)
  await user.click(screen.getByRole('button', { name: '5' }))
  expect(onChange).not.toHaveBeenCalled()
})

// ── onConfirm ───────────────────────────────────────────────

test('onConfirm 미지정이면 확인 키가 렌더되지 않는다', () => {
  render(<NumberPad value="" onChange={vi.fn()} />)
  expect(screen.queryByRole('button', { name: '확인' })).toBeNull()
})

test('onConfirm 지정 시 클릭하면 현재 버퍼로 호출되고 버퍼는 바뀌지 않는다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const onConfirm = vi.fn()
  render(<NumberPad value="59" onChange={onChange} onConfirm={onConfirm} />)
  await user.click(screen.getByRole('button', { name: '확인' }))
  expect(onConfirm).toHaveBeenCalledWith('59')
  expect(onChange).not.toHaveBeenCalled()
})

test('버퍼가 비어 있어도 확인 키를 누르면 onConfirm이 호출된다', async () => {
  const user = userEvent.setup()
  const onConfirm = vi.fn()
  render(<NumberPad value="" onChange={vi.fn()} onConfirm={onConfirm} />)
  await user.click(screen.getByRole('button', { name: '확인' }))
  expect(onConfirm).toHaveBeenCalledWith('')
})

// ── disabled ────────────────────────────────────────────────

test('disabled면 모든 키가 비활성화되고 클릭해도 onChange/onConfirm이 호출되지 않는다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const onConfirm = vi.fn()
  render(
    <NumberPad
      value="1"
      onChange={onChange}
      onConfirm={onConfirm}
      allowDecimal
      disabled
    />
  )
  expect(screen.getByRole('button', { name: '5' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'C — 전체 지우기' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '한 글자 지우기' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '.' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '확인' })).toBeDisabled()

  await user.click(screen.getByRole('button', { name: '5' }))
  await user.click(screen.getByRole('button', { name: 'C — 전체 지우기' }))
  await user.click(screen.getByRole('button', { name: '한 글자 지우기' }))
  await user.click(screen.getByRole('button', { name: '.' }))
  await user.click(screen.getByRole('button', { name: '확인' }))

  expect(onChange).not.toHaveBeenCalled()
  expect(onConfirm).not.toHaveBeenCalled()
})

// ── 접근성 ──────────────────────────────────────────────────

test('접근성: 루트는 role=group이고 기본 접근 이름은 "숫자 입력 패드"', () => {
  render(<NumberPad value="" onChange={vi.fn()} />)
  expect(screen.getByRole('group', { name: '숫자 입력 패드' })).toBeInTheDocument()
})

test('접근성: 소비자가 aria-label을 지정하면 그 값이 이긴다', () => {
  render(<NumberPad value="" onChange={vi.fn()} aria-label="계산기 패드" />)
  expect(screen.getByRole('group', { name: '계산기 패드' })).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: '숫자 입력 패드' })).toBeNull()
})

test('접근성: C 키는 접근 이름에 라벨이 포함되고 설명은 비어 있다(label-in-name)', () => {
  render(<NumberPad value="" onChange={vi.fn()} />)
  const clearKey = screen.getByRole('button', { name: 'C — 전체 지우기' })
  expect(clearKey).toHaveAccessibleName('C — 전체 지우기')
  expect(clearKey).not.toHaveAccessibleDescription()
})

test('접근성: ← 키는 접근 이름만 있고 설명은 비어 있다(title 미사용)', () => {
  render(<NumberPad value="" onChange={vi.fn()} />)
  const backspaceKey = screen.getByRole('button', { name: '한 글자 지우기' })
  expect(backspaceKey).toHaveAccessibleName('한 글자 지우기')
  expect(backspaceKey).not.toHaveAccessibleDescription()
})

test('접근성: 숫자·확인 키는 보이는 텍스트가 곧 접근 이름이다', () => {
  render(<NumberPad value="" onChange={vi.fn()} onConfirm={vi.fn()} />)
  expect(screen.getByRole('button', { name: '5' })).toHaveAccessibleName('5')
  expect(screen.getByRole('button', { name: '확인' })).toHaveAccessibleName('확인')
})

// ── 키보드 ──────────────────────────────────────────────────

test('키보드: 포커스된 숫자 키를 Enter/Space로 활성화할 수 있다', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<NumberPad value="" onChange={onChange} />)

  const one = screen.getByRole('button', { name: '1' })
  one.focus()
  await user.keyboard('{Enter}')
  expect(onChange).toHaveBeenCalledWith('1')

  const two = screen.getByRole('button', { name: '2' })
  two.focus()
  await user.keyboard(' ')
  expect(onChange).toHaveBeenCalledWith('2')
})

// ── SSR ─────────────────────────────────────────────────────

test('SSR: document가 없는 환경에서도 렌더가 throw하지 않는다', () => {
  const originalDocument = globalThis.document
  Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true })
  try {
    expect(() => renderToString(<NumberPad value="" onChange={() => {}} />)).not.toThrow()
  } finally {
    Object.defineProperty(globalThis, 'document', { value: originalDocument, configurable: true })
  }
})
