import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './Checkbox'

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: { children: '이용약관에 동의합니다' }
} satisfies Meta<typeof Checkbox>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <Checkbox>동의</Checkbox>
      <Checkbox defaultChecked>전체 선택</Checkbox>
      <Checkbox indeterminate>부분 선택</Checkbox>
      <Checkbox disabled>사용 안 함</Checkbox>
      <Checkbox disabled defaultChecked>사용 안 함</Checkbox>
    </div>
  )
}

export const LongLabel: Story = {
  render: () => (
    <div style={{ maxWidth: 280 }}>
      <Checkbox>아래 내용을 모두 확인하였으며 개인정보 수집 및 이용에 동의합니다</Checkbox>
    </div>
  )
}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: 16 }}>
      <Checkbox>미선택 · 기본</Checkbox>
      <Checkbox disabled>미선택 · 비활성</Checkbox>

      <Checkbox defaultChecked>선택됨 · 기본</Checkbox>
      <Checkbox defaultChecked disabled>선택됨 · 비활성</Checkbox>

      <Checkbox indeterminate>부분선택 · 기본</Checkbox>
      <Checkbox indeterminate disabled>부분선택 · 비활성</Checkbox>
    </div>
  )
}
