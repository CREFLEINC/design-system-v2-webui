# Phase 2 Component Spec — Tabs (config-driven; internal TabList/Tab/TabPanel are not exported)

- Directory: `src/components/Tabs/`

## Exports (append to src/index.ts)
```ts
export { Tabs } from './components/Tabs/Tabs'
export type { TabsProps, TabItem, TabsSize } from './components/Tabs/Tabs'
```

## Props interface
```tsx
import type { HTMLAttributes, ReactNode } from 'react'

export type TabsSize = 'sm' | 'md'

export interface TabItem {
  /** 탭·패널을 잇는 안정적 식별자 — value/defaultValue/onChange가 참조한다 */
  value: string
  /** 탭 라벨. 텍스트 또는 <Icon/>+텍스트 등 ReactNode */
  label: ReactNode
  /** 이 탭이 제어하는 패널 내용 */
  content: ReactNode
  /** true면 탭이 비활성 — 클릭·키보드 로빙에서 건너뛴다 */
  disabled?: boolean
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** 탭 구성. 순서가 곧 시각·키보드 순서 */
  items: TabItem[]
  /** 제어 모드 — 활성 탭 value. 지정 시 내부 상태를 쓰지 않는다 */
  value?: string
  /** 비제어 모드 초기 활성 탭 value. 미지정 시 첫 번째 enabled 탭 */
  defaultValue?: string
  /** 활성 탭이 바뀔 때 호출 (제어/비제어 공통) */
  onChange?: (value: string) => void
  /** 탭 높이/타이포 스케일. 기본 md */
  size?: TabsSize
  /** tablist에 붙는 접근성 라벨 (탭 그룹의 의미) */
  'aria-label'?: string
}
```

## Variants & API
DECISION 1 — Config API over compound (<Tabs><Tab/>…). Justification: the WAI-ARIA tabs pattern requires the parent to (a) generate paired ids so each tab's aria-controls points at its panel's id and each panel's aria-labelledby points back, (b) run roving tabindex across siblings, and (c) own arrow/Home/End focus movement by reaching into child DOM nodes. A compound API would force Context + ref-registration or cloneElement to share active value, generated ids, and a ref array — more moving parts and more ways for a consumer to break the aria wiring (e.g. mismatched panel count). A config `items: TabItem[]` lets Tabs own 100% of the id/roving/keyboard logic while still accepting rich ReactNode labels and panel content, so it is the cleaner AND safer choice. This mirrors how Button keeps all class/state logic internal and exposes a flat prop surface.

DECISION 2 — Automatic activation (selection follows focus). Justification: WAI-ARIA Authoring Practices recommend automatic activation when panels are cheap to render (no async fetch on switch), which is the case here since panel content is passed in as already-built ReactNode. So Arrow/Home/End move focus AND select in one step; Enter/Space are therefore redundant no-ops (the focused tab is already selected) but remain harmless. A `manual` activation prop is intentionally NOT added in this task to keep scope tight — noted as a future extension, not a gap.

STRUCTURE — Root <div role="presentation" ref> wraps a <div role="tablist"> (the keyboard host, onKeyDown) and the panels. forwardRef<HTMLDivElement> onto the root (a consumer sensibly attaches a ref to measure/scroll the whole widget), `...rest` spread onto the root, `className` merged via cx like Button. size maps to styles[size] on the tablist exactly like Button's styles[size].

STATE — Controlled iff `value !== undefined`. Internal useState seeded from `defaultValue ?? firstEnabledValue`. `activeValue = isControlled ? value : internal`. select(v): skip if disabled or already active; if uncontrolled setInternal(v); always call onChange?.(v). Clicking a tab or arrowing to it both route through select().

IDS — const base = useId(); tabId(v) = `${base}-tab-${v}`, panelId(v) = `${base}-panel-${v}`.

ROVING TABINDEX — each tab tabIndex = value===activeValue ? 0 : -1, so Tab key enters the group onto the active tab only. Arrow keys compute the next ENABLED index (wrapping), focus that tab via a ref array (const refs = useRef<Record<string, HTMLButtonElement|null>>({})), and select it. Home → first enabled, End → last enabled. Disabled tabs get aria-disabled and are skipped by both nav and click.

PANELS — all panels render; inactive ones get the native `hidden` attribute (keeps aria-controls targets present + preserves panel DOM state, and hidden elements leave the a11y tree so getByRole('tabpanel') resolves to exactly the active one). Each panel: role=tabpanel, id=panelId, aria-labelledby=tabId, tabIndex={0} (focusable so keyboard users can reach panel content that has no focusable child — per APG).

