import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { DatePicker } from './DatePicker'
import styles from './DatePicker.module.css'

// "오늘" 고정 — 2026-08-15(토). 이 스위트의 모든 테스트가 이 시각 아래에서 실행된다.
// 대부분의 테스트는 defaultValue로 명시적 날짜를 주지만, defaultValue를 생략한 테스트(오늘의 월 그리드에
// 의존)도 실제 실행 시각과 무관하게 항상 같은 결과를 내도록 시스템 시간을 고정한다.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

// vitest + user-event fake-timers 호환은 src/test/setup.ts의 심(shim)이 처리한다(Toast.test.tsx 선례).
function setupUser() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

function cell(iso: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`td[data-date="${iso}"]`)
  if (!el) throw new Error(`셀을 찾지 못했다: ${iso}`)
  return el
}

function activeCell(): HTMLElement {
  const el = document.querySelector<HTMLElement>('td[tabindex="0"]')
  if (!el) throw new Error('활성 셀을 찾지 못했다')
  return el
}

// ── 열기/닫기 ───────────────────────────────────────────────

test('placeholder 표시 후 클릭하면 달력 다이얼로그가 열린다', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
  const trigger = screen.getByRole('button', { name: '발행일' })
  expect(trigger).toHaveTextContent('날짜 선택')
  expect(screen.queryByRole('dialog')).toBeNull()
  await user.click(trigger)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

test('일반 문서에서는 달력 팝업을 body 직계 자식으로 포털한다', async () => {
  const user = setupUser()
  const { container } = render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)

  await user.click(screen.getByRole('button', { name: '발행일' }))

  const popup = screen.getByRole('dialog', { name: '날짜 선택' })
  expect(popup.parentElement).toBe(document.body)
  expect(container).not.toContainElement(popup)
  expect(popup).toHaveAttribute('data-placement-v', 'down')
  expect(popup).toHaveAttribute('data-placement-h', 'right')
})

test('native dialog 안에서는 달력 팝업을 해당 dialog 직계 자식으로 포털하고 theme를 전달한다', async () => {
  const user = setupUser()
  render(
    <dialog open data-testid="portal-host">
      <div data-testid="panel">
        <div data-testid="body" data-theme="dark">
          <DatePicker aria-label="발행일" placeholder="날짜 선택" />
        </div>
      </div>
    </dialog>
  )

  await user.click(screen.getByRole('button', { name: '발행일' }))

  const host = screen.getByTestId('portal-host')
  const popup = screen.getByRole('dialog', { name: '날짜 선택' })
  expect(popup.parentElement).toBe(host)
  expect(screen.getByTestId('panel')).not.toContainElement(popup)
  expect(screen.getByTestId('body')).not.toContainElement(popup)
  expect(popup).toHaveAttribute('data-theme', 'dark')
})

test('document가 없는 SSR 렌더에서 예외가 발생하지 않는다', () => {
  const originalDocument = globalThis.document
  Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true })
  try {
    expect(() => renderToString(<DatePicker aria-label="발행일" />)).not.toThrow()
  } finally {
    Object.defineProperty(globalThis, 'document', { value: originalDocument, configurable: true })
  }
})

// ── single 모드 ─────────────────────────────────────────────

