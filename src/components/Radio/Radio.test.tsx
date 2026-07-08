import { expect, test, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Radio } from './Radio'
import { RadioGroup } from './RadioGroup'
import styles from './Radio.module.css'

// RTL cleanup is automatic via src/test/setup.ts

test('radiogroup role과 aria-label을 노출하고 옵션을 radio로 렌더한다', () => {
  render(
    <RadioGroup name="plan" aria-label="요금제">
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
    </RadioGroup>
  )
  expect(screen.getByRole('radiogroup', { name: '요금제' })).toBeInTheDocument()
  expect(screen.getAllByRole('radio')).toHaveLength(2)
})

test('옵션 클릭 시 onChange가 해당 value로 호출되고 checked가 반영된다', async () => {
  const onChange = vi.fn()
  function Harness() {
    const [value, setValue] = useState('free')
    return (
      <RadioGroup name="plan" aria-label="요금제" value={value}
        onChange={(v) => { setValue(v); onChange(v) }}>
        <Radio value="free">무료</Radio>
        <Radio value="pro">프로</Radio>
      </RadioGroup>
    )
  }
  render(<Harness />)
  await userEvent.click(screen.getByRole('radio', { name: '프로' }))
  expect(onChange).toHaveBeenCalledWith('pro')
  expect(screen.getByRole('radio', { name: '프로' })).toBeChecked()
  expect(screen.getByRole('radio', { name: '무료' })).not.toBeChecked()
})

test('스페이스 키로 포커스된 옵션을 선택한다', async () => {
  const onChange = vi.fn()
  render(
    <RadioGroup name="plan" aria-label="요금제" onChange={onChange}>
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
    </RadioGroup>
  )
  const pro = screen.getByRole('radio', { name: '프로' })
  pro.focus()
  expect(pro).toHaveFocus()
  await userEvent.keyboard(' ')
  expect(onChange).toHaveBeenCalledWith('pro')
  expect(pro).toBeChecked()
})

test('그룹 전체 disabled면 모든 radio가 비활성이고 클릭이 무시된다', async () => {
  const onChange = vi.fn()
  render(
    <RadioGroup name="plan" aria-label="요금제" disabled onChange={onChange}>
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
    </RadioGroup>
  )
  screen.getAllByRole('radio').forEach((r) => expect(r).toBeDisabled())
  await userEvent.click(screen.getByRole('radio', { name: '프로' }))
  expect(onChange).not.toHaveBeenCalled()
})

test('개별 Radio disabled는 해당 항목만 비활성화한다', () => {
  render(
    <RadioGroup name="plan" aria-label="요금제">
      <Radio value="free">무료</Radio>
      <Radio value="pro" disabled>프로</Radio>
    </RadioGroup>
  )
  expect(screen.getByRole('radio', { name: '무료' })).toBeEnabled()
  expect(screen.getByRole('radio', { name: '프로' })).toBeDisabled()
})

test('비제어 defaultValue가 초기 선택을 세팅하고 클릭으로 갱신된다', async () => {
  render(
    <RadioGroup name="plan" aria-label="요금제" defaultValue="free">
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
    </RadioGroup>
  )
  expect(screen.getByRole('radio', { name: '무료' })).toBeChecked()
  await userEvent.click(screen.getByRole('radio', { name: '프로' }))
  expect(screen.getByRole('radio', { name: '프로' })).toBeChecked()
  expect(screen.getByRole('radio', { name: '무료' })).not.toBeChecked()
})

test('그룹 내 모든 radio는 같은 name을 공유한다', () => {
  render(
    <RadioGroup name="plan" aria-label="요금제">
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
    </RadioGroup>
  )
  screen.getAllByRole('radio').forEach((r) => expect(r).toHaveAttribute('name', 'plan'))
})

test('그룹 없이 단독 Radio도 checked/onChange가 동작한다', async () => {
  const onChange = vi.fn()
  render(<Radio name="solo" value="a" checked={false} onChange={onChange}>단독</Radio>)
  const radio = screen.getByRole('radio', { name: '단독' })
  expect(radio).not.toBeChecked()
  await userEvent.click(radio)
  expect(onChange).toHaveBeenCalledOnce()
})

test('orientation=horizontal 클래스가 그룹 루트에 적용된다', () => {
  render(
    <RadioGroup name="plan" aria-label="요금제" orientation="horizontal" data-testid="grp">
      <Radio value="a">A</Radio>
      <Radio value="b">B</Radio>
    </RadioGroup>
  )
  expect(screen.getByTestId('grp').className).toContain(styles.horizontal)
})

test('ref가 네이티브 input에 전달된다', () => {
  let node: HTMLInputElement | null = null
  render(<Radio name="solo" value="a" ref={(n) => { node = n }}>단독</Radio>)
  expect(node).toBeInstanceOf(HTMLInputElement)
  expect((node as HTMLInputElement | null)?.type).toBe('radio')
})
