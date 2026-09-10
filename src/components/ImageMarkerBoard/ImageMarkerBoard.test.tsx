import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import {
  ImageMarkerBoard,
  type ImageMarker,
  type ImageMarkerBoardImage,
  type RatioPoint
} from './ImageMarkerBoard'
import styles from './ImageMarkerBoard.module.css'

// ── 픽스처 ──────────────────────────────────────────────────

const image: ImageMarkerBoardImage = { src: 'plan.png', alt: '1층 도면' }

const markers: ImageMarker[] = [
  { id: 'a', x: 0.25, y: 0.75, label: '현장 A', selected: true },
  { id: 'b', x: 0.5, y: 0.5, label: '현장 B' }
]

// jsdom에는 레이아웃이 없어 getBoundingClientRect()가 전부 0을 돌려준다.
// 좌표 변환을 검증하려면 기준면(surface) 인스턴스의 rect를 갈아끼워야 한다
// (Select/DatePicker 테스트의 rect 스파이 레시피).
const rect = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({})
  }) as DOMRect

/** 이미지의 부모가 위치 기준면(.surface)이다 */
const surfaceOf = (alt: string) =>
  screen.getByRole('img', { name: alt }).parentElement as HTMLElement

/** 기준 rect A — 마커 a(0.25, 0.75)의 중심 픽셀은 (110, 170) */
const RECT_A = rect(10, 20, 400, 200)

const expectPoint = (point: RatioPoint, x: number, y: number) => {
  expect(point.x).toBeCloseTo(x, 10)
  expect(point.y).toBeCloseTo(y, 10)
}

const markerA = () => screen.getByRole('button', { name: '현장 A' })

// ── t01~t03 렌더 ────────────────────────────────────────────

test('t01 렌더: 배경 이미지와 표식 버튼이 그려진다', () => {
  render(<ImageMarkerBoard image={image} markers={markers} />)

  expect(screen.getByRole('img', { name: '1층 도면' })).toBeInTheDocument()
  const buttons = screen.getAllByRole('button')
  expect(buttons).toHaveLength(2)
  expect(buttons[0]).toHaveAccessibleName('현장 A')
  expect(buttons[1]).toHaveAccessibleName('현장 B')
})

test('t02 좌표→스타일: 비율이 left/top 퍼센트로 풀린다', () => {
  render(<ImageMarkerBoard image={image} markers={markers} />)

  expect(markerA().style.left).toBe('25%')
  expect(markerA().style.top).toBe('75%')
})

test('t03 선택 상태: 고른 표식만 채움 클래스와 aria-pressed=true를 갖는다', () => {
  render(<ImageMarkerBoard image={image} markers={markers} />)

  const a = markerA()
  const b = screen.getByRole('button', { name: '현장 B' })
  expect(a).toHaveAttribute('aria-pressed', 'true')
  expect(a).toHaveClass(styles.selected)
  expect(b).toHaveAttribute('aria-pressed', 'false')
  expect(b).not.toHaveClass(styles.selected)
})

// ── t04~t07 놓기(픽셀 → 비율) ───────────────────────────────

test('t04 놓기: 클릭 픽셀이 비율로 변환되어 나간다', () => {
  const onPlace = vi.fn()
  render(<ImageMarkerBoard image={image} markers={markers} onPlace={onPlace} />)
  vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(RECT_A)

  fireEvent.click(screen.getByRole('img', { name: '1층 도면' }), { clientX: 210, clientY: 120 })

  expect(onPlace).toHaveBeenCalledTimes(1)
  const point = onPlace.mock.calls[0][0] as RatioPoint
  expectPoint(point, 0.5, 0.5)
  // 역산 — 비율을 다시 픽셀로 되돌리면 클릭 지점이 나온다
  expect(point.x * 400 + 10).toBeCloseTo(210, 10)
  expect(point.y * 200 + 20).toBeCloseTo(120, 10)
})

test('t05 놓기: 판 크기가 달라져도 같은 상대 위치는 같은 비율을 낸다', () => {
  const onPlace = vi.fn()
  render(<ImageMarkerBoard image={image} markers={markers} onPlace={onPlace} />)
  const img = screen.getByRole('img', { name: '1층 도면' })
  const spy = vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect')

  spy.mockReturnValue(rect(0, 0, 800, 400))
  fireEvent.click(img, { clientX: 200, clientY: 300 })
  expectPoint(onPlace.mock.calls[0][0] as RatioPoint, 0.25, 0.75)

  spy.mockReturnValue(RECT_A)
  fireEvent.click(img, { clientX: 110, clientY: 170 })
  expectPoint(onPlace.mock.calls[1][0] as RatioPoint, 0.25, 0.75)
})