test('single: 날짜 확정 시 onChange(ISO) 호출 + 트리거 갱신 + 닫힘 (uncontrolled)', async () => {
  const user = setupUser()
  const onChange = vi.fn()
  render(
    <DatePicker
      aria-label="발행일"
      placeholder="날짜 선택"
      defaultValue="2026-08-10"
      onChange={onChange}
    />
  )
  const trigger = screen.getByRole('button', { name: '발행일' })
  await user.click(trigger)
  await user.click(cell('2026-08-12'))
  expect(onChange).toHaveBeenCalledWith('2026-08-12')
  expect(trigger).toHaveTextContent('2026-08-12')
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('single: controlled — value가 표시를 결정하고 선택은 onChange만 호출', async () => {
  const user = setupUser()
  const onChange = vi.fn()
  render(<DatePicker aria-label="발행일" value="2026-08-10" onChange={onChange} />)
  const trigger = screen.getByRole('button', { name: '발행일' })
  expect(trigger).toHaveTextContent('2026-08-10')
  await user.click(trigger)
  await user.click(cell('2026-08-12'))
  expect(onChange).toHaveBeenCalledWith('2026-08-12')
  // controlled — prop이 안 바뀌면 표시는 그대로
  expect(trigger).toHaveTextContent('2026-08-10')
})

test('min/max 밖 날짜 셀은 aria-disabled이고 클릭해도 선택되지 않는다', async () => {
  const user = setupUser()
  const onChange = vi.fn()
  render(
    <DatePicker
      aria-label="발행일"
      placeholder="날짜 선택"
      defaultValue="2026-08-10"
      min="2026-08-05"
      max="2026-08-20"
      onChange={onChange}
    />
  )
  await user.click(screen.getByRole('button', { name: '발행일' }))
  const below = cell('2026-08-01')
  const above = cell('2026-08-25')
  expect(below).toHaveAttribute('aria-disabled', 'true')
  expect(above).toHaveAttribute('aria-disabled', 'true')
  // pointer-events CSS가 아니라 컴포넌트의 JS 가드를 직접 검증한다(T2 스팟 체크와 동일 방식).
  fireEvent.click(below)
  fireEvent.click(above)
  expect(onChange).not.toHaveBeenCalled()
})

// ── range 모드 — from <= to 불변식 ──────────────────────────

test('range: 첫 확정이 from, 두 번째 확정이 to — onChange([from, to]) 방출 후 닫힘', async () => {
  const user = setupUser()
  const onChange = vi.fn()
  render(<DatePicker mode="range" aria-label="조회 기간" placeholder="기간 선택" onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: '조회 기간' }))
  await user.click(cell('2026-08-10'))
  expect(onChange).not.toHaveBeenCalled()
  await user.click(cell('2026-08-15'))
  expect(onChange).toHaveBeenCalledWith(['2026-08-10', '2026-08-15'])
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('range: 두 번째 확정이 첫 번째보다 이르면 재시작 — onChange 미방출, from 교체', async () => {
  const user = setupUser()
  const onChange = vi.fn()
  render(<DatePicker mode="range" aria-label="조회 기간" onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: '조회 기간' }))
  await user.click(cell('2026-08-15'))
  await user.click(cell('2026-08-10')) // 08-10 < 08-15(pending) → 방출 없이 재시작
  expect(onChange).not.toHaveBeenCalled()
  expect(cell('2026-08-10')).toHaveAttribute('aria-selected', 'true')
  expect(cell('2026-08-15')).toHaveAttribute('aria-selected', 'false')
  // 재시작 후 새 from(08-10) 기준으로 완결하면 정상 방출된다
  await user.click(cell('2026-08-20'))
  expect(onChange).toHaveBeenCalledWith(['2026-08-10', '2026-08-20'])
})

test('range: onChange가 방출하는 쌍은 항상 from <= to', async () => {
  const dates = ['2026-08-05', '2026-08-10', '2026-08-15', '2026-08-20']
  const finalizer = '2026-08-25' // 후보 날짜 어느 것보다도 늦어, 역순 재시작 후 완결을 강제한다

  for (const first of dates) {
    for (const second of dates) {
      const user = setupUser()
      const onChange = vi.fn()
      const { unmount } = render(
        <DatePicker mode="range" aria-label="조회 기간" onChange={onChange} />
      )
      const trigger = screen.getByRole('button', { name: '조회 기간' })
      await user.click(trigger)
      await user.click(cell(first))
      await user.click(cell(second))

      if (second >= first) {
        // 정순 또는 같은 날 — 즉시 완결 방출
        expect(onChange).toHaveBeenCalledTimes(1)
        const [from, to] = onChange.mock.calls[0][0] as [string, string]
        expect(from <= to).toBe(true)
        expect(from).toBe(first)
        expect(to).toBe(second)
      } else {
        // 역순 — 미방출, 세 번째 클릭(finalizer)으로 완결시켜 그 쌍도 검사한다
        expect(onChange).not.toHaveBeenCalled()
        await user.click(cell(finalizer))
        expect(onChange).toHaveBeenCalledTimes(1)
        const [from, to] = onChange.mock.calls[0][0] as [string, string]
        expect(from <= to).toBe(true)
        expect(from).toBe(second)
        expect(to).toBe(finalizer)
      }

      unmount()
    }
  }
})

