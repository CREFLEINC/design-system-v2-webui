# Phase 2 Component Spec — Select

- Directory: `src/components/Select/`

## Exports (append to src/index.ts)
```ts
export { Select } from './components/Select/Select'
export type { SelectProps, SelectOption, SelectOptionGroup, SelectItems, SelectSize } from './components/Select/Select'
```

## Props interface
```tsx
import { forwardRef, useId, useRef, useState, useEffect, useMemo, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type SelectSize = 'sm' | 'md' | 'lg'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectOptionGroup {
  /** 그룹 헤더 라벨 (presentational, role=group의 aria-label 소스) */
  label: string
  options: SelectOption[]
}

/** 평면 옵션 또는 그룹을 섞어서 전달 가능 */
export type SelectItems = Array<SelectOption | SelectOptionGroup>

export interface SelectProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value' | 'defaultValue'> {
  options: SelectItems
  /** controlled 선택값. undefined면 uncontrolled */
  value?: string | null
  /** uncontrolled 초기값 */
  defaultValue?: string | null
  /** 옵션 선택 시 호출. controlled에서는 이걸로 상위 상태를 갱신해야 표시가 바뀐다 */
  onChange?: (value: string) => void
  /** 선택값 없을 때 트리거에 표시 (색: --on-surface-muted) */
  placeholder?: string
  size?: SelectSize
  disabled?: boolean
  /** 에러 상태 — aria-invalid + --semantic-error 보더 */
  invalid?: boolean
  /** 지정 시 폼 제출용 hidden input 렌더 */
  name?: string
  /** 트리거 id — 외부 <label htmlFor>와 연결. 미지정 시 useId 자동 생성 */
  id?: string
  /** 트리거 좌측 장식 아이콘 */
  leadingIcon?: ReactNode
  /** id 라벨이 없을 때의 접근성 이름 */
  'aria-label'?: string
  'aria-labelledby'?: string
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(props, ref) { /* … */ })
```

## Variants & API
APG "Select-Only Combobox" 패턴을 채택 (native <select> 아님, 완전 스타일링 + 키보드 제어 목적).

STRUCTURE (3중첩):
- root: <div className={cx(styles.root, className)}> — position:relative 앵커 컨테이너. className은 여기로 (소비자가 폭 제어). 내부 useRef(rootRef)로 바깥 클릭 감지.
- trigger: <button role="combobox"> — forwardRef 타깃(HTMLButtonElement), ...rest 스프레드 대상. Button과 동일하게 상호작용 루트에 ref를 다는 게 자연스럽다(포커스 이동 니즈). type="button"로 폼 우발 제출 방지.
- listbox: open일 때만 조건부 렌더하는 <div role="listbox">. root 기준 CSS absolute 앵커(top: calc(100% + --space-1)). 포지셔닝 라이브러리 없음.
- hidden input: name 지정 시 <input type="hidden" name value={selected ?? ''} /> 폼 제출용.

INTERFACE 확장: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'|'value'|'defaultValue'> — 우리만의 onChange(value:string)/value/defaultValue 시그니처와 충돌 방지. Button이 ButtonHTMLAttributes를 확장하고 rest를 button에 스프레드하는 패턴을 그대로 따른다.

VARIANTS: variant 없음(폼 컨트롤은 단일 형태). size = 'sm'|'md'|'lg' → --control-height-* 매핑(Button과 동일 스케일). 상태 축: default / open / invalid / disabled.

CONTROLLED + UNCONTROLLED (Button엔 없지만 폼 컨트롤 표준):
- const isControlled = value !== undefined
- const [inner, setInner] = useState<string | null>(defaultValue ?? null)
- const selected = isControlled ? (value ?? null) : inner
- 선택 시: !isControlled면 setInner(v); 항상 onChange?.(v); close(); 트리거로 포커스 복귀.

FLATTENING: options(평면/그룹 혼합)를 useMemo로 flatOptions: {opt, id, groupIndex}[] 로 펼친다. id = `${baseId}-opt-${flatIndex}` (baseId = id ?? useId()). listbox id = `${baseId}-listbox`. aria-activedescendant는 활성 옵션 id를 참조.

STATE: open(boolean), activeIndex(number, flatOptions 인덱스; -1 없음). DOM 포커스는 항상 트리거에 유지하고 활성 옵션은 aria-activedescendant + .optionActive 클래스로만 표현(포커스를 listbox로 옮기지 않음 → 단순 + 스크린리더 정확).

