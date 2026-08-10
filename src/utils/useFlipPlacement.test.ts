import { createElement, useRef, useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFlipPlacement } from './useFlipPlacement'

// --- 모킹 레시피 (Select·DatePicker 테스트와 공유하는 표준형) ---
// jsdom은 레이아웃을 계산하지 않아 getBoundingClientRect()가 전부 0을 반환한다.
// 프로토타입 스파이 + 요소 판별 디스패치로 트리거/팝업의 rect만 갈아끼운다.

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

// 요소 판별: 이 파일의 하네스는 data-testid로 디스패치한다.
// (컴포넌트 테스트는 같은 구조에서 role — listbox/dialog/combobox — 으로 판별한다.)
// 그 외 요소는 제로-rect로 남긴다 — 판정에 쓰이지 않는다.
function mockRects({ trigger, popup }: { trigger: RectInit; popup: RectInit }) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const id = this.getAttribute('data-testid')
    if (id === 'popup') return makeRect(popup)
    if (id === 'trigger') return makeRect(trigger)
    return makeRect({ top: 0, bottom: 0 })
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  setViewportHeight(768) // jsdom 기본값으로 복원
  setViewportWidth(1024) // jsdom 기본값으로 복원
})

// 표준 시나리오 수치 (세 테스트 파일 공통 — 뷰포트 높이 800 기준)
const S1 = { trigger: { top: 100, bottom: 140 }, popup: { top: 144, bottom: 444 } } // 아래 충분
const S2 = { trigger: { top: 600, bottom: 640 }, popup: { top: 644, bottom: 944 } } // 아래 부족·위 충분
const S3 = { trigger: { top: 100, bottom: 140 }, popup: { top: 144, bottom: 894 } } // 둘 다 부족

// 가로 표준 시나리오 (뷰포트 800h × 1000w 기준 — H3만 폭 300)
// 팝업 폭 360 = Select .listbox 의 max-width: var(--dialog-max-sm) 실측 상한값
const H1 = {
  trigger: { top: 100, bottom: 140, left: 100, right: 240 },
  popup: { top: 144, bottom: 444, left: 100, right: 460 },
} // 오른쪽 충분
const H2 = {
  trigger: { top: 100, bottom: 140, left: 700, right: 840 },
  popup: { top: 144, bottom: 444, left: 700, right: 1060 },
} // 오른쪽 부족·왼쪽 충분
const H3 = {
  trigger: { top: 100, bottom: 140, left: 10, right: 103 },
  popup: { top: 144, bottom: 444, left: 10, right: 370 },
} // 양쪽 다 부족 (뷰포트 폭 300에서만 성립)
const H4 = {
  trigger: { top: 600, bottom: 640, left: 700, right: 840 },
  popup: { top: 644, bottom: 944, left: 700, right: 1060 },
} // 우하단 코너 — 두 축 동시

/**
 * 하네스: 트리거 button + open일 때만 마운트되는 팝업 div.
 * 팝업이 현재 배치를 축별로 data-placement-v/data-placement-h에 노출해 단언 대상이 된다.
 * (JSX 없이 createElement를 쓰는 것은 이 파일이 `.ts`이기 때문 — utils의 cx.test.ts와 같은 확장자 규약)
 */
function Harness() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const placement = useFlipPlacement(open, triggerRef, popupRef)
  return createElement(
    'div',
    null,
    createElement(
      'button',
      { ref: triggerRef, 'data-testid': 'trigger', onClick: () => setOpen((prev) => !prev) },
      '열기',
    ),
    open &&
      createElement(
        'div',
        {
          ref: popupRef,
          'data-testid': 'popup',
          'data-placement-v': placement.vertical,
          'data-placement-h': placement.horizontal,
        },
        '팝업',
      ),
  )
}

test('S1 — 아래 공간이 충분하면 down (flip 없음)', async () => {
  const user = userEvent.setup()
  setViewportHeight(800)
  mockRects(S1)
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))

  // 444 < 800 — 넘치지 않으므로 판정은 아래 배치
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-v', 'down')
})

test('S2 — 아래가 부족하고 위가 충분하면 up으로 뒤집는다', async () => {
  const user = userEvent.setup()
  setViewportHeight(800)
  mockRects(S2)
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))

  // 944 > 800(넘침) · gap 4 · 600 − 4 − 300 = 296 ≥ 0(위 충분)
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-v', 'up')
})

test('S3 — 위·아래 둘 다 부족하면 down을 유지한다 (기존 동작 보존)', async () => {
  const user = userEvent.setup()
  setViewportHeight(800)
  mockRects(S3)
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))

  // 894 > 800(넘침)이지만 100 − 4 − 750 < 0 — 위도 부족하므로 아래 유지
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-v', 'down')
})