test('range: from·to·사이 셀에 aria-selected=true', async () => {
  const user = setupUser()
  render(
    <DatePicker mode="range" aria-label="조회 기간" defaultValue={['2026-08-10', '2026-08-14']} />
  )
  await user.click(screen.getByRole('button', { name: '조회 기간' }))
  expect(cell('2026-08-10')).toHaveAttribute('aria-selected', 'true')
  expect(cell('2026-08-14')).toHaveAttribute('aria-selected', 'true')
  expect(cell('2026-08-12')).toHaveAttribute('aria-selected', 'true') // 사이
  expect(cell('2026-08-09')).toHaveAttribute('aria-selected', 'false') // 밖
})

test('range: 선택 진행 중 Escape로 닫으면 값이 바뀌지 않고 onChange 미방출', async () => {
  const user = setupUser()
  const onChange = vi.fn()
  render(
    <DatePicker
      mode="range"
      aria-label="조회 기간"
      defaultValue={['2026-08-05', '2026-08-09']}
      onChange={onChange}
    />
  )
  const trigger = screen.getByRole('button', { name: '조회 기간' })
  expect(trigger).toHaveTextContent('2026-08-05 ~ 2026-08-09')
  await user.click(trigger)
  await user.click(cell('2026-08-15')) // 새 선택 진행 중(아직 미완결)
  await user.keyboard('{Escape}')
  expect(onChange).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(trigger).toHaveTextContent('2026-08-05 ~ 2026-08-09') // 값 불변
})

// ── 키보드 ──────────────────────────────────────────────────

test('키보드: 방향키가 활성 셀을 일/주 단위로 이동한다', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" defaultValue="2026-08-10" />)
  await user.click(screen.getByRole('button', { name: '발행일' }))
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-10')
  await user.keyboard('{ArrowRight}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-11')
  await user.keyboard('{ArrowDown}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-18')
  await user.keyboard('{ArrowLeft}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-17')
  await user.keyboard('{ArrowUp}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-10')
})

test('키보드: 방향키 이동이 월 경계를 넘으면 월이 전환된다', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" defaultValue="2026-08-02" />)
  await user.click(screen.getByRole('button', { name: '발행일' }))
  expect(document.querySelector('td[data-date="2026-08-02"]')).not.toBeNull()
  await user.keyboard('{ArrowUp}') // -7일 → 7월로 월 전환
  expect(activeCell()).toHaveAttribute('data-date', '2026-07-26')
  // 이전 달 그리드로 바뀌었으므로 8월 셀은 더 이상 없다
  expect(document.querySelector('td[data-date="2026-08-02"]')).toBeNull()
})

test('키보드: PageUp/PageDown 월 이동, Shift+PageUp/PageDown 연 이동', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" defaultValue="2026-08-15" />)
  await user.click(screen.getByRole('button', { name: '발행일' }))
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-15')
  await user.keyboard('{PageDown}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-09-15')
  await user.keyboard('{PageUp}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-15')
  await user.keyboard('{Shift>}{PageDown}{/Shift}')
  expect(activeCell()).toHaveAttribute('data-date', '2027-08-15')
  await user.keyboard('{Shift>}{PageUp}{/Shift}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-15')
})

test('키보드: Home/End가 주의 시작/끝으로 이동', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" defaultValue="2026-08-12" />) // 수요일
  await user.click(screen.getByRole('button', { name: '발행일' }))
  await user.keyboard('{Home}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-09') // 그 주 일요일
  await user.keyboard('{End}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-15') // 그 주 토요일
})

test('키보드: min/max 밖으로는 이동하지 않는다', async () => {
  const user = setupUser()
  render(
    <DatePicker aria-label="발행일" defaultValue="2026-08-05" min="2026-08-03" max="2026-08-07" />
  )
  await user.click(screen.getByRole('button', { name: '발행일' }))
  await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-03') // min에서 멈춤
  await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}')
  expect(activeCell()).toHaveAttribute('data-date', '2026-08-07') // max에서 멈춤
})

