# Phase 3 Component Spec — SearchInput

- Directory: `src/components/SearchInput/`
- Reuses: Icon (leading search glyph), IconButton (clear × button — reuses its state-layer, focus-ring, and required aria-label)

## Exports
```ts
export { SearchInput } from './components/SearchInput/SearchInput'
export type { SearchInputProps, SearchInputSize } from './components/SearchInput/SearchInput'
```

## Props interface
```tsx
export type SearchInputSize = 'sm' | 'md' | 'lg'

// Omit native 'size' (number, collides with design size) and 'type' (we force type="search").
// onChange stays the native ChangeEventHandler<HTMLInputElement> from InputHTMLAttributes.
export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** 시각적 라벨. 없으면 반드시 aria-label을 rest로 넘겨야 함 (TextField와 동일 규약) */
  label?: string
  /** 도움말 — error가 있으면 대체됨 */
  helperText?: ReactNode
  /** truthy면 invalid(aria-invalid) + 이 텍스트를 에러 메시지로 표시 */
  error?: ReactNode
  size?: SearchInputSize          // 기본 'md'
  /** 부모 폭에 맞춰 확장 */
  fullWidth?: boolean
  /** true면 leading 검색 아이콘 자리에 스피너 표시 (검색 진행 중) */
  loading?: boolean
  /** 제어(controlled) 값 */
  value?: string
  /** 비제어(uncontrolled) 초기 값 */
  defaultValue?: string
  /** Enter로 검색 확정 시 현재 입력값과 함께 호출 */
  onSearch?: (value: string) => void
  /** clear(×) 버튼으로 값이 비워진 뒤 호출 (선택) */
  onClear?: () => void
  /** clear 버튼 접근 이름 — 기본 '지우기' */
  clearLabel?: string
  /** 최상위 wrapper className (className은 <input>으로 전달됨) */
  containerClassName?: string
}
// forwardRef<HTMLInputElement> — ref는 실제 <input>(searchbox)로 전달.
```

## Variants & API
SCOPE: 검색 필드 + leading 검색아이콘(또는 loading 스피너) + 텍스트가 있을 때만 나타나는 clear(×) 버튼. 트레일링 필터 드롭다운은 out-of-scope로 파일 상단 주석에 명시.

빌드 결정 — TextField를 import 합성하지 않고, TextField.module.css의 .inputWrap 보더 상태머신 레시피를 그대로 미러링한 독립 컴포넌트로 작성한다. 이유: TextField의 trailing 슬롯은 `<span aria-hidden="true">`로 감싸므로 인터랙티브 clear IconButton을 넣으면 a11y 트리에서 사라지고, leading 슬롯도 loading 스피너로 스왑 불가. 대신 Icon + IconButton을 import 재사용하고 라벨/헬퍼/에러/aria-describedby 로직·사이즈 토큰·보더 상태머신은 TextField와 1:1로 동일하게 재현.

controlled/uncontrolled (IconButton pressed 패턴 준용):
  const isControlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue ?? '')
  const current = isControlled ? value : internal
  const hasText = current.length > 0
input은 항상 value={current}로 React-controlled. handleChange: if(!isControlled) setInternal(e.target.value); onChange?.(e).

ref 병합 (zero-dep): 내부 inputRef와 forwardRef를 콜백ref로 합성 —
  const setRefs = useCallback((n: HTMLInputElement | null) => { inputRef.current = n; if (typeof ref === 'function') ref(n); else if (ref) ref.current = n }, [ref])

clear 핸들러 (load-bearing) — controlled/uncontrolled 모두에서 네이티브 onChange가 자연히 발화하도록 React value tracker를 우회한 뒤 input 이벤트를 디스패치, 그리고 refocus:
  function handleClear() {
    const input = inputRef.current; if (!input) return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, '')
    input.dispatchEvent(new Event('input', { bubbles: true })) // → React onChange 발화(uncontrolled면 setInternal(''))
    input.focus()
    onClear?.()
  }
(jsdom에서도 root 위임 리스너로 onChange 발화 → 테스트 검증 가능.)

키보드 — onKeyDown 합성(소비자 것 먼저 호출): Enter → e.nativeEvent.isComposing 아닐 때 onSearch?.(e.currentTarget.value); Escape → hasText면 handleClear() (네이티브 검색창 관례). onKeyDown/onChange는 rest에서 구조분해해 합성.