KEYBOARD (트리거에서 처리; 활성=선택된 옵션 없으면 첫 enabled):
- 닫힘: ArrowDown/ArrowUp/Enter/Space/Home/End → open. 인쇄가능 문자 → type-ahead로 즉시 선택.
- 열림: ArrowDown/Up → 다음/이전 enabled 옵션으로 activeIndex 이동(disabled 건너뜀, 끝에서 멈춤). Home/End → 첫/마지막 enabled. Enter/Space → 활성 옵션 선택+닫기. Escape → 닫기(선택 유지)+트리거 포커스. Tab → 닫고 포커스 자연 이동. 문자 → type-ahead로 activeIndex 이동.

TYPE-AHEAD: useRef 버퍼 + 타임스탬프. keydown의 event.key가 길이1 인쇄문자면 버퍼에 누적(마지막 입력 후 500ms 경과 시 리셋). label이 버퍼로 startsWith(대소문자 무시) 하는 첫 enabled 옵션을 찾아 열림이면 active 이동, 닫힘이면 즉시 선택. 외부 의존성 없이 로컬 구현.

OUTSIDE CLICK: useEffect에서 open일 때만 document에 pointerdown 리스너 등록, rootRef.current가 target을 contains하지 않으면 close(). cleanup으로 제거.

ICONS: leadingIcon 그대로. 후행 셰브론 <Icon name="expand_more" size={20} /> (장식, aria-hidden) — .open일 때 180deg 회전. 선택 옵션 좌측 <Icon name="check" size={20} /> (장식); 미선택 옵션도 자리 유지(visibility:hidden)해 라벨 정렬 흔들림 방지.

GROUPS: 그룹은 <div role="group" aria-label={group.label}> 로 감싸고 그 안에 .groupLabel 헤더 + 옵션들. aria-label로 그룹명 노출.

## Accessibility
Roles/ARIA (APG Select-Only Combobox):
- 트리거 <button role="combobox">: aria-haspopup="listbox", aria-expanded={open}, aria-controls={listboxId}(열림 시), aria-activedescendant={활성 옵션 id}(열림 시), aria-invalid={invalid || undefined}, disabled={disabled}. 접근성 이름은 id와 연결된 외부 <label htmlFor>, 아니면 aria-labelledby, 아니면 aria-label로 확보(셋 다 없으면 개발 편의상 콘솔 경고는 생략하되 스토리/문서에서 필수 명시).
- listbox <div role="listbox" id={listboxId}> : 트리거와 동일한 접근성 이름(aria-label/labelledby를 미러). 단일 선택이므로 aria-multiselectable 없음.
- 옵션 <div role="option" id aria-selected={value===selected} aria-disabled={disabled || undefined}> — 선택 상태는 aria-selected로만 표현(체크 아이콘은 장식).
- 그룹 <div role="group" aria-label={group.label}>, 내부 .groupLabel은 aria-hidden(role=group의 aria-label이 이름을 이미 제공).

Keyboard contract: Down/Up=이동(disabled 스킵), Home/End=처음/끝 enabled, Enter/Space=선택+닫기, Escape=닫기+트리거 복귀, Tab=닫고 이동, 인쇄문자=type-ahead. 트리거는 tabindex 기본(버튼) — 단일 탭스톱. 활성 옵션 변경 시 필요하면 scrollIntoView(block:'nearest')로 가시 영역 유지.

Focus management: DOM 포커스는 트리거에 상주(aria-activedescendant 패턴). 닫을 때(Escape/선택/바깥클릭 후 키보드) 트리거 포커스 유지·복귀. 포커스 표시는 :focus-visible에서 box-shadow: var(--focus-ring).

Contrast (WCAG AA): 트리거 보더 var(--outline)(Task 0, ≥3:1). 본문 텍스트 var(--on-surface), placeholder var(--on-surface-muted)(라이트 4.5:1↑ 확인 필요-무난), 선택 라벨 강조는 var(--primary-text)(다크 AA 안전, --primary 사용 금지). 에러 보더 var(--semantic-error). listbox 표면 var(--surface-container-high) 위 텍스트 var(--on-surface).

disabled 트리거는 클릭/키보드 무반응. disabled 옵션은 pointer-events:none + 키보드 스킵.