test('t06 놓기: 판 밖으로 벗어난 클릭은 0~1로 clamp된다', () => {
  const onPlace = vi.fn()
  render(<ImageMarkerBoard image={image} markers={markers} onPlace={onPlace} />)
  const img = screen.getByRole('img', { name: '1층 도면' })
  vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(RECT_A)

  fireEvent.click(img, { clientX: 5, clientY: 15 })
  expectPoint(onPlace.mock.calls[0][0] as RatioPoint, 0, 0)

  fireEvent.click(img, { clientX: 450, clientY: 260 })
  expectPoint(onPlace.mock.calls[1][0] as RatioPoint, 1, 1)
})

test('t07 놓기: 크기가 0인 기준면에서는 좌표를 내보내지 않는다', () => {
  const onPlace = vi.fn()
  render(<ImageMarkerBoard image={image} markers={markers} onPlace={onPlace} />)
  vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(rect(0, 0, 0, 0))

  fireEvent.click(screen.getByRole('img', { name: '1층 도면' }), { clientX: 210, clientY: 120 })

  expect(onPlace).not.toHaveBeenCalled()
})

// ── t08 표식 클릭이 놓기로 새지 않는다 ──────────────────────

test('t08 표식 클릭은 고르기일 뿐 놓기로 새어 나가지 않는다', async () => {
  const user = userEvent.setup()
  const onPlace = vi.fn()
  const onSelect = vi.fn()
  render(
    <ImageMarkerBoard image={image} markers={markers} onPlace={onPlace} onSelect={onSelect} />
  )
  vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(RECT_A)

  await user.click(markerA())

  expect(onSelect).toHaveBeenCalledTimes(1)
  expect(onSelect).toHaveBeenCalledWith('a')
  expect(onPlace).not.toHaveBeenCalled()
})

// ── t09 읽기 전용 ───────────────────────────────────────────

test('t09 읽기 전용: 놓기·옮기기는 막히고 고르기는 살아 있다', async () => {
  const user = userEvent.setup()
  const onPlace = vi.fn()
  const onSelect = vi.fn()
  const onMove = vi.fn()
  render(
    <ImageMarkerBoard
      image={image}
      markers={markers}
      readOnly
      onPlace={onPlace}
      onSelect={onSelect}
      onMove={onMove}
    />
  )
  vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(RECT_A)

  fireEvent.click(screen.getByRole('img', { name: '1층 도면' }), { clientX: 210, clientY: 120 })
  expect(onPlace).not.toHaveBeenCalled()

  const a = markerA()
  await user.click(a)
  expect(onSelect).toHaveBeenCalledWith('a')

  // 화살표는 preventDefault조차 하지 않는다 — 기본 스크롤을 남긴다
  expect(fireEvent.keyDown(a, { key: 'ArrowRight' })).toBe(true)
  expect(onMove).not.toHaveBeenCalled()

  fireEvent.pointerDown(a, { pointerId: 1, button: 0, clientX: 110, clientY: 170 })
  fireEvent.pointerMove(a, { pointerId: 1, clientX: 210, clientY: 170 })
  expect(onMove).not.toHaveBeenCalled()
})

// ── t10~t13 키보드 이동 ─────────────────────────────────────

test('t10 키보드: 화살표 4방향으로 기본 단위만큼 민다', async () => {
  const user = userEvent.setup()
  const onMove = vi.fn()
  render(<ImageMarkerBoard image={image} markers={markers} onMove={onMove} />)

  const a = markerA()
  a.focus()

  await user.keyboard('{ArrowRight}')
  expect(onMove.mock.calls[0][0]).toBe('a')
  expectPoint(onMove.mock.calls[0][1] as RatioPoint, 0.26, 0.75)

  await user.keyboard('{ArrowLeft}')
  expectPoint(onMove.mock.calls[1][1] as RatioPoint, 0.24, 0.75)

  await user.keyboard('{ArrowUp}')
  expectPoint(onMove.mock.calls[2][1] as RatioPoint, 0.25, 0.74)

  await user.keyboard('{ArrowDown}')
  expectPoint(onMove.mock.calls[3][1] as RatioPoint, 0.25, 0.76)

  // 화살표는 기본 동작(스크롤)을 막는다
  expect(fireEvent.keyDown(a, { key: 'ArrowRight' })).toBe(false)
})

