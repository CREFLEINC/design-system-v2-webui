import { createRef, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Select } from '../Select/Select'
import { Field, type FieldIds } from './Field'
import styles from './Field.module.css'

const OPTIONS = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
]

test('기본 label의 htmlFor와 렌더 프롭 controlId가 연결된다', () => {
  render(
    <Field label="주기 단위">
      {({ controlId }) => <input id={controlId} />}
    </Field>
  )

  const input = screen.getByLabelText('주기 단위')
  const label = screen.getByText('주기 단위')
  expect(label).toHaveAttribute('for', input.id)
  expect(label).toHaveAttribute('id')
})

test('required 별표는 label 밖의 형제이며 접근 이름에서 제외된다', () => {
  render(
    <Field label="주기 단위" required>
      {({ controlId }) => <input id={controlId} required />}
    </Field>
  )

  const input = screen.getByLabelText('주기 단위')
  const label = screen.getByText('주기 단위')
  const mark = screen.getByText('*')
  expect(input).toHaveAccessibleName('주기 단위')
  expect(mark).toHaveAttribute('aria-hidden', 'true')
  expect(label).not.toContainElement(mark)
  expect(label.parentElement).toContainElement(mark)
})

test('명시한 root id를 seed로 렌더 프롭 ID를 만들고 rerender에도 안정적으로 유지한다', () => {
  let current: FieldIds | undefined
  const child = (ids: FieldIds): ReactNode => {
    current = ids
    return <input id={ids.controlId} />
  }
  const { rerender } = render(<Field id="cycle" label="주기">{child}</Field>)

  expect(current).toEqual({
    controlId: 'cycle-control',
    labelId: 'cycle-label',
    describedById: undefined,
    invalid: false,
  })
  rerender(<Field id="cycle" label="변경된 주기">{child}</Field>)
  expect(current?.controlId).toBe('cycle-control')
  expect(current?.labelId).toBe('cycle-label')
})

test('일반 ReactNode 자식을 변경 없이 렌더한다', () => {
  render(<Field><button type="button">직접 자식</button></Field>)
  expect(screen.getByRole('button', { name: '직접 자식' })).toBeInTheDocument()
})

test('labelAs span의 labelId를 읽기 전용 값 aria-labelledby에 연결할 수 있다', () => {
  render(
    <Field label="담당자" labelAs="span">
      {({ controlId, labelId }) => (
        <span id={controlId} aria-labelledby={labelId}>김지구</span>
      )}
    </Field>
  )

  const value = screen.getByText('김지구')
  const label = screen.getByText('담당자')
  expect(label.tagName).toBe('SPAN')
  expect(value).toHaveAttribute('aria-labelledby', label.id)
  expect(value).toHaveAccessibleName('담당자')
})

test('메시지는 error > disabledReason > helperText 순으로 하나만 렌더한다', () => {
  let ids: FieldIds | undefined
  const child = (nextIds: FieldIds) => {
    ids = nextIds
    return <input id={nextIds.controlId} aria-describedby={nextIds.describedById} />
  }
  const { rerender } = render(
    <Field helperText="도움말" disabledReason="잠금 사유" error="오류">{child}</Field>
  )

  expect(screen.getByText('오류')).toBeInTheDocument()
  expect(screen.queryByText('잠금 사유')).not.toBeInTheDocument()
  expect(screen.queryByText('도움말')).not.toBeInTheDocument()
  expect(document.getElementById(ids!.describedById!)).toHaveTextContent('오류')
  expect(ids?.invalid).toBe(true)

  rerender(<Field helperText="도움말" disabledReason="잠금 사유">{child}</Field>)
  expect(screen.getByText('잠금 사유')).toBeInTheDocument()
  expect(screen.queryByText('도움말')).not.toBeInTheDocument()
  expect(document.getElementById(ids!.describedById!)).toHaveTextContent('잠금 사유')
  expect(ids?.invalid).toBe(false)

  rerender(<Field helperText="도움말">{child}</Field>)
  expect(screen.getByText('도움말')).toBeInTheDocument()
  expect(document.getElementById(ids!.describedById!)).toHaveTextContent('도움말')
})

test('메시지가 없으면 describedById는 undefined이고 invalid는 false다', () => {
  const observe = vi.fn<(ids: FieldIds) => ReactNode>(() => <input />)
  render(<Field>{observe}</Field>)
  expect(observe).toHaveBeenCalledWith(expect.objectContaining({ describedById: undefined, invalid: false }))
})

test('reserveLabel은 label이 없을 때만 aria-hidden spacer를 렌더한다', () => {
  const { container, rerender } = render(<Field reserveLabel><button type="button">저장</button></Field>)
  const spacer = container.querySelector(`.${styles.spacer}`)
  expect(spacer).toHaveAttribute('aria-hidden', 'true')
  expect(spacer?.textContent).toBe('\u00a0')

  rerender(<Field label="작업" reserveLabel><button type="button">저장</button></Field>)
  expect(container.querySelector(`.${styles.spacer}`)).not.toBeInTheDocument()
})

test.each(['sm', 'md', 'lg', 'xl'] as const)('size=%s 클래스를 control 슬롯에 적용한다', (size) => {
  const { container } = render(<Field size={size}><span>값</span></Field>)
  expect(container.querySelector(`.${styles.control}`)).toHaveClass(styles[size])
})

test('size 기본값은 md이고 fullWidth 클래스를 루트에 적용한다', () => {
  const { container } = render(<Field fullWidth><span>값</span></Field>)
  expect(container.firstElementChild).toHaveClass(styles.fullWidth)
  expect(container.querySelector(`.${styles.control}`)).toHaveClass(styles.md)
})

test('className, native 속성, 이벤트와 ref를 루트 div에 전달한다', () => {
  const ref = createRef<HTMLDivElement>()
  const onClick = vi.fn()
  render(
    <Field ref={ref} className="custom" data-testid="field" data-kind="cycle" onClick={onClick}>
      <span>값</span>
    </Field>
  )

  const root = screen.getByTestId('field')
  root.click()
  expect(ref.current).toBe(root)
  expect(root).toHaveClass('custom')
  expect(root).toHaveAttribute('data-kind', 'cycle')
  expect(onClick).toHaveBeenCalledOnce()
})

test('서로 다른 Field는 고유한 자동 ID를 생성한다', () => {
  render(
    <>
      <Field label="첫 번째">{({ controlId }) => <input id={controlId} />}</Field>
      <Field label="두 번째">{({ controlId }) => <input id={controlId} />}</Field>
    </>
  )
  expect(screen.getByLabelText('첫 번째').id).not.toBe(screen.getByLabelText('두 번째').id)
})

test('Select에 label, describedById, invalid를 실제로 연결한다', () => {
  render(
    <Field label="주기 단위" error="주기 단위를 선택하세요">
      {({ controlId, describedById, invalid }) => (
        <Select
          id={controlId}
          options={OPTIONS}
          placeholder="선택"
          aria-describedby={describedById}
          invalid={invalid}
        />
      )}
    </Field>
  )

  const select = screen.getByRole('combobox', { name: '주기 단위' })
  expect(select).toHaveAttribute('aria-invalid', 'true')
  expect(select).toHaveAccessibleDescription('주기 단위를 선택하세요')
})

test('label이 없으면 required만으로 별표를 만들지 않는다', () => {
  render(<Field required><input aria-label="이름" required /></Field>)
  expect(screen.queryByText('*')).not.toBeInTheDocument()
})