## CSS notes
TOKENS ONLY. px는 0/1/2(보더·링)만.

.root { position: relative; display: inline-block; } — 소비자가 className으로 폭 지정. (기본 폭 없음; 스토리에서 width 부여.)

.trigger: position:relative; isolation:isolate; display:inline-flex; align-items:center; gap:var(--space-2); width:100%; border:0; border-radius:var(--radius-sm); background:var(--surface); color:var(--on-surface); font:var(--type-body-lg); letter-spacing:var(--type-body-lg-tracking); cursor:pointer; outline:none; box-shadow: inset 0 0 0 1px var(--outline); transition: box-shadow var(--motion-fast) var(--ease-standard); text-align:left.
- 상태 레이어: .trigger::before { content:''; position:absolute; inset:0; border-radius:inherit; background:transparent; transition:background var(--motion-fast) var(--ease-standard); pointer-events:none } — Button과 동일 M3 규칙. hover=:hover::before{background:var(--state-hover-neutral)}; :active::before{background:var(--state-press-neutral)} (뉴트럴 사용: 폼 컨트롤 표면은 레드 상태레이어 아님).
- :focus-visible { box-shadow: inset 0 0 0 1px var(--outline), var(--focus-ring) } (Button.outlined의 링 합성 패턴 그대로).
- .open { box-shadow: inset 0 0 0 2px var(--primary) } (열림 강조); .open:focus-visible는 inset 2px primary + focus-ring 합성.
- .invalid { box-shadow: inset 0 0 0 1px var(--semantic-error) }; .invalid:focus-visible는 error 보더 + focus-ring.
- :disabled { cursor:default; color:var(--state-disabled-text); box-shadow: inset 0 0 0 1px var(--state-disabled-fill) }; :disabled::before{background:transparent}.

Sizes(Button 스케일 재사용): .sm{height:var(--control-height-sm); padding:0 var(--space-3); font:var(--type-label-lg)} .md{height:var(--control-height-md); padding:0 var(--space-4)} .lg{height:var(--control-height-lg); padding:0 var(--space-4)}.

.value { flex:1 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap } (긴 라벨 말줄임). .placeholder { color:var(--on-surface-muted) }. .chevron { flex:none; margin-left:var(--space-1); display:inline-flex; transition: transform var(--motion-base) var(--ease-standard) }. .open .chevron { transform: rotate(180deg) }.

.listbox: position:absolute; top:calc(100% + var(--space-1)); left:0; right:0; z-index:20; margin:0; padding:var(--space-1) 0; list-style:none; background:var(--surface-container-high); border-radius:var(--radius-md); box-shadow:var(--elevation-3); max-height:calc(var(--control-height-lg) * 6); overflow-y:auto. (max-height는 토큰*무단위 배수 — raw px 없음.)

.option: position:relative; isolation:isolate; display:flex; align-items:center; gap:var(--space-2); min-height:var(--control-height-md); padding:0 var(--space-3); color:var(--on-surface); font:var(--type-body-lg); cursor:pointer. ::before 상태레이어(트리거와 동일). .option:hover::before{background:var(--state-hover-neutral)}. .optionActive::before { background:var(--state-hover-neutral) } (키보드 활성 하이라이트 = 마우스 hover와 동일 명도). .option[aria-selected='true'] { color:var(--primary-text) } + .check 가시. .optionDisabled { color:var(--state-disabled-text); cursor:default; pointer-events:none }.
.check { flex:none; visibility:hidden }; [aria-selected='true'] .check { visibility:visible } (자리 유지).
.groupLabel { padding:var(--space-2) var(--space-3) var(--space-1); font:var(--type-label-sm); letter-spacing:var(--type-label-sm-tracking); color:var(--on-surface-muted) }.

Motion + reduced-motion: 셰브론 회전과 상태레이어 트랜지션은 --motion-*/--ease-standard 사용. Task 0의 reduced-motion 컨벤션을 따라 @media (prefers-reduced-motion: reduce){ .chevron{transition:none} .trigger,.trigger::before,.option::before{transition:none} } 로 비활성화.

Light/dark: 모든 값이 토큰이라 themes.css의 다크 오버라이드로 자동 대응(surface-container-high, on-surface, primary-text, outline, state-*-neutral 전부 다크값 존재/승격). elevation-3도 다크 오버라이드됨.

