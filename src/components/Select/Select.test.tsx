import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
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

test('선택된 옵션에 aria-selected=true, 나머지는 false', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} defaultValue="busan" aria-label="도시" />)
  await user.click(screen.getByRole('combobox'))
  expect(screen.getByRole('option', { name: '부산' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('option', { name: '서울' })).toHaveAttribute('aria-selected', 'false')
})

test('title 은 마우스 진입 시에만 부여된다 (접근성 설명 중복 방지)', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  await user.click(trigger)
  const option = screen.getByRole('option', { name: '부산' })
  expect(option).not.toHaveAttribute('title')
  expect(option).not.toHaveAccessibleDescription()

  await user.hover(option)
  expect(option).toHaveAttribute('title', '부산')
  expect(option).toHaveAccessibleDescription('부산')

  await user.unhover(option)
  expect(option).not.toHaveAttribute('title')

  await user.hover(option)
  await user.click(option) // hover 상태에서 선택 → 닫힘
  await user.click(trigger) // 재오픈
  expect(screen.getByRole('option', { name: '부산' })).not.toHaveAttribute('title')
})

test('키보드 탐색으로 활성화된 옵션에는 title·접근성 설명이 없다', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  trigger.focus()
  await user.keyboard('{ArrowDown}') // open, active=서울(첫 enabled)
  await user.keyboard('{ArrowDown}') // active=부산
  const active = screen.getByRole('option', { name: '부산' })
  expect(trigger).toHaveAttribute('aria-activedescendant', active.id)
  for (const option of screen.getAllByRole('option')) {
    expect(option).not.toHaveAttribute('title')
  }
  expect(active).not.toHaveAccessibleDescription()
})

test('invalid면 aria-invalid=true + invalid 클래스', () => {
  render(<Select options={OPTS} invalid aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  expect(trigger).toHaveAttribute('aria-invalid', 'true')
  expect(trigger.className).toContain(styles.invalid)
})

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

test('name 지정 시 hidden input이 value를 반영 (폼 제출)', () => {
  const { container } = render(
    <Select options={OPTS} name="city" defaultValue="jeju" aria-label="도시" />
  )
  const hidden = container.querySelector('input[type="hidden"][name="city"]') as HTMLInputElement
  expect(hidden).not.toBeNull()
  expect(hidden.value).toBe('jeju')
})

test('disabled Select는 클릭해도 열리지 않는다', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} disabled aria-label="도시" />)
  await user.click(screen.getByRole('combobox'))
  expect(screen.queryByRole('listbox')).toBeNull()
})

test('size="xl"이면 트리거 className에 xl 클래스가 포함된다', () => {
  render(<Select options={OPTS} size="xl" aria-label="도시" />)
  const trigger = screen.getByRole('combobox')
  expect(trigger.className).toContain(styles.xl)
})

test('size="xl"로 열면 listbox className에 listboxXl 클래스가 포함된다', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} size="xl" aria-label="도시" />)
  await user.click(screen.getByRole('combobox'))
  const listbox = screen.getByRole('listbox')
  expect(listbox.className).toContain(styles.listboxXl)
})

test('size 미지정(md)으로 열면 listbox className에 listboxXl 클래스가 없다', async () => {
  const user = userEvent.setup()
  render(<Select options={OPTS} aria-label="도시" />)
  await user.click(screen.getByRole('combobox'))
  const listbox = screen.getByRole('listbox')
  expect(listbox.className).not.toContain(styles.listboxXl)
})

test('일반 문서에서는 listbox를 body 직계 자식으로 포털하고 scoped theme를 전달한다', async () => {
  const user = userEvent.setup()
  const { container } = render(
    <section data-theme="dark">
      <Select options={OPTS} aria-label="도시" />
    </section>
  )

  await user.click(screen.getByRole('combobox'))

  const listbox = screen.getByRole('listbox')
  expect(listbox.parentElement).toBe(document.body)
  expect(container).not.toContainElement(listbox)
  expect(listbox).toHaveAttribute('data-theme', 'dark')
  expect(listbox).toHaveAttribute('data-placement-v', 'down')
  expect(listbox).toHaveAttribute('data-placement-h', 'right')
})

test('native dialog 안에서는 listbox를 해당 dialog 직계 자식으로 포털한다', async () => {
  const user = userEvent.setup()
  render(
    <dialog open data-testid="portal-host">
      <div data-testid="panel">
        <div data-testid="body">
          <Select options={OPTS} aria-label="도시" />
        </div>
      </div>
    </dialog>
  )

  await user.click(screen.getByRole('combobox'))

  const host = screen.getByTestId('portal-host')
  const listbox = screen.getByRole('listbox')
  expect(listbox.parentElement).toBe(host)
  expect(screen.getByTestId('panel')).not.toContainElement(listbox)
  expect(screen.getByTestId('body')).not.toContainElement(listbox)
})

test('document가 없는 SSR 렌더에서 예외가 발생하지 않는다', () => {
  const originalDocument = globalThis.document
  Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true })
  try {
    expect(() => renderToString(<Select options={OPTS} aria-label="도시" />)).not.toThrow()
  } finally {
    Object.defineProperty(globalThis, 'document', { value: originalDocument, configurable: true })
  }
})

