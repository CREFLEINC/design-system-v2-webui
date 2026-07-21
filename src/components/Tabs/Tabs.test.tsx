import { expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, type TabItem } from './Tabs'
import { Badge } from '../Chip/Badge'
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

test('클릭하면 활성 탭·패널이 전환되고 onChange가 호출된다', async () => {
  const onChange = vi.fn()
  render(<Tabs items={items} defaultValue="overview" onChange={onChange} aria-label="프로젝트" />)
  await userEvent.click(screen.getByRole('tab', { name: '설정' }))
  expect(onChange).toHaveBeenCalledWith('settings')
  expect(screen.getByRole('tab', { name: '설정' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: '개요' })).toHaveAttribute('aria-selected', 'false')
  expect(screen.getByRole('tabpanel')).toHaveTextContent('설정 내용')
})

test('제어 모드: 클릭은 onChange만 알리고 스스로 전환하지 않는다', async () => {
  const onChange = vi.fn()
  render(<Tabs items={items} value="overview" onChange={onChange} aria-label="프로젝트" />)
  await userEvent.click(screen.getByRole('tab', { name: '멤버' }))
  expect(onChange).toHaveBeenCalledWith('members')
  // 부모가 value를 갱신하지 않았으므로 여전히 overview가 활성
  expect(screen.getByRole('tab', { name: '개요' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tabpanel')).toHaveTextContent('개요 내용')
})

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

test('roving tabindex — 활성 탭만 0, 나머지는 -1', () => {
  render(<Tabs items={items} defaultValue="settings" aria-label="프로젝트" />)
  expect(screen.getByRole('tab', { name: '설정' })).toHaveAttribute('tabindex', '0')
  expect(screen.getByRole('tab', { name: '개요' })).toHaveAttribute('tabindex', '-1')
  expect(screen.getByRole('tab', { name: '멤버' })).toHaveAttribute('tabindex', '-1')
})

test('탭과 패널이 id로 양방향 연결된다', () => {
  render(<Tabs items={items} defaultValue="overview" aria-label="프로젝트" />)
  const tab = screen.getByRole('tab', { name: '개요' })
  const panel = screen.getByRole('tabpanel')
  expect(tab).toHaveAttribute('aria-controls', panel.id)
  expect(panel).toHaveAttribute('aria-labelledby', tab.id)
  expect(panel).toHaveAttribute('tabindex', '0')
})

test('badge가 있으면 탭 버튼 내부에 렌더되어 접근성 이름에 포함된다', () => {
  const withBadge: TabItem[] = [
    { value: 'pending', label: '결재 대기', content: <p>대기 내용</p>, badge: <Badge count={3} /> },
    { value: 'done', label: '완료', content: <p>완료 내용</p> }
  ]
  render(<Tabs items={withBadge} defaultValue="pending" aria-label="결재" />)
  // Tabs는 라벨-뱃지 사이에 구분 공백 텍스트 노드를 렌더하므로(라벨이 숫자로 끝나도 건수와
  // 합쳐지지 않게) 접근성 이름은 "결재 대기 3"이다. 공백 노드는 flex 레이아웃에는 영향 없음.
  const tab = screen.getByRole('tab', { name: '결재 대기 3' })
  expect(within(tab).getByText('3')).toBeInTheDocument()
})

test('badge count=0은 기본적으로 렌더되지 않는다', () => {
  const withZero: TabItem[] = [
    { value: 'pending', label: '결재 대기', content: <p>대기 내용</p>, badge: <Badge count={0} /> }
  ]
  render(<Tabs items={withZero} defaultValue="pending" aria-label="결재" />)
  expect(screen.getByRole('tab', { name: '결재 대기' })).toBeInTheDocument()
  expect(screen.queryByText('0')).not.toBeInTheDocument()
})

test('badge count=0 showZero는 0을 렌더한다', () => {
  const withZeroShown: TabItem[] = [
    { value: 'pending', label: '결재 대기', content: <p>대기 내용</p>, badge: <Badge count={0} showZero /> }
  ]
  render(<Tabs items={withZeroShown} defaultValue="pending" aria-label="결재" />)
  const tab = screen.getByRole('tab', { name: '결재 대기 0' })
  expect(within(tab).getByText('0')).toBeInTheDocument()
})

test('뱃지 있는 탭을 클릭해 활성 전환해도 뱃지 텍스트가 유지된다', async () => {
  const withBadge: TabItem[] = [
    { value: 'overview', label: '개요', content: <p>개요 내용</p> },
    { value: 'pending', label: '결재 대기', content: <p>대기 내용</p>, badge: <Badge count={3} /> }
  ]
  render(<Tabs items={withBadge} defaultValue="overview" aria-label="결재" />)
  const tab = screen.getByRole('tab', { name: '결재 대기 3' })
  expect(tab).toHaveAttribute('aria-selected', 'false')
  await userEvent.click(tab)
  expect(tab).toHaveAttribute('aria-selected', 'true')
  expect(within(tab).getByText('3')).toBeInTheDocument()
})