test('t11 키보드: step으로 이동 단위를 바꾼다', () => {
  const onMove = vi.fn()
  render(<ImageMarkerBoard image={image} markers={markers} step={0.1} onMove={onMove} />)

  fireEvent.keyDown(markerA(), { key: 'ArrowRight' })

  expectPoint(onMove.mock.calls[0][1] as RatioPoint, 0.35, 0.75)
})

test('t12 키보드: 가장자리에서 clamp되고 변화가 없으면 호출하지 않는다', () => {
  const onMove = vi.fn()
  const { rerender } = render(
    <ImageMarkerBoard
      image={image}
      markers={[{ id: 'a', x: 1, y: 0.5, label: '현장 A' }]}
      onMove={onMove}
    />
  )

  fireEvent.keyDown(markerA(), { key: 'ArrowRight' })
  expect(onMove).not.toHaveBeenCalled()

  rerender(
    <ImageMarkerBoard
      image={image}
      markers={[{ id: 'a', x: 0.995, y: 0.5, label: '현장 A' }]}
      onMove={onMove}
    />
  )
  fireEvent.keyDown(markerA(), { key: 'ArrowRight' })
  expect(onMove).toHaveBeenCalledTimes(1)
  expect((onMove.mock.calls[0][1] as RatioPoint).x).toBe(1)
})

test('t13 키보드 이동은 라이브 리전으로 안내된다', () => {
  const { container } = render(
    <ImageMarkerBoard image={image} markers={markers} onMove={vi.fn()} />
  )

  const live = container.querySelector('[aria-live="polite"]')
  expect(live).toBeInTheDocument()
  expect(live).toHaveTextContent('')

  fireEvent.keyDown(markerA(), { key: 'ArrowRight' })

  expect(live).toHaveTextContent('현장 A: 가로 26%, 세로 75%')
})

// ── t14 접근성 이름·설명 ────────────────────────────────────

test('t14 접근성: 표식의 이름은 label, 설명은 위치다', () => {
  render(<ImageMarkerBoard image={image} markers={markers} />)

  expect(markerA()).toHaveAccessibleName('현장 A')
  expect(markerA()).toHaveAccessibleDescription('가로 25%, 세로 75%')
  expect(screen.getByRole('group', { name: '이미지 표식 판' })).toBeInTheDocument()
})

test('t14 접근성: 판의 aria-label은 소비자 값이 이긴다', () => {
  render(<ImageMarkerBoard image={image} markers={markers} aria-label="도면 표식" />)

  expect(screen.getByRole('group', { name: '도면 표식' })).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: '이미지 표식 판' })).toBeNull()
})

// ── t15~t17 드래그 ──────────────────────────────────────────

test('t15 드래그: 임계값을 넘은 뒤부터 옮기고, 끝난 뒤 click 한 번을 삼킨다', () => {
  const onMove = vi.fn()
  const onSelect = vi.fn()
  render(
    <ImageMarkerBoard image={image} markers={markers} onMove={onMove} onSelect={onSelect} />
  )
  vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(RECT_A)

  const a = markerA()
  fireEvent.pointerDown(a, { pointerId: 1, button: 0, clientX: 110, clientY: 170 })

  fireEvent.pointerMove(a, { pointerId: 1, clientX: 111, clientY: 170 })
  expect(onMove).not.toHaveBeenCalled()

  fireEvent.pointerMove(a, { pointerId: 1, clientX: 210, clientY: 170 })
  expect(onMove).toHaveBeenCalledTimes(1)
  expect(onMove.mock.calls[0][0]).toBe('a')
  expectPoint(onMove.mock.calls[0][1] as RatioPoint, 0.5, 0.75)

  fireEvent.pointerUp(a, { pointerId: 1 })

  fireEvent.click(a)
  expect(onSelect).not.toHaveBeenCalled()

  // 억제는 1회성이다 — 다음 클릭은 정상 고르기다
  fireEvent.click(a)
  expect(onSelect).toHaveBeenCalledTimes(1)
  expect(onSelect).toHaveBeenCalledWith('a')
})

