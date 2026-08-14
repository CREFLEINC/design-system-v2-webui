import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { within, userEvent } from 'storybook/test'
import { Select, type SelectItems } from './Select'
import { Dialog } from '../Dialog/Dialog'
import { Icon } from '../Icon/Icon'

const CITIES: SelectItems = [
  { value: 'seoul', label: '서울' },
  { value: 'busan', label: '부산' },
  { value: 'incheon', label: '인천', disabled: true },
  { value: 'jeju', label: '제주' },
]

const GROUPED: SelectItems = [
  { label: '수도권', options: [
    { value: 'seoul', label: '서울' },
    { value: 'incheon', label: '인천' },
  ] },
  { label: '영남', options: [
    { value: 'busan', label: '부산' },
    { value: 'daegu', label: '대구' },
  ] },
]

const LONG: SelectItems = [
  '서울', '부산', '인천', '대구', '대전', '광주',
  '울산', '수원', '고양', '용인', '창원', '성남', '청주', '전주',
].map((label, i) => ({ value: `c${i}`, label }))

const CODES: SelectItems = [
  { value: '', label: '전체' },
  { value: 'FAILED', label: 'FAILED' },
  { value: 'GOODS_RECEIPT', label: 'GOODS_RECEIPT' },
  { value: 'WAITING_FOR_INBOUND_INSPECTION', label: 'WAITING_FOR_INBOUND_INSPECTION' },
]

const meta = {
  title: 'Components/Select',
  component: Select,
  args: {
    options: CITIES,
    placeholder: '도시 선택',
    size: 'md',
    'aria-label': '도시',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const WithValue: Story = {
  args: { defaultValue: 'busan' },
}

export const Invalid: Story = {
  args: { invalid: true, placeholder: '도시 선택' },
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const Grouped: Story = {
  args: { options: GROUPED },
}

export const LongList: Story = {
  args: { options: LONG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
  },
}

export const OpenState: Story = {
  args: { defaultValue: 'busan' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
  },
}

export const FlipUp: Story = {
  name: '위로 뒤집힘 (화면 하단)',
  render: (args) => (
    <div style={{ paddingTop: '80vh' }}>
      <p style={{ marginBottom: 8, font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' }}>
        화면 하단에서 열면 아래로 펼칠 자리가 없어 listbox가 트리거 위로 뒤집힌다.
      </p>
      <div style={{ width: 240 }}>
        <Select {...args} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
  },
}

export const ListboxContentWidth: Story = {
  name: '긴 선택지 — 목록은 내용 폭 (#62)',
  render: (args) => (
    <div>
      <p style={{ marginBottom: 8, font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' }}>
        93px 좁은 트리거 + 긴 코드값 선택지. 목록은 트리거 폭에 갇히지 않고 내용 폭만큼 넓어진다.
      </p>
      <div style={{ width: 93 }}>
        <Select {...args} options={CODES} defaultValue="" aria-label="상태" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
  },
}

export const FlipLeft: Story = {
  name: '우측 정렬 전환 (화면 우측 끝, #64)',
  render: (args) => (
    // 메타 데코레이터가 모든 스토리를 240px 로 감싼다 — vw 는 부모 폭이 아니라
    // 뷰포트 기준이라 240px 부모 안에서도 실폭이 나온다. 32px = 스토리북 캔버스 좌우 패딩 1rem×2.
    // (vw 탈출 없이는 flex-end 가 240px 상자 안에서만 우측 정렬돼 우측 끝 조건이 재현되지 않는다, #64)
    <div style={{ width: 'calc(100vw - 32px)' }}>
      <p style={{ marginBottom: 8, font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' }}>
        트리거가 화면 우측 끝이면 목록이 오른쪽으로 넘치는 대신 우측 모서리 정렬로 전환된다.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 93 }}>
          <Select {...args} options={CODES} defaultValue="" aria-label="상태" />
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
  },
}

export const InsideDialog: Story = {
  name: 'Dialog 본문 하단 — 목록 클리핑 회귀 (#68)',
  render: (args) => (
    // meta decorator의 240px 폭을 벗어나 native Dialog가 viewport 기준으로 배치되게 한다.
    <div style={{ width: 'calc(100vw - 32px)' }}>
      <Dialog open onClose={() => {}} size="sm" title="도시 선택">
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 180 }}>
          <p style={{ margin: 0, font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' }}>
            본문 마지막 필드에서 펼친 목록은 panel과 body의 클리핑 경계 밖에서도 모두 보여야 합니다.
          </p>
          <div style={{ width: 240, marginTop: 'auto' }}>
            <Select {...args} options={CITIES} aria-label="Dialog 안 도시" />
          </div>
        </div>
      </Dialog>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
  },
}

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | null>('seoul')
    return (
      <div style={{ width: 240 }}>
        <Select {...args} value={value} onChange={setValue} />
        <p style={{ marginTop: 8, font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' }}>
          선택된 값: {value ?? '없음'}
        </p>
      </div>
    )
  },
}

export const Matrix: Story = {
  render: () => {
    const sizes = ['sm', 'md', 'lg', 'xl'] as const
    const cell = { width: 200 }
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {sizes.map((s) => (
          <div key={s} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={cell}>
              <Select options={CITIES} size={s} placeholder="도시 선택" aria-label={`기본 ${s}`} />
            </div>
            <div style={cell}>
              <Select options={CITIES} size={s} defaultValue="busan" aria-label={`선택됨 ${s}`} />
            </div>
            <div style={cell}>
              <Select options={CITIES} size={s} invalid placeholder="도시 선택" aria-label={`invalid ${s}`} />
            </div>
            <div style={cell}>
              <Select options={CITIES} size={s} disabled placeholder="도시 선택" aria-label={`disabled ${s}`} />
            </div>
            <div style={cell}>
              <Select
                options={CITIES}
                size={s}
                placeholder="도시 선택"
                leadingIcon={<Icon name="place" size={20} />}
                aria-label={`leadingIcon ${s}`}
              />
            </div>
          </div>
        ))}
      </div>
    )
  },
}