렌더 구조 (TextField 미러):
  <div class=field data-disabled?>
    {label && <label htmlFor=id>}
    <div class="inputWrap size invalid? disabled?">
      <span class=leading aria-hidden>  // loading ? <span class=spinner/> : <Icon name="search" size=20/>
      <input ref=setRefs id type="search" value={current} onChange onKeyDown aria-invalid? aria-describedby aria-label? {...rest}/>
      {hasText && !disabled && <IconButton className=clear icon="close" size="sm" variant="standard" aria-label={clearLabel ?? '지우기'} onClick={handleClear} tabIndex={-1 아님: 기본 포커스 가능}/>}
    </div>
    {invalid ? <p id=errorId class=error> : helperText ? <p id=helperId class=helper> : null}
  </div>

props 스프레드: input은 커스텀 위젯이 아니므로 TextField와 동일하게 {...rest} 마지막(소비자 승리), 단 onChange/onKeyDown은 구조분해 후 합성, type/value/aria-invalid/aria-describedby는 컴포넌트 소유. type은 Omit되어 소비자가 덮어쓸 수 없음.

접근성: input type="search" → 암묵 role="searchbox" (getByRole('searchbox')로 매칭). 라벨 없으면 aria-label 필수. helper/error는 aria-describedby로 연결, error 시 aria-invalid. clear는 IconButton(required aria-label) → 키보드로 Tab 도달·Enter/Space 작동. 아웃풋 landmark role="search"는 남용 방지 위해 기본 미부여(옵션으로 주석).

## Accessibility
input type="search"로 암묵 role="searchbox" 노출 — 테스트/소비자는 getByRole('searchbox')로 접근. 라벨 연결은 TextField와 동일: label prop이 있으면 htmlFor/id, 없으면 소비자가 aria-label을 rest로 제공(문서화). helperText는 aria-describedby=helperId, error는 aria-invalid=true + aria-describedby=errorId로 헬퍼를 대체. clear 버튼은 IconButton의 required 'aria-label'(기본 '지우기')로 접근 이름을 갖고 키보드 포커스 가능하며 클릭 후 input으로 focus 복귀 → 포커스 유실 없음. leading 검색 아이콘/스피너는 장식이므로 aria-hidden. Escape로 값 비우기(hasText일 때) 지원. 포커스 링은 .inputWrap:focus-within box-shadow var(--focus-ring)로 표시(TextField와 동일), clear IconButton은 자체 :focus-visible 링 보유. 색 대비: on-surface/on-surface-muted(placeholder)/semantic-error-text 모두 기존 AA 검증 토큰 재사용.