test('t16 드래그 중 판이 리사이즈되면 최신 크기로 계산한다', () => {
  const onMove = vi.fn()
  render(<ImageMarkerBoard image={image} markers={markers} onMove={onMove} />)
  const spy = vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(RECT_A)

  const a = markerA()
  fireEvent.pointerDown(a, { pointerId: 1, button: 0, clientX: 110, clientY: 170 })
  fireEvent.pointerMove(a, { pointerId: 1, clientX: 210, clientY: 170 })
  expectPoint(onMove.mock.calls[0][1] as RatioPoint, 0.5, 0.75)

  spy.mockReturnValue(rect(0, 0, 800, 400))
  fireEvent.pointerMove(a, { pointerId: 1, clientX: 400, clientY: 300 })

  expect(onMove).toHaveBeenCalledTimes(2)
  expectPoint(onMove.mock.calls[1][1] as RatioPoint, 0.5, 0.75)
})

test('t17 pointercancel 뒤의 클릭은 삼키지 않는다', () => {
  const onSelect = vi.fn()
  render(<ImageMarkerBoard image={image} markers={markers} onMove={vi.fn()} onSelect={onSelect} />)
  vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(RECT_A)

  const a = markerA()
  fireEvent.pointerDown(a, { pointerId: 1, button: 0, clientX: 110, clientY: 170 })
  fireEvent.pointerMove(a, { pointerId: 1, clientX: 210, clientY: 170 })
  fireEvent.pointerCancel(a, { pointerId: 1 })

  fireEvent.click(a)
  expect(onSelect).toHaveBeenCalledTimes(1)
  expect(onSelect).toHaveBeenCalledWith('a')
})

// 터치 드래그 뒤에는 브라우저가 click을 쏘지 않는다. 그때 억제가 잔류하면 다음 입력을
// 삼키는데, 그 다음 입력이 포인터가 아니라 키보드면 pointerdown 경로로도 해제되지 않는다.
test('t23 드래그 뒤 click이 오지 않아도 «그 표식»의 키보드 선택은 살아 있다', () => {
  const onSelect = vi.fn()
  render(<ImageMarkerBoard image={image} markers={markers} onMove={vi.fn()} onSelect={onSelect} />)
  vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(RECT_A)

  const a = markerA()
  fireEvent.pointerDown(a, { pointerId: 1, pointerType: 'touch', clientX: 110, clientY: 170 })
  fireEvent.pointerMove(a, { pointerId: 1, pointerType: 'touch', clientX: 210, clientY: 170 })
  fireEvent.pointerUp(a, { pointerId: 1, pointerType: 'touch' })
  // 여기서 click이 오지 않는다 — 터치 드래그 뒤 브라우저 동작. 억제가 잔류한다.

  // 같은 표식을 키보드로 활성화한다. pointerdown 경로를 타지 않으므로 억제를 지우는
  // 유일한 통로가 keydown이다.
  a.focus()
  fireEvent.keyDown(a, { key: 'Enter' })
  fireEvent.click(a)

  expect(onSelect).toHaveBeenCalledTimes(1)
  expect(onSelect).toHaveBeenCalledWith('a')
})

test('t24 억제는 드래그한 표식에만 걸린다 — 다른 표식의 포인터 클릭은 통과한다', () => {
  const onSelect = vi.fn()
  render(<ImageMarkerBoard image={image} markers={markers} onMove={vi.fn()} onSelect={onSelect} />)
  vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(RECT_A)

  const a = markerA()
  fireEvent.pointerDown(a, { pointerId: 1, button: 0, clientX: 110, clientY: 170 })
  fireEvent.pointerMove(a, { pointerId: 1, clientX: 210, clientY: 170 })
  fireEvent.pointerUp(a, { pointerId: 1 })

  fireEvent.click(screen.getByRole('button', { name: '현장 B' }))
  expect(onSelect).toHaveBeenCalledTimes(1)
  expect(onSelect).toHaveBeenCalledWith('b')
})