test('키보드: Enter로 확정 — single은 닫히고 트리거로 포커스 복귀', async () => {
  const user = setupUser()
  const onChange = vi.fn()
  render(<DatePicker aria-label="발행일" defaultValue="2026-08-10" onChange={onChange} />)
  const trigger = screen.getByRole('button', { name: '발행일' })
  await user.click(trigger)
  await user.keyboard('{ArrowRight}') // 08-11
  await user.keyboard('{Enter}')
  expect(onChange).toHaveBeenCalledWith('2026-08-11')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(trigger).toHaveFocus()
})

// ── 닫기 방식 ───────────────────────────────────────────────

test('Escape로 닫히고 포커스가 트리거로 복귀', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
  const trigger = screen.getByRole('button', { name: '발행일' })
  await user.click(trigger)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(trigger).toHaveFocus()
})

test('바깥 클릭 시 닫힌다', async () => {
  const user = setupUser()
  render(
    <div>
      <DatePicker aria-label="발행일" placeholder="날짜 선택" />
      <button>바깥</button>
    </div>
  )
  await user.click(screen.getByRole('button', { name: '발행일' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '바깥' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})

// ── ARIA / 포커스 관리 ─────────────────────────────────────

test('ARIA: 트리거 haspopup=dialog/expanded, 팝업 role=dialog, grid/columnheader/gridcell 구조', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
  const trigger = screen.getByRole('button', { name: '발행일' })
  expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await user.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const dialog = screen.getByRole('dialog')
  expect(trigger).toHaveAttribute('aria-controls', dialog.id)
  expect(screen.getByRole('grid')).toBeInTheDocument()
  expect(screen.getAllByRole('columnheader')).toHaveLength(7)
  expect(screen.getAllByRole('gridcell')).toHaveLength(42) // 6행×7열, 빈 셀 포함
})

test('오늘 셀에 aria-current=date', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
  await user.click(screen.getByRole('button', { name: '발행일' }))
  expect(cell('2026-08-15')).toHaveAttribute('aria-current', 'date') // 고정된 "오늘"
})

test('열릴 때 포커스가 선택일(없으면 오늘) 셀로 이동한다', async () => {
  const user = setupUser()
  render(
    <div>
      <DatePicker aria-label="선택됨" defaultValue="2026-08-20" />
      <DatePicker aria-label="미선택" />
    </div>
  )
  await user.click(screen.getByRole('button', { name: '선택됨' }))
  expect(cell('2026-08-20')).toHaveFocus()
  await user.keyboard('{Escape}')

  await user.click(screen.getByRole('button', { name: '미선택' }))
  expect(cell('2026-08-15')).toHaveFocus() // 선택일 없음 → 오늘
})

test('Tab이 다이얼로그 안에서 순환한다', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" defaultValue="2026-08-10" />)
  await user.click(screen.getByRole('button', { name: '발행일' }))
  const prevBtn = screen.getByRole('button', { name: '이전 달' })
  const nextBtn = screen.getByRole('button', { name: '다음 달' })
  const active = activeCell()
  expect(active).toHaveFocus() // 열리면 활성 셀부터

  await user.keyboard('{Tab}')
  expect(prevBtn).toHaveFocus()
  await user.keyboard('{Tab}')
  expect(nextBtn).toHaveFocus()
  await user.keyboard('{Tab}')
  expect(active).toHaveFocus()
  await user.keyboard('{Tab}') // 다시 순환 — 이전 달로
  expect(prevBtn).toHaveFocus()
  await user.keyboard('{Shift>}{Tab}{/Shift}') // 역방향
  expect(active).toHaveFocus()
})

// ── 폼 / 상태 props ─────────────────────────────────────────

test('name 지정 시(single) hidden input이 value를 반영한다', () => {
  const { container } = render(
    <DatePicker aria-label="발행일" name="issuedAt" defaultValue="2026-08-10" />
  )
  const hidden = container.querySelector(
    'input[type="hidden"][name="issuedAt"]'
  ) as HTMLInputElement
  expect(hidden).not.toBeNull()
  expect(hidden.value).toBe('2026-08-10')
})

