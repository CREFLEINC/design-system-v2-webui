import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Radio } from './Radio'
import { RadioGroup } from './RadioGroup'

const meta = {
  title: 'Components/Radio',
  component: Radio,
  args: { value: 'free', children: '무료' }
} satisfies Meta<typeof Radio>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: () => {
    const [value, setValue] = useState('free')
    return (
      <RadioGroup name="plan" aria-label="요금제" value={value} onChange={setValue}>
        <Radio value="free">무료</Radio>
        <Radio value="pro">프로</Radio>
        <Radio value="enterprise">기업</Radio>
      </RadioGroup>
    )
  }
}

export const Vertical: Story = {
  render: () => (
    <RadioGroup name="plan-v" aria-label="요금제" defaultValue="pro" orientation="vertical">
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
      <Radio value="enterprise">기업</Radio>
    </RadioGroup>
  )
}

export const Horizontal: Story = {
  render: () => (
    <RadioGroup name="plan-h" aria-label="요금제" defaultValue="pro" orientation="horizontal">
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
      <Radio value="enterprise">기업</Radio>
    </RadioGroup>
  )
}

export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Radio name="s-unchecked" value="a">미선택</Radio>
      <Radio name="s-checked" value="a" defaultChecked>선택</Radio>
      <Radio name="s-disabled" value="a" disabled>비활성</Radio>
      <Radio name="s-disabled-checked" value="a" defaultChecked disabled>비활성 선택</Radio>
    </div>
  )
}

export const WithGroupDisabled: Story = {
  render: () => (
    <RadioGroup name="plan-d" aria-label="요금제" disabled defaultValue="pro">
      <Radio value="free">무료</Radio>
      <Radio value="pro">프로</Radio>
      <Radio value="enterprise">기업</Radio>
    </RadioGroup>
  )
}

export const Matrix: Story = {
  render: () => {
    const cell: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
    return (
      <div style={{ display: 'grid', gap: 32 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={cell}>
            <Radio name="m-unchecked" value="a">미선택</Radio>
            <Radio name="m-checked" value="a" defaultChecked>선택됨</Radio>
            <Radio name="m-disabled" value="a" disabled>비활성 미선택</Radio>
            <Radio name="m-disabled-checked" value="a" defaultChecked disabled>비활성 선택됨</Radio>
          </div>
          <LiveGroups />
        </div>
      </div>
    )
  }
}

function LiveGroups() {
  const [plan, setPlan] = useState('pro')
  const [cycle, setCycle] = useState('yearly')
  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <RadioGroup name="m-plan" aria-label="요금제" value={plan} onChange={setPlan}>
        <Radio value="free">무료</Radio>
        <Radio value="pro">프로</Radio>
        <Radio value="enterprise">기업</Radio>
      </RadioGroup>
      <RadioGroup name="m-cycle" aria-label="결제주기" value={cycle} onChange={setCycle} orientation="horizontal">
        <Radio value="monthly">월간</Radio>
        <Radio value="yearly">연간</Radio>
      </RadioGroup>
    </div>
  )
}
