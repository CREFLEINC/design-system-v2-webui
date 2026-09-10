import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../Button/Button'
import { Checkbox } from '../Checkbox/Checkbox'
import { DatePicker } from '../DatePicker/DatePicker'
import { Select } from '../Select/Select'
import { Field, type FieldSize } from './Field'

const CYCLES = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
]

const pageStyle = {
  display: 'grid',
  gap: 32,
  color: 'var(--on-surface)',
} as const

const sectionTitleStyle = {
  margin: 0,
  font: 'var(--type-title-sm)',
  color: 'var(--on-surface)',
} as const

const readOnlyStyle = {
  font: 'var(--type-body-lg)',
  color: 'var(--on-surface)',
} as const

const meta = {
  title: 'Components/Field',
  component: Field,
  args: {
    label: '주기 단위',
    helperText: '반복 주기를 선택하세요',
    size: 'md',
    children: ({ controlId, describedById, invalid }) => (
      <Select
        id={controlId}
        options={CYCLES}
        defaultValue="day"
        aria-describedby={describedById}
        invalid={invalid}
      />
    ),
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    labelAs: { control: 'inline-radio', options: ['label', 'span'] },
    children: { control: false },
  },
} satisfies Meta<typeof Field>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const WithSelect: Story = {
  render: () => (
    <Field label="주기 단위" required helperText="일, 주 또는 월 단위로 선택하세요">
      {({ controlId, describedById, invalid }) => (
        <Select
          id={controlId}
          options={CYCLES}
          placeholder="주기 선택"
          aria-describedby={describedById}
          invalid={invalid}
        />
      )}
    </Field>
  ),
}

export const ReadOnly: Story = {
  render: () => (
    <Field label="담당자" labelAs="span" helperText="조직 정보에서 가져온 값입니다">
      {({ controlId, labelId, describedById }) => (
        <span
          id={controlId}
          aria-labelledby={labelId}
          aria-describedby={describedById}
          style={readOnlyStyle}
        >
          김지구 · 생산관리팀
        </span>
      )}
    </Field>
  ),
}

export const MessagePriority: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <Field label="도움말" helperText="입력 형식을 확인하세요">
        {({ controlId, describedById }) => <input id={controlId} aria-describedby={describedById} />}
      </Field>
      <Field label="잠금 사유" helperText="도움말" disabledReason="권한이 없어 수정할 수 없습니다">
        {({ controlId, describedById }) => <input id={controlId} aria-describedby={describedById} disabled />}
      </Field>
      <Field label="오류" helperText="도움말" disabledReason="잠금 사유" error="필수 항목입니다">
        {({ controlId, describedById, invalid }) => (
          <input id={controlId} aria-describedby={describedById} aria-invalid={invalid} />
        )}
      </Field>
    </div>
  ),
}

export const Matrix: Story = {
  render: () => {
    // 2xl 은 이 루프에서 제외한다 — DatePicker·TextArea 에는 아직 2xl 등급이 없어(#93 범위)
    // size 를 그대로 흘려보낼 수 없다. 2xl 은 아래 전용 행에서 Select·Button 으로 보인다.
    const sizes = ['sm', 'md', 'lg', 'xl'] as const satisfies readonly FieldSize[]

    return (
      <div style={pageStyle}>
        <section style={{ display: 'grid', gap: 16 }}>
          <h2 style={sectionTitleStyle}>Flex 행 · 크기와 라벨 예약</h2>
          {sizes.map((size) => (
            <div key={size} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <Field
                label={`${size} 주기 단위`}
                size={size}
                required={size === 'md'}
                helperText={size === 'sm' ? '짧은 컨트롤도 슬롯 중앙에 놓입니다' : undefined}
              >
                {({ controlId, describedById, invalid }) => (
                  <Select
                    id={controlId}
                    options={CYCLES}
                    size={size}
                    defaultValue="day"
                    aria-describedby={describedById}
                    invalid={invalid}
                  />
                )}
              </Field>

              <Field label={`${size} 시작일`} size={size} error={size === 'lg' ? '오늘 이후 날짜를 선택하세요' : undefined}>
                {({ controlId, describedById, invalid }) => (
                  <DatePicker
                    id={controlId}
                    size={size}
                    defaultValue="2026-09-01"
                    aria-describedby={describedById}
                    invalid={invalid}
                  />
                )}
              </Field>

              <Field reserveLabel size={size}>
                <Button size={size}>적용</Button>
              </Field>

              <Field reserveLabel size={size}>
                <Checkbox>자동 반복</Checkbox>
              </Field>
            </div>
          ))}

          {/* 2xl — 장갑 조작 단말(#93). DatePicker·TextArea는 아직 2xl 등급이 없어
              이 행에서는 2xl을 가진 Select·Button만 세운다. */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <Field label="2xl 주기 단위" size="2xl" helperText="장갑을 낀 손으로 조작하는 단말용 높이입니다">
              {({ controlId, describedById, invalid }) => (
                <Select
                  id={controlId}
                  options={CYCLES}
                  size="2xl"
                  defaultValue="day"
                  aria-describedby={describedById}
                  invalid={invalid}
                />
              )}
            </Field>

            <Field reserveLabel size="2xl">
              <Button size="2xl">적용하기</Button>
            </Field>

            {/* 슬롯 하한이 실제로 하는 일 — 컨트롤(체크박스 ~24px)이 등급보다 짧아도
                슬롯이 72px을 지켜 옆 컨트롤과 같은 행 높이에 중앙 정렬된다. */}
            <Field label="2xl 짧은 컨트롤" size="2xl" helperText="컨트롤이 짧아도 슬롯이 72px을 지킵니다">
              <Checkbox>자동 반복</Checkbox>
            </Field>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 16 }}>
          <h2 style={sectionTitleStyle}>Grid 행 · stretch 회귀와 메시지 우선순위</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
            <Field label="생산 계획" helperText="메시지가 있어 이 grid 행의 높이를 늘립니다" fullWidth>
              {({ controlId, describedById }) => (
                <Select
                  id={controlId}
                  options={CYCLES}
                  defaultValue="week"
                  aria-describedby={describedById}
                />
              )}
            </Field>

            <Field label="완료 예정일" fullWidth>
              {({ controlId }) => <DatePicker id={controlId} defaultValue="2026-09-30" />}
            </Field>

            <Field reserveLabel fullWidth>
              <Button variant="outlined">일정 계산</Button>
            </Field>

            <Field label="담당자" labelAs="span" disabledReason="조직 정보에서 자동으로 지정됩니다" fullWidth>
              {({ controlId, labelId, describedById }) => (
                <span
                  id={controlId}
                  aria-labelledby={labelId}
                  aria-describedby={describedById}
                  style={readOnlyStyle}
                >
                  김지구
                </span>
              )}
            </Field>
          </div>
        </section>
      </div>
    )
  },
}