// toRatio 와 같은 불변식 — 밖으로 나가는 좌표에 NaN 을 섞지 않는다.
test('t25 step이 유한수가 아니면 옮기지 않는다 — NaN 좌표를 내보내지 않는다', () => {
  const onMove = vi.fn()
  const { rerender } = render(
    <ImageMarkerBoard image={image} markers={markers} onMove={onMove} step={Number('abc')} />
  )
  const a = markerA()
  a.focus()
  fireEvent.keyDown(a, { key: 'ArrowRight' })
  expect(onMove).not.toHaveBeenCalled()

  rerender(
    <ImageMarkerBoard image={image} markers={markers} onMove={onMove} step={Number.POSITIVE_INFINITY} />
  )
  fireEvent.keyDown(markerA(), { key: 'ArrowUp' })
  expect(onMove).not.toHaveBeenCalled()

  // 유한수면 정상 동작한다
  rerender(<ImageMarkerBoard image={image} markers={markers} onMove={onMove} step={0.1} />)
  fireEvent.keyDown(markerA(), { key: 'ArrowRight' })
  expect(onMove).toHaveBeenCalledTimes(1)
  expectPoint(onMove.mock.calls[0][1] as RatioPoint, 0.35, 0.75)
})

// ── t18~t20 이미지·빈 상태 ──────────────────────────────────

test('t18 이미지를 바꿔도 표식은 같은 상대 위치에 남는다', () => {
  const { rerender } = render(<ImageMarkerBoard image={image} markers={markers} />)

  rerender(
    <ImageMarkerBoard image={{ src: 'b.png', alt: '2층 도면' }} markers={markers} />
  )

  expect(screen.getByRole('img', { name: '2층 도면' })).toBeInTheDocument()
  expect(markerA().style.left).toBe('25%')
  expect(markerA().style.top).toBe('75%')
})

test('t19 빈 상태: 이미지가 없으면 안내만 그리고 표식·놓기가 없다', () => {
  const onPlace = vi.fn()
  render(
    <ImageMarkerBoard markers={markers} emptyContent="도면을 업로드하세요" onPlace={onPlace} />
  )

  expect(screen.queryByRole('img')).toBeNull()
  const empty = screen.getByText('도면을 업로드하세요')
  expect(empty).toBeInTheDocument()
  expect(screen.queryAllByRole('button')).toHaveLength(0)

  fireEvent.click(empty, { clientX: 100, clientY: 100 })
  expect(onPlace).not.toHaveBeenCalled()
})

test('t20 배경 이미지는 브라우저 기본 드래그를 하지 않는다', () => {
  render(<ImageMarkerBoard image={image} markers={markers} />)

  expect(screen.getByRole('img', { name: '1층 도면' })).toHaveAttribute('draggable', 'false')
})

// ── t21 rest 전달·소비자 핸들러 비삼김 ──────────────────────

test('t21 rest·className은 루트로 가고 소비자 onClick은 삼켜지지 않는다', () => {
  const rootClick = vi.fn()
  const onPlace = vi.fn()
  const { container } = render(
    <ImageMarkerBoard
      image={image}
      markers={markers}
      onPlace={onPlace}
      className="custom"
      data-x="1"
      onClick={rootClick}
    />
  )
  const root = container.firstChild as HTMLElement
  expect(root).toHaveClass('custom')
  expect(root.getAttribute('data-x')).toBe('1')

  vi.spyOn(surfaceOf('1층 도면'), 'getBoundingClientRect').mockReturnValue(RECT_A)

  fireEvent.click(screen.getByRole('img', { name: '1층 도면' }), { clientX: 210, clientY: 120 })
  expect(rootClick).toHaveBeenCalledTimes(1)
  expect(onPlace).toHaveBeenCalledTimes(1)

  // 표식 클릭도 소비자 루트 핸들러에는 도달한다 — 놓기만 걸러진다
  fireEvent.click(markerA())
  expect(rootClick).toHaveBeenCalledTimes(2)
  expect(onPlace).toHaveBeenCalledTimes(1)
})

// ── t22 SSR ─────────────────────────────────────────────────

test('t22 SSR: document가 없는 환경에서도 렌더가 throw하지 않는다', () => {
  const originalDocument = globalThis.document
  Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true })
  try {
    expect(() =>
      renderToString(<ImageMarkerBoard image={image} markers={markers} />)
    ).not.toThrow()
  } finally {
    Object.defineProperty(globalThis, 'document', { value: originalDocument, configurable: true })
  }
})
