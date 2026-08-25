import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { NumberPad } from './NumberPad'
import { TextField } from '../TextField/TextField'

const helpText = { marginTop: 8, font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' } as const

// NumberPad는 controlled 전용(value·onChange 필수, defaultValue 없음) — 메타 레벨
// args는 타입을 만족시키는 최소 스텁이다. 실제 동작 데모는 개별 스토리의 useState에서 맡는다.
const meta = {
  title: 'Components/NumberPad',
  component: NumberPad,
  args: {
    value: '',
    onChange: () => {}
  }
} satisfies Meta<typeof NumberPad>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

/**
 * 패드 + TextField(readOnly) 페어링 데모.
 * 값 낭독은 표시부(TextField) 소관 — 패드는 값 표시부를 갖지 않으므로 aria-live 등
 * 낭독 관련 속성을 두지 않는다(#41 설계). 값이 바뀔 때 스크린리더에 알리는 책임은
 * 이 페어링에서 TextField 쪽에 있고, 패드는 순수 입력 장치로만 동작한다.
 */
function ControlledWithTextFieldDemo() {
  const [value, setValue] = useState('')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 200 }}>
        <TextField label="입력값" value={value} readOnly />
      </div>
      <NumberPad value={value} onChange={setValue} />
    </div>
  )
}

export const ControlledWithTextField: Story = {
  render: () => <ControlledWithTextFieldDemo />
}

function WithConfirmAndDecimalDemo() {
  const [value, setValue] = useState('12.5')
  const [confirmed, setConfirmed] = useState<string | null>(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <p style={helpText}>확정된 값: {confirmed ?? '없음'}</p>
      <NumberPad value={value} onChange={setValue} allowDecimal onConfirm={setConfirmed} />
    </div>
  )
}

export const WithConfirmAndDecimal: Story = {
  render: () => <WithConfirmAndDecimalDemo />
}

function MaxConstraintsDemo() {
  const [value, setValue] = useState('')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <p style={helpText}>최대 6자(&apos;.&apos; 포함), 최댓값 999.99 — 현재 값: {value || '없음'}</p>
      <NumberPad value={value} onChange={setValue} allowDecimal maxLength={6} max={999.99} />
    </div>
  )
}

export const MaxConstraints: Story = {
  render: () => <MaxConstraintsDemo />
}

export const Matrix: Story = {
  render: () => {
    const sizes = ['md', 'lg', 'xl'] as const
    return (
      <div style={{ display: 'grid', gap: 24 }}>
        {sizes.map((s) => (
          <div key={s} style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <NumberPad size={s} value="" onChange={() => {}} aria-label={`기본 ${s}`} />
            <NumberPad
              size={s}
              value="12.5"
              onChange={() => {}}
              allowDecimal
              onConfirm={() => {}}
              aria-label={`allowDecimal+onConfirm ${s}`}
            />
            <NumberPad size={s} value="42" onChange={() => {}} disabled aria-label={`disabled ${s}`} />
          </div>
        ))}
      </div>
    )
  }
}