## New tokens needed (Task 0 provides these)
- --outline: (Task 0에서 추가 예정) — 폼 컨트롤 실보더용, surface 대비 ≥3:1, light/dark 양쪽. 트리거 보더(inset 1px)에 사용. Task 0가 이 토큰을 확정하므로 여기서 신규 정의하지 않고 참조만 함. 만약 Task 0가 먼저 머지되지 않으면 임시로 var(--on-surface-muted)로 폴백 가능하나, 최종본은 --outline 사용.

## Acceptance tests (implement as written; these define behavior)
### placeholder 표시 후 클릭하면 listbox와 옵션이 열린다
```tsx
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
```
### 옵션 선택 시 onChange 호출 + 트리거 갱신 + 닫힘 (uncontrolled)
```tsx
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
```
### controlled: value prop이 표시를 결정하고 선택은 onChange만 호출
```tsx
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
```
### 키보드: ArrowDown으로 열고 이동해 Enter로 선택, disabled는 건너뜀
```tsx
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
```
### Escape로 닫히고 포커스가 트리거로 복귀
```tsx
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
```
### 바깥 클릭 시 닫힌다
```tsx
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
```
### 트리거 ARIA: combobox/haspopup/expanded/controls 연결
```tsx
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
```
### 선택된 옵션에 aria-selected=true, 나머지는 false
```tsx
test('선택된 옵션에 aria-selected=true, 나머지는 false', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} defaultValue="busan" aria-label="도시" />)
  await user.click(screen.getByRole('combobox'))
  expect(screen.getByRole('option', { name: '부산' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('option', { name: '서울' })).toHaveAttribute('aria-selected', 'false')
})
```
### invalid면 aria-invalid=true + invalid 클래스
```tsx
test('invalid면 aria-invalid=true + invalid 클래스', () => {
  render(<Select options={OPTS} invalid aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  expect(trigger).toHaveAttribute('aria-invalid', 'true')
  expect(trigger.className).toContain(styles.invalid)
})
```
### 타입어헤드: 열린 상태에서 문자 입력이 활성 옵션을 이동
```tsx
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
```
### name 지정 시 hidden input이 value를 반영 (폼 제출)
```tsx
test('name 지정 시 hidden input이 value를 반영 (폼 제출)', () => {
  const { container } = render(
    <Select options={OPTS} name="city" defaultValue="jeju" aria-label="도시" />
  )
  const hidden = container.querySelector('input[type="hidden"][name="city"]') as HTMLInputElement
  expect(hidden).not.toBeNull()
  expect(hidden.value).toBe('jeju')
})
```
### disabled Select는 클릭해도 열리지 않는다
```tsx
test('disabled Select는 클릭해도 열리지 않는다', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} disabled aria-label="도시" />)
  await user.click(screen.getByRole('combobox'))
  expect(screen.queryByRole('listbox')).toBeNull()
})
```

## Story notes
import type { Meta, StoryObj } from '@storybook/react-vite'; import { Select } from './Select'; component: Select. title: 'Components/Select'.

기본 args: options(한국어 도시 목록), placeholder: '도시 선택', size: 'md', 'aria-label': '도시'. 모든 스토리는 root에 style={{ width: 240 }} 부여(폭 토큰 없음 → 스토리에서 명시)하거나 wrapper로 감쌈.

샘플 데이터(한국어 copy):
- CITIES: [{value:'seoul',label:'서울'},{value:'busan',label:'부산'},{value:'incheon',label:'인천',disabled:true},{value:'jeju',label:'제주'}]
- GROUPED: [{label:'수도권', options:[{value:'seoul',label:'서울'},{value:'incheon',label:'인천'}]},{label:'영남', options:[{value:'busan',label:'부산'},{value:'daegu',label:'대구'}]}]
- LONG: 12개 이상 항목으로 max-height 스크롤 확인

스토리:
- Playground: {} (기본 args, controls로 size/invalid/disabled 토글)
- WithValue: defaultValue 'busan' (선택 상태 + 체크 아이콘 노출)
- Invalid: invalid + placeholder (에러 보더)
- Disabled: disabled
- Grouped: options=GROUPED (role=group + groupLabel 렌더 확인)
- LongList: options=LONG, open 상태 스크린샷용
- Controlled: useState로 value/onChange 연결한 render 함수 예시 (확인/취소 없이 상위 상태 반영 시연)