test('S4 — 닫으면 리셋되고 재오픈 시 바뀐 배치 조건으로 다시 판정한다', async () => {
  const user = userEvent.setup()
  setViewportHeight(800)
  mockRects(S2)
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-v', 'up')

  await user.click(screen.getByTestId('trigger')) // 닫기
  expect(screen.queryByTestId('popup')).toBeNull()

  mockRects(S1) // 트리거가 화면 위쪽으로 이동한 상황
  await user.click(screen.getByTestId('trigger')) // 재오픈
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-v', 'down')
})

test('리셋 시맨틱스 — 재오픈 시 언제나 "아래 배치 상태"를 실측한다', async () => {
  const user = userEvent.setup()
  setViewportHeight(800)
  // 실제 레이아웃을 흉내 내는 모킹: 팝업 rect가 현재 세로 배치(data-placement-v)에 따라 달라진다.
  // 트리거 top 600 / bottom 640, 팝업 높이 300, 간격 4.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const id = this.getAttribute('data-testid')
    if (id === 'trigger') return makeRect({ top: 600, bottom: 640 })
    if (id === 'popup')
      return this.getAttribute('data-placement-v') === 'up'
        ? makeRect({ top: 296, bottom: 596 }) // 위로 뒤집힌 상태의 rect
        : makeRect({ top: 644, bottom: 944 }) // 아래 배치 상태의 rect
    return makeRect({ top: 0, bottom: 0 })
  })
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-v', 'up')

  await user.click(screen.getByTestId('trigger')) // 닫기
  await user.click(screen.getByTestId('trigger')) // 재오픈

  // 닫힐 때 down으로 리셋하지 않으면 'up' 상태의 rect(bottom 596)를 재게 되어
  // 넘치지 않는다고 잘못 판정(down)하고 팝업이 화면 밖으로 되돌아간다.
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-v', 'up')
})

test('제로-rect(모킹 없는 jsdom 기본)에서는 flip이 일어나지 않는다', async () => {
  const user = userEvent.setup()
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))

  // 모든 rect가 0 → overflowsBelow = 0 > 768 = false, overflowsRight = 0 > 1024 = false
  // → 두 축 모두 기본 배치. 레이아웃과 무관한 기존 컴포넌트 테스트에 영향 없음
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-v', 'down')
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-h', 'right')
})

test('H1 — 오른쪽 공간이 충분하면 right (전환 없음)', async () => {
  const user = userEvent.setup()
  setViewportHeight(800)
  setViewportWidth(1000)
  mockRects(H1)
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))

  // 460 ≤ 1000 — 넘치지 않으므로 좌측 모서리 정렬 유지
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-h', 'right')
})

test('H2 — 오른쪽이 부족하고 왼쪽이 충분하면 left 로 전환한다', async () => {
  const user = userEvent.setup()
  setViewportHeight(800)
  setViewportWidth(1000)
  mockRects(H2)
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))

  // 1060 > 1000(넘침) · 840 − 360 = 480 ≥ 0(왼쪽 충분)
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-h', 'left')
})

test('H3 — 양쪽 다 부족하면 right 를 유지한다 (기본 유지)', async () => {
  const user = userEvent.setup()
  setViewportHeight(800)
  setViewportWidth(300)
  mockRects(H3)
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))

  // 370 > 300(넘침)이지만 103 − 360 < 0 — 왼쪽도 부족하므로 좌측 정렬 유지
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-h', 'right')
})

test('H4 — 우하단 코너에서는 up 과 left 가 동시에 걸린다 (축 독립)', async () => {
  const user = userEvent.setup()
  setViewportHeight(800)
  setViewportWidth(1000)
  mockRects(H4)
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))

  // 세로: 944 > 800(넘침) · gap 4 · 600 − 4 − 300 = 296 ≥ 0(위 충분)
  // 가로: 1060 > 1000(넘침) · 840 − 360 = 480 ≥ 0(왼쪽 충분)
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-v', 'up')
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-h', 'left')
})

test('H5 — 닫으면 가로도 리셋되고 재오픈 시 바뀐 조건으로 다시 판정한다', async () => {
  const user = userEvent.setup()
  setViewportHeight(800)
  setViewportWidth(1000)
  mockRects(H2)
  render(createElement(Harness))

  await user.click(screen.getByTestId('trigger'))
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-h', 'left')

  await user.click(screen.getByTestId('trigger')) // 닫기
  expect(screen.queryByTestId('popup')).toBeNull()

  mockRects(H1) // 트리거가 화면 왼쪽으로 이동한 상황 — 460 ≤ 1000
  await user.click(screen.getByTestId('trigger')) // 재오픈
  expect(screen.getByTestId('popup')).toHaveAttribute('data-placement-h', 'right')
})