// --- 포털 좌표·flip 배치 (useFlipPlacement 통합) ---
// jsdom은 getBoundingClientRect()가 전부 0을 반환한다. 프로토타입 스파이 + role 기반
// 디스패치로 트리거/listbox의 rect만 갈아끼운다 (계획서 결정 6 표준 레시피).
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

  function mockRects({ trigger, popup }: { trigger: RectInit; popup: RectInit }) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      const role = this.getAttribute('role')
      if (role === 'listbox') return makeRect(popup)
      if (role === 'combobox') return makeRect(trigger)
      return makeRect({ top: 0, bottom: 0 })
    })
  }

  afterEach(() => {
    vi.restoreAllMocks()
    setViewportHeight(768) // jsdom 기본값으로 복원
    setViewportWidth(1024) // jsdom 기본값으로 복원
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })

  // 표준 시나리오 수치 (훅 테스트와 공유 — 뷰포트 높이 800 기준)
  const S1 = { trigger: { top: 100, bottom: 140 }, popup: { top: 144, bottom: 444 } } // 아래 충분
  const S2 = { trigger: { top: 600, bottom: 640 }, popup: { top: 644, bottom: 944 } } // 아래 부족·위 충분
  const S3 = { trigger: { top: 100, bottom: 140 }, popup: { top: 144, bottom: 894 } } // 둘 다 부족

  // 가로 표준 시나리오 (훅 테스트와 공유 — 뷰포트 800h × 1000w 기준, H3만 폭 300)
  const H2 = {
    trigger: { top: 100, bottom: 140, left: 700, right: 840 },
    popup: { top: 144, bottom: 444, left: 700, right: 1060 },
  } // 오른쪽 부족·왼쪽 충분
  const H3 = {
    trigger: { top: 100, bottom: 140, left: 10, right: 103 },
    popup: { top: 144, bottom: 444, left: 10, right: 370 },
  } // 양쪽 다 부족 (뷰포트 폭 300에서만 성립)

  test('S1 — 아래 공간이 충분하면 down을 노출한다', async () => {
    const user = userEvent.setup()
    setViewportHeight(800)
    mockRects(S1)
    render(<Select options={OPTS} aria-label="도시" />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.getByRole('listbox')).toHaveAttribute('data-placement-v', 'down')
  })

  test('S2 — 아래가 부족하고 위가 충분하면 up을 노출한다', async () => {
    const user = userEvent.setup()
    setViewportHeight(800)
    mockRects(S2)
    render(<Select options={OPTS} aria-label="도시" />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.getByRole('listbox')).toHaveAttribute('data-placement-v', 'up')
  })

  test('S3 — 위·아래 둘 다 부족하면 down을 유지한다', async () => {
    const user = userEvent.setup()
    setViewportHeight(800)
    mockRects(S3)
    render(<Select options={OPTS} aria-label="도시" />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.getByRole('listbox')).toHaveAttribute('data-placement-v', 'down')
  })

  test('S4 — 닫고 재오픈하면 바뀐 배치 조건으로 다시 판정한다', async () => {
    const user = userEvent.setup()
    setViewportHeight(800)
    mockRects(S2)
    render(<Select options={OPTS} aria-label="도시" />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger) // 열기 — up
    expect(screen.getByRole('listbox')).toHaveAttribute('data-placement-v', 'up')

    await user.click(trigger) // 닫기
    expect(screen.queryByRole('listbox')).toBeNull()

    mockRects(S1) // 트리거가 화면 위쪽으로 이동한 상황
    await user.click(trigger) // 재오픈 — down
    expect(screen.getByRole('listbox')).toHaveAttribute('data-placement-v', 'down')
  })

  test('모킹 없이(제로-rect) 열면 down — jsdom 안전성 고정', async () => {
    const user = userEvent.setup()
    render(<Select options={OPTS} aria-label="도시" />)

    await user.click(screen.getByRole('combobox'))

    // rect가 전부 0 → overflowsBelow = 0 > innerHeight = false → 기존 동작과 동일
    expect(screen.getByRole('listbox')).toHaveAttribute('data-placement-v', 'down')
  })

  test('H2 — 오른쪽이 부족하고 왼쪽이 충분하면 left를 노출한다', async () => {
    const user = userEvent.setup()
    setViewportWidth(1000)
    mockRects(H2)
    render(<Select options={OPTS} aria-label="도시" />)

    await user.click(screen.getByRole('combobox'))

    // 1060 > 1000(넘침) · 840 − 360 = 480 ≥ 0(왼쪽 충분)
    expect(screen.getByRole('listbox')).toHaveAttribute('data-placement-h', 'left')
  })

  test('H3 — 양쪽 다 부족하면 right를 유지한다', async () => {
    const user = userEvent.setup()
    setViewportWidth(300)
    mockRects(H3)
    render(<Select options={OPTS} aria-label="도시" />)

    await user.click(screen.getByRole('combobox'))

    // 370 > 300(넘침)이지만 103 − 360 < 0 — 왼쪽도 부족하므로 좌측 정렬 유지
    expect(screen.getByRole('listbox')).toHaveAttribute('data-placement-h', 'right')
  })

  test('body 좌표 style에 스크롤·간격과 트리거 폭 하한을 반영한다', async () => {
    const user = userEvent.setup()
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
    render(<Select options={OPTS} aria-label="도시" />)

    await user.click(screen.getByRole('combobox'))

    const listbox = screen.getByRole('listbox')
    expect(listbox.style.top).toBe('164px')
    expect(listbox.style.left).toBe('110px')
    expect(listbox.style.minWidth).toBe('140px')
    expect(listbox.style.visibility).toBe('visible')
  })
})
