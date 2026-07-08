import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'
import styles from './Select.module.css'

const OPTS = [
  { value: 'seoul', label: '서울' },
  { value: 'busan', label: '부산' },
  { value: 'incheon', label: '인천', disabled: true },
  { value: 'jeju', label: '제주' },
]

test('placeholder 표시 후 클릭하면 listbox와 옵션이 열린다', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} placeholder="도시 선택" aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  expect(trigger).toHaveTextContent('도시 선택')
  expect(screen.queryByRole('listbox')).toBeNull()
  await user.click(trigger)
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  expect(screen.getAllByRole('option')).toHaveLength(4)
})

test('옵션 선택 시 onChange 호출 + 트리거 갱신 + 닫힘 (uncontrolled)', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<Select options={OPTS} placeholder="도시 선택" onChange={onChange} aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  await user.click(trigger)
  await user.click(screen.getByRole('option', { name: '부산' }))
  expect(onChange).toHaveBeenCalledWith('busan')
  expect(trigger).toHaveTextContent('부산')
  expect(screen.queryByRole('listbox')).toBeNull()
})

test('controlled: value prop이 표시를 결정하고 선택은 onChange만 호출', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<Select options={OPTS} value="seoul" onChange={onChange} aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  expect(trigger).toHaveTextContent('서울')
  await user.click(trigger)
  await user.click(screen.getByRole('option', { name: '부산' }))
  expect(onChange).toHaveBeenCalledWith('busan')
  // prop이 안 바뀌면 표시는 그대로
  expect(trigger).toHaveTextContent('서울')
})

test('키보드: ArrowDown으로 열고 이동해 Enter로 선택, disabled는 건너뜀', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<Select options={OPTS} onChange={onChange} aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  trigger.focus()
  await user.keyboard('{ArrowDown}') // open, active=서울(첫 enabled)
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  await user.keyboard('{ArrowDown}') // 부산
  await user.keyboard('{ArrowDown}') // 인천(disabled) 건너뛰고 제주
  const jeju = screen.getByRole('option', { name: '제주' })
  expect(trigger).toHaveAttribute('aria-activedescendant', jeju.id)
  await user.keyboard('{Enter}')
  expect(onChange).toHaveBeenCalledWith('jeju')
  expect(screen.queryByRole('listbox')).toBeNull()
})

test('Escape로 닫히고 포커스가 트리거로 복귀', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  await user.click(trigger)
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(trigger).toHaveFocus()
})

test('바깥 클릭 시 닫힌다', async () => {
  const user = userEvent.setup()
  render(
    <div>
      <Select options={OPTS} aria-label="도시" />
      <button>바깥</button>
    </div>
  )
  await user.click(screen.getByRole('combobox'))
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '바깥' }))
  expect(screen.queryByRole('listbox')).toBeNull()
})

test('트리거 ARIA: combobox/haspopup/expanded/controls 연결', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await user.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const listbox = screen.getByRole('listbox')
  expect(trigger).toHaveAttribute('aria-controls', listbox.id)
})

test('선택된 옵션에 aria-selected=true, 나머지는 false', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} defaultValue="busan" aria-label="도시" />)
  await user.click(screen.getByRole('combobox'))
  expect(screen.getByRole('option', { name: '부산' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('option', { name: '서울' })).toHaveAttribute('aria-selected', 'false')
})

test('invalid면 aria-invalid=true + invalid 클래스', () => {
  render(<Select options={OPTS} invalid aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  expect(trigger).toHaveAttribute('aria-invalid', 'true')
  expect(trigger.className).toContain(styles.invalid)
})

test('타입어헤드: 열린 상태에서 문자 입력이 활성 옵션을 이동', async () => {
  const user = userEvent.setup()
  const CITY = [
    { value: 'a', label: 'Anyang' },
    { value: 'b', label: 'Busan' },
    { value: 'c', label: 'Cheonan' },
  ]
  render(<Select options={CITY} aria-label="city" />)
  const trigger = screen.getByRole('combobox')
  await user.click(trigger)
  await user.keyboard('c')
  const cheonan = screen.getByRole('option', { name: 'Cheonan' })
  expect(trigger).toHaveAttribute('aria-activedescendant', cheonan.id)
})

test('name 지정 시 hidden input이 value를 반영 (폼 제출)', () => {
  const { container } = render(
    <Select options={OPTS} name="city" defaultValue="jeju" aria-label="도시" />
  )
  const hidden = container.querySelector('input[type="hidden"][name="city"]') as HTMLInputElement
  expect(hidden).not.toBeNull()
  expect(hidden.value).toBe('jeju')
})

test('disabled Select는 클릭해도 열리지 않는다', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} disabled aria-label="도시" />)
  await user.click(screen.getByRole('combobox'))
  expect(screen.queryByRole('listbox')).toBeNull()
})