test('disabled면 클릭해도 열리지 않는다', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" disabled placeholder="날짜 선택" />)
  await user.click(screen.getByRole('button', { name: '발행일' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('size=xl이면 트리거와 날짜 셀에 xl 클래스가 적용된다', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" size="xl" defaultValue="2026-08-10" />)
  const trigger = screen.getByRole('button', { name: '발행일' })
  expect(trigger.className).toContain(styles.xl)
  await user.click(trigger)
  expect(cell('2026-08-10').className).toContain(styles.xl)
})

test('invalid면 aria-invalid=true', () => {
  render(<DatePicker aria-label="발행일" invalid placeholder="날짜 선택" />)
  const trigger = screen.getByRole('button', { name: '발행일' })
  expect(trigger).toHaveAttribute('aria-invalid', 'true')
  expect(trigger.className).toContain(styles.invalid)
})

// ── 월 이동 버튼 ────────────────────────────────────────────

test('월 이동 버튼: min/max 범위 밖 방향은 disabled', async () => {
  const user = setupUser()
  render(
    <DatePicker aria-label="발행일" defaultValue="2026-08-15" min="2026-08-01" max="2026-08-31" />
  )
  await user.click(screen.getByRole('button', { name: '발행일' }))
  expect(screen.getByRole('button', { name: '이전 달' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '다음 달' })).toBeDisabled()
})

test('월 이동 버튼 클릭 후 포커스는 버튼에 남는다', async () => {
  const user = setupUser()
  render(<DatePicker aria-label="발행일" defaultValue="2026-08-15" />)
  await user.click(screen.getByRole('button', { name: '발행일' }))
  const nextBtn = screen.getByRole('button', { name: '다음 달' })
  await user.click(nextBtn)
  expect(nextBtn).toHaveFocus() // 반복 클릭이 가능해야 하므로 포커스가 옮겨가지 않는다
  expect(document.querySelector('td[data-date="2026-09-15"]')).not.toBeNull() // 그리드는 다음 달로 전환됨
})

// ── 포털 좌표·flip 배치 ─────────────────────────────────────
// jsdom은 레이아웃을 계산하지 않아 getBoundingClientRect()가 전부 0을 반환한다.
// 프로토타입 스파이 + role 판별 디스패치로 트리거/팝업의 rect만 갈아끼운다
// (src/utils/useFlipPlacement.test.ts와 공유하는 표준 레시피 — 계획서 결정 6).
// 스파이·afterEach를 이 describe 안에 격리해 다른 테스트에 영향이 없게 한다.
describe('포털 좌표·flip 배치', () => {
  type RectInit = { top: number; bottom: number; left?: number; right?: number }

  const makeRect = ({ top, bottom, left = 0, right = 200 }: RectInit): DOMRect =>
    ({
      top,
      bottom,
      left,
      right,
      width: right - left,
      height: bottom - top,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect

  const setViewportHeight = (h: number) =>
    Object.defineProperty(window, 'innerHeight', { value: h, configurable: true, writable: true })

  const setViewportWidth = (w: number) =>
    Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true })

  // 요소 판별: 팝업은 role=dialog, 트리거는 aria-haspopup=dialog. 그 외는 제로-rect(판정에 안 쓰임).
  function mockRects({ trigger, popup }: { trigger: RectInit; popup: RectInit }) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      if (this.getAttribute('role') === 'dialog') return makeRect(popup)
      if (this.getAttribute('aria-haspopup') === 'dialog') return makeRect(trigger)
      return makeRect({ top: 0, bottom: 0 })
    })
  }

  // 표준 시나리오 수치 (훅·Select 테스트와 공유 — 뷰포트 높이 800 기준)
  const S1 = { trigger: { top: 100, bottom: 140 }, popup: { top: 144, bottom: 444 } } // 아래 충분
  const S2 = { trigger: { top: 600, bottom: 640 }, popup: { top: 644, bottom: 944 } } // 아래 부족·위 충분
  const S3 = { trigger: { top: 100, bottom: 140 }, popup: { top: 144, bottom: 894 } } // 둘 다 부족

  // 가로 표준 시나리오 수치 (훅·Select 테스트와 공유 — 뷰포트 폭 1000 기준, H3만 300)
  const H2 = {
    trigger: { top: 100, bottom: 140, left: 700, right: 840 },
    popup: { top: 144, bottom: 444, left: 700, right: 1060 }
  } // 오른쪽 부족(1060 > 1000)·왼쪽 충분(840 − 360 = 480 ≥ 0)
  const H3 = {
    trigger: { top: 100, bottom: 140, left: 10, right: 103 },
    popup: { top: 144, bottom: 444, left: 10, right: 370 }
  } // 뷰포트 폭 300 — 양쪽 다 부족(370 > 300 · 103 − 360 < 0)

  afterEach(() => {
    vi.restoreAllMocks()
    setViewportHeight(768)
    setViewportWidth(1024)
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })

  test('S1 — 아래 공간이 충분하면 down을 노출한다', async () => {
    const user = setupUser()
    setViewportHeight(800)
    mockRects(S1)
    render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
    await user.click(screen.getByRole('button', { name: '발행일' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement-v', 'down')
  })

  test('S2 — 아래가 부족하고 위가 충분하면 up을 노출한다', async () => {
    const user = setupUser()
    setViewportHeight(800)
    mockRects(S2)
    render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
    await user.click(screen.getByRole('button', { name: '발행일' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement-v', 'up')
  })

  test('S3 — 위·아래 둘 다 부족하면 down을 유지한다', async () => {
    const user = setupUser()
    setViewportHeight(800)
    mockRects(S3)
    render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
    await user.click(screen.getByRole('button', { name: '발행일' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement-v', 'down')
  })

  test('S4 — 닫으면 리셋되고 재오픈 시 바뀐 배치 조건으로 다시 판정한다', async () => {
    const user = setupUser()
    setViewportHeight(800)
    mockRects(S2)
    render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
    const trigger = screen.getByRole('button', { name: '발행일' })

    await user.click(trigger)
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement-v', 'up')

    await user.click(trigger) // 닫기
    expect(screen.queryByRole('dialog')).toBeNull()

    mockRects(S1) // 트리거가 화면 위쪽으로 이동한 상황
    await user.click(trigger) // 재오픈
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement-v', 'down')
  })

  test('모킹 없이(제로-rect) 열면 down — jsdom 안전성 고정', async () => {
    const user = setupUser()
    render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
    await user.click(screen.getByRole('button', { name: '발행일' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement-v', 'down')
  })

  test('H2 — 오른쪽이 부족하고 왼쪽이 충분하면 left를 노출한다', async () => {
    const user = setupUser()
    setViewportWidth(1000)
    mockRects(H2)
    render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
    await user.click(screen.getByRole('button', { name: '발행일' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement-h', 'left')
  })

  test('H3 — 양쪽 다 부족하면 right를 유지한다', async () => {
    const user = setupUser()
    setViewportWidth(300)
    mockRects(H3)
    render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)
    await user.click(screen.getByRole('button', { name: '발행일' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement-h', 'right')
  })

  test('body 좌표 style에 스크롤과 토큰 간격을 반영한다', async () => {
    const user = setupUser()
    setViewportHeight(800)
    setViewportWidth(1000)
    Object.defineProperty(window, 'scrollX', { value: 10, configurable: true })
    Object.defineProperty(window, 'scrollY', { value: 20, configurable: true })
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (name: string) => (name === '--space-1' ? '4px' : ''),
    } as CSSStyleDeclaration)
    mockRects({
      trigger: { top: 100, bottom: 140, left: 100, right: 240 },
      popup: { top: 0, bottom: 300, left: 0, right: 360 },
    })
    render(<DatePicker aria-label="발행일" placeholder="날짜 선택" />)

    await user.click(screen.getByRole('button', { name: '발행일' }))

    const popup = screen.getByRole('dialog')
    expect(popup.style.top).toBe('164px')
    expect(popup.style.left).toBe('110px')
    expect(popup.style.minWidth).toBe('')
    expect(popup.style.visibility).toBe('visible')
  })
})