## Accessibility
Roles: root div role="presentation"; the tab strip is role="tablist" (carries aria-label from prop, and aria-orientation defaults to horizontal so it may be omitted). Each tab is a native <button type="button" role="tab"> with aria-selected={value===active}, aria-controls={panelId}, id={tabId}, and aria-disabled when disabled. Each panel is role="tabpanel" id={panelId} aria-labelledby={tabId} tabIndex={0}, with `hidden` on inactive panels.

Keyboard contract (tablist owns onKeyDown): ArrowRight/ArrowLeft move focus to the previous/next ENABLED tab, wrapping at ends; Home/End jump to first/last enabled tab; each movement selects (automatic activation) and calls preventDefault so the page does not scroll. Enter/Space are not needed (focused===selected) and are left to default. Tab/Shift+Tab: because of roving tabindex, focus enters the group on the active tab and the next Tab press leaves the tablist and lands on the active panel (tabIndex 0).

Focus management: exactly one tab is tabbable at a time; arrow navigation calls .focus() on the target tab. Visible focus is box-shadow: var(--focus-ring) on .tab:focus-visible (identical mechanism to Button). Disabled tabs are skipped, never focused.

Contrast (WCAG AA): inactive label uses --on-surface-variant (>=7:1 on surface, both themes); active label uses --primary-text (the token specifically chosen to pass AA on dark — NOT --primary); the active underline bar is a --primary fill (non-text, treated like Button.filled's background); the tablist baseline track uses --outline (>=3:1 boundary from Task 0).

## CSS notes
Tokens per part:
- .tabs (root): display flex; flex-direction column; gap var(--space-4).
- .tablist: display flex; position relative; the baseline track = box-shadow: inset 0 -1px 0 0 var(--outline) (1px allowed). overflow-x: auto so a long tab row scrolls inside its own container instead of overflowing the page; gap var(--space-2).
- .tab: position relative; isolation isolate (state layer below content, like Button); display inline-flex; align-items center; gap var(--space-2); border 0; background transparent; cursor pointer; outline none; color var(--on-surface-variant); font var(--type-label-lg); letter-spacing var(--type-label-lg-tracking); border-radius var(--radius-sm) (so focus ring corners read); padding 0 var(--space-3); white-space nowrap; transition: color var(--motion-fast) var(--ease-standard).
- Sizes: .sm { height var(--control-height-sm); font var(--type-label-sm); letter-spacing var(--type-label-sm-tracking) }  .md { height var(--control-height-md) } — same size-class mechanism as Button.
- State layer .tab::before: content ''; position absolute; inset 0; border-radius inherit; background transparent; pointer-events none; transition: background var(--motion-fast) var(--ease-standard). .tab:hover::before { background var(--state-hover) } .tab:active::before { background var(--state-press) } — M3 overlay, never touches base background (identical to Button).
- Active underline .tab::after: content ''; position absolute; left var(--space-3); right var(--space-3); bottom 0; height 2px (allowed); border-radius var(--radius-full); background var(--primary); transform: scaleX(0); transform-origin: center; transition: transform var(--motion-base) var(--ease-emphasized). .active::after { transform: scaleX(1) } — the animated indicator grows in place when a tab becomes active. A slide-BETWEEN-tabs indicator was rejected because it needs runtime offsetLeft/width pixel measurement (fights the token-only CSS rule and adds useLayoutEffect/ResizeObserver fragility); the per-tab scaleX indicator gives the same 'animated active underline' affordance, is fully token-driven, and is trivially reduced-motion-guarded.
- .active { color var(--primary-text) }.
- .tab:focus-visible { box-shadow var(--focus-ring) } (matches Button).
- Disabled: .tab[aria-disabled='true'] { color var(--state-disabled-text); cursor default } and its ::before stays transparent, ::after stays scaleX(0).
- .panel { /* consumer content; minimal */ } focus ring on panel: .panel:focus-visible { box-shadow var(--focus-ring); border-radius var(--radius-sm) }.

Light/dark: every color is a semantic token that themes.css already flips (--on-surface-variant, --primary-text, --state-*, --outline, --focus-ring all have dark overrides), so both themes work with zero theme-specific CSS.

Motion + reduced-motion: the underline transform transition and the color/state transitions are wrapped so that under @media (prefers-reduced-motion: reduce) { .tab, .tab::before, .tab::after { transition: none } } the indicator snaps instantly (follows the Task 0 reduced-motion convention).

## New tokens needed (Task 0 provides these)
- --outline: (added by Phase 2 Task 0) — used for the tablist baseline track (inset 0 -1px) and is the correct >=3:1 form-control boundary; --outline-variant (~1.6:1) would be too faint for a real structural divider. No other new tokens required.

## Acceptance tests (implement as written; these define behavior)
### 탭과 활성 패널을 렌더하고 aria-selected를 표시한다
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, type TabItem } from './Tabs'
import styles from './Tabs.module.css'