## CSS notes
SearchInput.module.css는 TextField.module.css를 미러링하며 토큰만 사용(raw 색상 금지, px는 0/1/2만). 재사용/차용 토큰: --space-1/2/3/4, --radius-md, --control-height-sm/md/lg, --outline, --on-surface, --on-surface(hover 보더), --on-surface-variant(leading/label), --on-surface-muted(placeholder), --primary(focus 보더), --semantic-error(invalid 보더), --semantic-error-text(에러 텍스트+invalid leading), --state-disabled-fill/-text, --focus-ring, --motion-fast, --ease-standard, --type-body-lg/-sm/-tracking, --type-label-sm/-tracking. 전부 styles/*에 존재(newTokensNeeded 없음).

핵심 규칙 (TextField와 동일):
  .inputWrap { position:relative; display:flex; align-items:center; gap:var(--space-2); border-radius:var(--radius-md); background:transparent; box-shadow: inset 0 0 0 1px var(--outline); transition: box-shadow var(--motion-fast) var(--ease-standard); }
  .sm/.md/.lg → control-height + 좌우 padding(sm/md var(--space-3), lg var(--space-4)); 단 trailing 쪽 padding은 clear 버튼이 있을 때 시각 정렬 위해 .clear에 margin-right: calc(-1 * var(--space-1)) 인라인 오프셋(오른쪽 가장자리 정렬, 터치 타깃 유지). IconButton size="sm"은 32px 정사각 → md(40)/lg(48)에 여유, sm(32) inputWrap에서는 높이를 꽉 채우므로 위 음수 마진으로 가장자리 정렬. (알려진 튜닝 포인트로 주석)
  보더 상태머신: :hover:not(.disabled):not(.invalid):not(:focus-within) → inset 1px var(--on-surface); :focus-within → inset 2px var(--primary) + var(--focus-ring); .invalid → inset 1px var(--semantic-error); .invalid:focus-within → inset 2px var(--semantic-error)+focus-ring; .disabled → inset 1px var(--state-disabled-fill).
  .leading { display:inline-flex; align-items:center; flex:0 0 auto; color:var(--on-surface-variant); } .invalid .leading { color:var(--semantic-error-text); }
  .input { flex:1 1 auto; min-width:0; border:0; background:transparent; outline:none; color:var(--on-surface); font:var(--type-body-lg); } ::placeholder{ color:var(--on-surface-muted); } :disabled{ color:var(--state-disabled-text); }
  .spinner (Button 레시피 재사용): width/height 1em; border-radius:var(--radius-full); border:2px solid currentColor; border-right-color:transparent; animation: spin 0.8s linear infinite; @keyframes spin{ to{ transform:rotate(360deg) } }. .leading이 color를 주므로 currentColor가 on-surface-variant.
  reduced-motion 블록(맨 아래): @media (prefers-reduced-motion: reduce){ .inputWrap{ transition:none } .spinner{ animation-duration:1.6s } } — inputWrap은 ::before를 쓰지 않으므로 유사요소 나열 불필요; IconButton은 자체 파일에서 reduced-motion 처리.

## New tokens needed
- none

## Acceptance tests
### 타이핑하면 clear 버튼이 나타나고 onChange가 발화하며 searchbox로 접근된다
```tsx
test('타이핑하면 clear 버튼이 나타나고 onChange가 발화한다', async () => {
  const onChange = vi.fn()
  render(<SearchInput aria-label="검색" onChange={onChange} />)
  const input = screen.getByRole('searchbox')
  expect(screen.queryByRole('button', { name: '지우기' })).toBeNull()
  await userEvent.type(input, '스마트폰')
  expect(input).toHaveValue('스마트폰')
  expect(onChange).toHaveBeenCalled()
  expect(screen.getByRole('button', { name: '지우기' })).toBeInTheDocument()
})
```
### Enter를 누르면 onSearch가 현재 값과 함께 호출된다
```tsx
test('Enter를 누르면 onSearch가 현재 값과 함께 호출된다', async () => {
  const onSearch = vi.fn()
  render(<SearchInput aria-label="검색" onSearch={onSearch} />)
  await userEvent.type(screen.getByRole('searchbox'), '노트북{Enter}')
  expect(onSearch).toHaveBeenCalledWith('노트북')
})
```
### clear 버튼을 누르면 값이 비워지고 input으로 포커스가 복귀하며 onChange가 발화한다
```tsx
test('clear 버튼은 값을 비우고 input으로 포커스를 되돌린다', async () => {
  const onChange = vi.fn()
  render(<SearchInput aria-label="검색" defaultValue="키워드" onChange={onChange} />)
  const input = screen.getByRole('searchbox')
  expect(input).toHaveValue('키워드')
  onChange.mockClear()
  await userEvent.click(screen.getByRole('button', { name: '지우기' }))
  expect(input).toHaveValue('')
  expect(input).toHaveFocus()
  expect(onChange).toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: '지우기' })).toBeNull()
})
```
### loading이면 검색 아이콘 대신 스피너가 표시된다
```tsx
test('loading이면 검색 아이콘 대신 스피너가 표시된다', () => {
  const { container, rerender } = render(<SearchInput aria-label="검색" />)
  expect(screen.getByText('search')).toBeInTheDocument()
  expect(container.querySelector(`.${styles.spinner}`)).toBeNull()
  rerender(<SearchInput aria-label="검색" loading />)
  expect(screen.queryByText('search')).toBeNull()
  expect(container.querySelector(`.${styles.spinner}`)).toBeTruthy()
})
```
### 제어(controlled) 모드: value가 유지되고 clear가 빈 값으로 onChange를 발화시킨다
```tsx
test('controlled 모드에서 value가 반영되고 clear가 빈 값 onChange를 발화시킨다', async () => {
  function Ctrl() {
    const [v, setV] = useState('초기값')
    return <SearchInput aria-label="검색" value={v} onChange={(e) => setV(e.target.value)} />
  }
  render(<Ctrl />)
  const input = screen.getByRole('searchbox')
  expect(input).toHaveValue('초기값')
  await userEvent.click(screen.getByRole('button', { name: '지우기' }))
  expect(input).toHaveValue('')
})
```
### error면 aria-invalid=true이고 helperText 대신 에러 메시지를 보여준다
```tsx
test('error면 aria-invalid이고 helperText 대신 에러를 보여준다', () => {
  render(<SearchInput aria-label="검색" helperText="도움말" error="검색어를 입력하세요" />)
  const input = screen.getByRole('searchbox')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText('검색어를 입력하세요')).toBeInTheDocument()
  expect(screen.queryByText('도움말')).not.toBeInTheDocument()
  const describedBy = input.getAttribute('aria-describedby')!
  expect(document.getElementById(describedBy)).toHaveTextContent('검색어를 입력하세요')
})
```
### ref가 실제 searchbox input으로 전달되어 포커스 가능하다
```tsx
test('ref가 실제 input(searchbox)으로 전달된다', () => {
  const ref = createRef<HTMLInputElement>()
  render(<SearchInput aria-label="검색" ref={ref} />)
  expect(ref.current).toBe(screen.getByRole('searchbox'))
  ref.current?.focus()
  expect(ref.current).toHaveFocus()
})
```
### disabled면 입력이 차단되고 clear 버튼이 없다
```tsx
test('disabled면 입력이 차단되고 clear 버튼이 없다', async () => {
  const onChange = vi.fn()
  render(<SearchInput aria-label="검색" disabled defaultValue="고정" onChange={onChange} />)
  const input = screen.getByRole('searchbox')
  expect(input).toBeDisabled()
  expect(screen.queryByRole('button', { name: '지우기' })).toBeNull()
  await userEvent.type(input, '변경')
  expect(onChange).not.toHaveBeenCalled()
})
```

## Story notes
title 'Components/SearchInput', 이름 영어 / 카피 한국어. args 기본: { placeholder: '제품, 로트, 설비 검색', size: 'md' }. 스토리: Playground(빈 상태) / WithValue(defaultValue='스마트폰 조립' → clear 버튼 노출) / Loading(loading, defaultValue='검색 중…') / ErrorState(error='검색어를 입력하세요') / Disabled(disabled, defaultValue='수정 불가') / Controlled(useState + value/onChange로 제어 데모, onSearch로 alert 대체 로깅) / Matrix. Matrix는 story id components-searchinput--matrix 생성 — sizes(sm/md/lg) × 상태(빈/값있음+clear/loading/error/disabled) 그리드 + fullWidth 1행으로 라이트·다크 전수 배열. Icon import는 불필요(내부에서 search/close 렌더). 트레일링 필터 드롭다운이 out-of-scope임을 meta 설명에 한 줄 주석.

## Render-verify
- 라이트/다크 모두: 기본 상태 — leading 검색 아이콘(on-surface-variant)과 placeholder(on-surface-muted)가 보이고, 보더는 --outline 1px, 텍스트 없을 때 clear 버튼 없음.
- 값이 있을 때: 오른쪽에 clear(×) IconButton이 나타나고 입력 텍스트는 --on-surface, 오른쪽 가장자리에 정렬(과도한 여백/오버플로 없음), 세 사이즈(32/40/48) 모두 버튼이 세로 중앙 정렬.
- focus-within: 보더가 2px --primary(레드)로 바뀌고 --focus-ring 이중 링이 함께 보임. clear 버튼 자체 포커스 시 IconButton 링 표시.
- loading: leading 자리에 스피너(border 2px currentColor, 우측 투명)로 회전, 검색 아이콘 대체. 다크에서도 currentColor가 on-surface-variant로 보임.
- error: 보더 --semantic-error, 하단 에러 메시지와 (있다면)leading 아이콘이 --semantic-error-text로, 다크(#F2B8B5)/라이트(#B3261E) AA 대비 확인.
- disabled: 보더 --state-disabled-fill, 텍스트 --state-disabled-text, clear 버튼 미표시.
- Matrix: 라이트/다크 스냅샷에서 모든 사이즈×상태 조합이 레드 틴트 없이 중립 보더로 일관되며, 레드는 focus/invalid/clear-hover 상태에서만 등장하는지 확인.

## Risks
clear 버튼의 값 초기화는 React value tracker를 우회한 네이티브 input 이벤트 디스패치에 의존한다(controlled/uncontrolled 공통 처리 위해). 이 트릭은 jsdom·브라우저 모두에서 React onChange를 발화시키는 표준 기법이지만 구현자가 Object.getOwnPropertyDescriptor 널 가드와 dispatchEvent bubbles:true를 정확히 지켜야 한다. 대안(간단): onChange 대신 값-우선 콜백을 별도 제공하는 방식이나, 본 스펙은 TextField의 네이티브 onChange 계약과 일관성을 우선했다. IconButton size='sm'(32px 고정 정사각)이 sm(32px) inputWrap에서 높이를 꽉 채우므로 .clear 음수 마진 튜닝이 필요하다(cssNotes 명시) — 구현 후 세 사이즈 시각 정렬을 렌더로 확인할 것. 트레일링 필터 드롭다운은 명시적으로 out-of-scope."
