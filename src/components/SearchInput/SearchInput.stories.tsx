// 트레일링 필터 드롭다운(예: 카테고리 셀렉트)은 out-of-scope — 필요 시 별도 컴포지션 패턴으로 다룬다.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SearchInput } from './SearchInput'

const meta = {
  title: 'Components/SearchInput',
  component: SearchInput,
  args: { placeholder: '제품, 로트, 설비 검색', size: 'md' }
} satisfies Meta<typeof SearchInput>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { 'aria-label': '검색' }
}

export const WithValue: Story = {
  args: { 'aria-label': '검색', defaultValue: '스마트폰 조립' }
}

export const Loading: Story = {
  args: { 'aria-label': '검색', loading: true, defaultValue: '검색 중…' }
}

export const ErrorState: Story = {
  args: { 'aria-label': '검색', error: '검색어를 입력하세요' }
}

export const Disabled: Story = {
  args: { 'aria-label': '검색', disabled: true, defaultValue: '수정 불가' }
}

export const Controlled: Story = {
  render: (args) => {
    function Demo() {
      const [value, setValue] = useState('')
      return (
        <SearchInput
          {...args}
          aria-label="검색"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onSearch={() => {}}
        />
      )
    }
    return <Demo />
  }
}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <div key={s} style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <SearchInput aria-label="검색" size={s} placeholder="제품, 로트, 설비 검색" />
          <SearchInput aria-label="검색" size={s} placeholder="제품, 로트, 설비 검색" defaultValue="스마트폰 조립" />
          <SearchInput aria-label="검색" size={s} placeholder="제품, 로트, 설비 검색" loading defaultValue="검색 중…" />
          <SearchInput aria-label="검색" size={s} placeholder="제품, 로트, 설비 검색" error="검색어를 입력하세요" />
          <SearchInput aria-label="검색" size={s} placeholder="제품, 로트, 설비 검색" disabled defaultValue="수정 불가" />
        </div>
      ))}
      <div style={{ width: 320 }}>
        <SearchInput aria-label="검색" placeholder="제품, 로트, 설비 검색" fullWidth defaultValue="스마트폰 조립" />
      </div>
    </div>
  )
}