const items: TabItem[] = [
  { value: 'overview', label: '개요', content: <p>개요 내용</p> },
  { value: 'settings', label: '설정', content: <p>설정 내용</p> },
  { value: 'members', label: '멤버', content: <p>멤버 내용</p> }
]

test('탭 3개를 렌더하고 활성 탭/패널만 노출한다', () => {
  render(<Tabs items={items} defaultValue="overview" aria-label="프로젝트" />)
  expect(screen.getAllByRole('tab')).toHaveLength(3)
  const active = screen.getByRole('tab', { name: '개요' })
  expect(active).toHaveAttribute('aria-selected', 'true')
  expect(active.className).toContain(styles.active)
  expect(screen.getByRole('tab', { name: '설정' })).toHaveAttribute('aria-selected', 'false')
  // hidden 패널은 a11y 트리에서 빠지므로 tabpanel은 활성 것 하나만 조회된다
  expect(screen.getByRole('tabpanel')).toHaveTextContent('개요 내용')
})
```
### 탭 클릭 시 활성 탭이 바뀐다 (비제어)
```tsx
test('클릭하면 활성 탭·패널이 전환되고 onChange가 호출된다', async () => {
  const onChange = vi.fn()
  render(<Tabs items={items} defaultValue="overview" onChange={onChange} aria-label="프로젝트" />)
  await userEvent.click(screen.getByRole('tab', { name: '설정' }))
  expect(onChange).toHaveBeenCalledWith('settings')
  expect(screen.getByRole('tab', { name: '설정' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: '개요' })).toHaveAttribute('aria-selected', 'false')
  expect(screen.getByRole('tabpanel')).toHaveTextContent('설정 내용')
})
```
### 제어 모드에서는 value가 활성 탭을 결정한다
```tsx
test('제어 모드: 클릭은 onChange만 알리고 스스로 전환하지 않는다', async () => {
  const onChange = vi.fn()
  render(<Tabs items={items} value="overview" onChange={onChange} aria-label="프로젝트" />)
  await userEvent.click(screen.getByRole('tab', { name: '멤버' }))
  expect(onChange).toHaveBeenCalledWith('members')
  // 부모가 value를 갱신하지 않았으므로 여전히 overview가 활성
  expect(screen.getByRole('tab', { name: '개요' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tabpanel')).toHaveTextContent('개요 내용')
})
```
### ArrowRight/Home/End로 포커스 이동 + 자동 선택
```tsx
test('화살표는 포커스를 옮기며 즉시 선택한다 (automatic activation)', async () => {
  const onChange = vi.fn()
  render(<Tabs items={items} defaultValue="overview" onChange={onChange} aria-label="프로젝트" />)
  const overview = screen.getByRole('tab', { name: '개요' })
  overview.focus()
  await userEvent.keyboard('{ArrowRight}')
  const settings = screen.getByRole('tab', { name: '설정' })
  expect(settings).toHaveFocus()
  expect(settings).toHaveAttribute('aria-selected', 'true')
  expect(onChange).toHaveBeenLastCalledWith('settings')
  await userEvent.keyboard('{End}')
  expect(screen.getByRole('tab', { name: '멤버' })).toHaveFocus()
  expect(onChange).toHaveBeenLastCalledWith('members')
  // End(멤버)에서 ArrowRight는 처음으로 래핑
  await userEvent.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: '개요' })).toHaveFocus()
  await userEvent.keyboard('{Home}')
  expect(screen.getByRole('tab', { name: '개요' })).toHaveFocus()
})
```
### ArrowRight는 disabled 탭을 건너뛴다
```tsx
test('disabled 탭은 화살표 이동에서 건너뛴다', async () => {
  const withDisabled: TabItem[] = [
    { value: 'a', label: '가', content: <p>가 내용</p> },
    { value: 'b', label: '나', content: <p>나 내용</p>, disabled: true },
    { value: 'c', label: '다', content: <p>다 내용</p> }
  ]
  const onChange = vi.fn()
  render(<Tabs items={withDisabled} defaultValue="a" onChange={onChange} aria-label="그룹" />)
  screen.getByRole('tab', { name: '가' }).focus()
  await userEvent.keyboard('{ArrowRight}')
  // 나(disabled)를 건너뛰고 다로 이동
  expect(screen.getByRole('tab', { name: '다' })).toHaveFocus()
  expect(onChange).toHaveBeenLastCalledWith('c')
  expect(screen.getByRole('tab', { name: '나' })).toHaveAttribute('aria-disabled', 'true')
})
```
### roving tabindex: 활성 탭만 0
```tsx
test('roving tabindex — 활성 탭만 0, 나머지는 -1', () => {
  render(<Tabs items={items} defaultValue="settings" aria-label="프로젝트" />)
  expect(screen.getByRole('tab', { name: '설정' })).toHaveAttribute('tabindex', '0')
  expect(screen.getByRole('tab', { name: '개요' })).toHaveAttribute('tabindex', '-1')
  expect(screen.getByRole('tab', { name: '멤버' })).toHaveAttribute('tabindex', '-1')
})
```
### aria-controls / aria-labelledby가 상호 연결된다
```tsx
test('탭과 패널이 id로 양방향 연결된다', () => {
  render(<Tabs items={items} defaultValue="overview" aria-label="프로젝트" />)
  const tab = screen.getByRole('tab', { name: '개요' })
  const panel = screen.getByRole('tabpanel')
  expect(tab).toHaveAttribute('aria-controls', panel.id)
  expect(panel).toHaveAttribute('aria-labelledby', tab.id)
  expect(panel).toHaveAttribute('tabindex', '0')
})
```

## Story notes
Import Meta/StoryObj from '@storybook/react-vite' (Storybook 10), same header as Button.stories.tsx. Korean copy throughout.

- meta: title 'Components/Tabs', component Tabs, args { size: 'md', 'aria-label': '프로젝트 뷰', items: [{value:'overview',label:'개요',content:<p style={{padding:16}}>개요 패널</p>}, {value:'settings',label:'설정',content:<p style={{padding:16}}>설정 패널</p>}, {value:'members',label:'멤버',content:<p style={{padding:16}}>멤버 패널</p>}] }.
- Playground: {} (uncontrolled, exercises defaultValue via first enabled tab + arrow keys).
- WithIcons: labels combine <Icon name=\"dashboard\" size={20} /> + '대시보드' etc. to prove ReactNode labels and icon+text gap.
- Controlled: a render fn using React.useState('settings') wired to value/onChange, with a note that selection is parent-driven.
- Matrix (REQUIRED, mirrors Button's Matrix): a grid enumerating both sizes ['sm','md'] x states — default, with-icon, and one item disabled ({value:'x',label:'비활성',disabled:true}) — and shows the active underline on the first tab of each row. This is the story the renderVerify screenshot targets in light + dark.

## Render-verify checklist (light + dark)
- 활성 탭 아래에 2px 빨강(--primary) 언더라인 바가 보이고, 비활성 탭에는 없다 (light + dark 모두)
- 활성 탭 라벨이 빨강 계열(--primary-text)로, 다크에서도 배경 대비 또렷하게 읽힌다 (연한 빨강 톤으로 스왑됨을 확인)
- 비활성 탭 라벨이 --on-surface-variant 회색으로, 활성 탭과 명도 차이가 분명하다
- 탭 스트립 하단에 1px --outline 베이스라인 트랙이 전체 폭으로 보인다 (양 테마에서 표면과 >=3:1)
- 키보드 포커스 시 활성 탭에 --focus-ring 이중 링(surface gap + red)이 잘려나가지 않고 보인다
- disabled 탭은 흐리게(--state-disabled-text) 표시되고 언더라인/호버 오버레이가 없다
- hover 시 탭 위에 은은한 상태 레이어 오버레이가 얹히되 배경색 자체는 바뀌지 않는다 (M3)
- sm/md 두 사이즈의 탭 높이(32/40px)와 타이포 스케일 차이가 구분된다
- 패널 내용이 활성 탭 아래 한 개만 표시된다 (숨겨진 패널은 렌더되지 않음)

## Risks / decisions
1) Automatic activation is deliberate and assumes synchronous, already-built panel content; if a consumer later needs lazy/async panels, a `manual` activation prop must be added (Enter/Space to select) — out of scope here but the keyboard handler should be written so adding it is a one-branch change. 2) The per-tab scaleX underline is NOT a slide-between-tabs indicator; if design specifically wants the sliding motion, that requires runtime pixel measurement and would breach the token-only/px CSS rule — flag for design sign-off before switching approaches. 3) Depends on Task 0 shipping --outline; if Task 0 slips, fall back to --outline-variant for the baseline track (decorative-only, ~1.6:1) and note the reduced contrast. 4) `value`/`defaultValue` referencing a non-existent or disabled item is a consumer error — implementer should resolve the initial active to the first ENABLED item when defaultValue is missing/invalid rather than crashing. 5) overflow-x:auto on the tablist means keyboard-focused off-screen tabs should scroll into view; relying on native .focus() scroll is usually enough but confirm in the Matrix story with many tabs.