Matrix 스토리(필수, Button.stories의 Matrix 패턴): 행=size ['sm','md','lg'], 각 행에 상태 열 나열 — 기본(placeholder), 선택됨(defaultValue), invalid, disabled, leadingIcon(<Icon name=\"place\" size={20} />). grid gap 16, 각 셀 width 200. 한 셀은 열린 상태(가능하면 open 강제 story arg 또는 play 함수로 클릭)로 listbox 앵커·elevation·활성 하이라이트가 라이트/다크 스크린샷에 잡히게 한다. Matrix는 상호작용 없이도 닫힌 상태 전부를 한 화면에 담고, 열림 상태는 별도 OpenState 스토리에서 play: async ({canvasElement}) => userEvent.click(getByRole('combobox'))로 노출.

컴포넌트/prop 이름은 영어, 표시 copy만 한국어.

## Render-verify checklist (light + dark)
- 트리거 보더가 var(--outline)로 보이고(라이트/다크 모두 표면 대비 ≥3:1로 또렷) 장식용 --outline-variant보다 진하다
- placeholder 텍스트는 --on-surface-muted(옅음), 선택된 값 텍스트는 --on-surface(진함)로 구분된다
- 키보드로 트리거 포커스 시 box-shadow var(--focus-ring)(2px 표면 갭 + 레드 링)이 라이트/다크 모두 보인다
- 열림 상태에서 셰브론이 180도 회전하고, listbox가 트리거 바로 아래(--space-1 간격)에 좌우 꽉 차게 앵커된다
- listbox 배경이 --surface-container-high로 페이지 --surface와 구분되고 --elevation-3 그림자가 라이트/다크 모두 보인다(다크는 약한 그림자)
- 선택된 옵션은 왼쪽 check 아이콘 표시 + 라벨이 --primary-text 색(다크에서도 AA 대비 유지, --primary 아님)
- 키보드 활성(activedescendant) 옵션에 --state-hover-neutral 배경 오버레이가 얹히고, 미선택 옵션은 check 자리만 비워둔 채 라벨 정렬이 흔들리지 않는다
- invalid 트리거 보더가 --semantic-error 레드로 표시된다
- disabled 옵션(인천)은 --state-disabled-text로 옅고 hover 오버레이가 생기지 않는다; disabled Select 트리거 전체가 옅게 비활성
- 그룹 헤더(.groupLabel)가 --on-surface-muted 소형 라벨로 옵션과 구분된다
- 긴 라벨은 트리거에서 말줄임(...) 처리되고 페이지가 가로 스크롤되지 않는다
- LongList 열림 시 listbox가 max-height(약 6행)에서 세로 스크롤된다

## Risks / decisions
1) --outline 의존: 트리거 보더가 Task 0의 --outline에 의존한다. Task 0가 먼저 머지되지 않으면 check-tokens.mjs가 unknown token으로 실패한다 → 구현 순서상 Task 0 이후 착수 필수(또는 임시 --on-surface-muted 폴백). 2) forwardRef 대상 결정: ref/rest를 트리거 button에, className을 root div에 분리 매핑했다. Button은 셋 다 button에 몰지만 Select는 앵커 컨테이너가 필요해 분리가 불가피 — 문서화 필요(ref는 트리거 포커스용). 3) aria-activedescendant를 role=combobox인 <button>에 두는 것은 유효하나(암묵 role이 combobox로 대체됨), 일부 스크린리더에서 button 기반 combobox 지원 편차가 있을 수 있다 → APG 준수 표준 패턴이므로 채택하되 VoiceOver/NVDA 스팟체크 권장. 4) 한국어 type-ahead: IME 조합 문자는 keydown.key로 안정적으로 안 잡혀 테스트는 라틴 라벨로 검증했다. 실사용 한글 type-ahead는 best-effort(조합 완료 문자 기준)로 명시. 5) max-height:calc(var(--control-height-lg) * 6)는 토큰*무단위라 린트 통과하지만 '6행'은 근사치 — 필요 시 조정. 6) 포지셔닝: 순수 CSS absolute 앵커라 뷰포트 하단 근처에서 listbox가 잘릴 수 있다(뒤집기 없음). 제약(라이브러리 금지)상 수용하고, 필요 시 후속 태스크에서 flip 로직 검토.
