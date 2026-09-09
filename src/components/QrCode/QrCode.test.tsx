import { describe, expect, test, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { QrCode } from './QrCode'
import { encodeQr } from './qr'
import { decodeRaster, parseModulePath, rasterizeRects } from '../../test/qrDecode'
import styles from './QrCode.module.css'

test('접근성 — role=img, alt가 접근성 이름, title은 두지 않는다', () => {
  render(<QrCode value="https://crefle.com" alt="크레플 링크" />)
  const el = screen.getByRole('img', { name: '크레플 링크' })
  expect(el.tagName.toLowerCase()).toBe('svg')
  expect(el).toHaveAccessibleName('크레플 링크')
  expect(el).not.toHaveAccessibleDescription()
  expect(el).not.toHaveAttribute('title')
})

test('크기 — size가 width/height/viewBox에 반영되고, 최소 크기 미만은 격자+여백 크기로 커진다', () => {
  const value = 'https://crefle.com'
  const { container: c1 } = render(<QrCode value={value} alt="a" size={256} />)
  const svg1 = c1.querySelector('svg') as SVGSVGElement
  expect(svg1.getAttribute('width')).toBe('256')
  expect(svg1.getAttribute('height')).toBe('256')
  expect(svg1.getAttribute('viewBox')).toBe('0 0 256 256')

  const { container: c2 } = render(<QrCode value={value} alt="a" size={10} />)
  const svg2 = c2.querySelector('svg') as SVGSVGElement
  const minSide = String(encodeQr(value).length + 8)
  expect(svg2.getAttribute('width')).toBe(minSide)

  const { container: c3 } = render(<QrCode value={value} alt="a" />)
  const svg3 = c3.querySelector('svg') as SVGSVGElement
  expect(svg3.getAttribute('width')).toBe('128')
})

describe('여백·정수 정렬(구조) — svg 속성과 path 파싱 결과만으로 확인(layoutQr 미사용)', () => {
  test.each([128, 200, 256, 333, 400])('size=%i', (size) => {
    const value = 'https://crefle.com/issues/88'
    const { container } = render(<QrCode value={value} alt="a" size={size} />)
    const svg = container.querySelector('svg') as SVGSVGElement
    const path = container.querySelector('path') as SVGPathElement
    const rect = container.querySelector('rect') as SVGRectElement
    const side = Number(svg.getAttribute('width'))
    const rects = parseModulePath(path.getAttribute('d') ?? '')
    const scale = Math.min(...rects.map((r) => r.h))

    for (const r of rects) {
      expect(Number.isInteger(r.x)).toBe(true)
      expect(Number.isInteger(r.y)).toBe(true)
      expect(Number.isInteger(r.w)).toBe(true)
      expect(Number.isInteger(r.h)).toBe(true)
      expect(r.h).toBe(scale)
      expect(r.w % scale).toBe(0)
    }

    const minX = Math.min(...rects.map((r) => r.x))
    const minY = Math.min(...rects.map((r) => r.y))
    const maxX = Math.max(...rects.map((r) => r.x + r.w))
    const maxY = Math.max(...rects.map((r) => r.y + r.h))

    for (const r of rects) {
      expect((r.x - minX) % scale).toBe(0)
      expect((r.y - minY) % scale).toBe(0)
    }

    expect(minX).toBeGreaterThanOrEqual(4 * scale)
    expect(minY).toBeGreaterThanOrEqual(4 * scale)
    expect(side - maxX).toBeGreaterThanOrEqual(4 * scale)
    expect(side - maxY).toBeGreaterThanOrEqual(4 * scale)

    expect(rect.getAttribute('width')).toBe(String(side))
    expect(rect.getAttribute('height')).toBe(String(side))
  })
})

describe('왕복(DOM 층) — 렌더된 path를 되읽어 원문이 나온다', () => {
  const values = ['https://crefle.com/issues/88', 'https://crefle.com/설비/라인-3?id=42', '0123456789012345']
  const sizes = [400, 333]
  for (const value of values) {
    for (const size of sizes) {
      test(`value=${JSON.stringify(value)} size=${size}`, () => {
        const { container } = render(<QrCode value={value} alt="a" size={size} />)
        const svg = container.querySelector('svg') as SVGSVGElement
        const path = container.querySelector('path') as SVGPathElement
        const side = Number(svg.getAttribute('width'))
        const rects = parseModulePath(path.getAttribute('d') ?? '')
        expect(decodeRaster(rasterizeRects(rects, side))).toBe(value)
      })
    }
  }
})

test('값 변경 — rerender로 값이 바뀌면 path가 달라지고 새 값으로 디코드된다', () => {
  const size = 400
  const { container, rerender } = render(<QrCode value="https://crefle.com/a" alt="a" size={size} />)
  const svg = container.querySelector('svg') as SVGSVGElement
  const path = container.querySelector('path') as SVGPathElement
  const d1 = path.getAttribute('d')

  rerender(<QrCode value="https://crefle.com/b" alt="a" size={size} />)
  const d2 = path.getAttribute('d')
  expect(d2).not.toBe(d1)

  const side = Number(svg.getAttribute('width'))
  const rects = parseModulePath(d2 ?? '')
  expect(decodeRaster(rasterizeRects(rects, side))).toBe('https://crefle.com/b')
})

test('대비 고정 — 다크 테마 스코프 안에서도 고정 흑백과 crispEdges를 유지한다', () => {
  const { container } = render(
    <div data-theme="dark">
      <QrCode value="https://crefle.com" alt="a" />
    </div>
  )
  const svg = container.querySelector('svg') as SVGSVGElement
  const rect = container.querySelector('rect') as SVGRectElement
  const path = container.querySelector('path') as SVGPathElement
  expect(rect.getAttribute('fill')).toBe('#ffffff')
  expect(path.getAttribute('fill')).toBe('#000000')
  expect(svg.getAttribute('shape-rendering')).toBe('crispEdges')
})

test('rest·소유 속성 — className/data-testid/style은 전달되고, role/aria-label은 컴포넌트 것이 이긴다', () => {
  const { container } = render(
    <QrCode
      value="https://crefle.com"
      alt="크레플"
      className="custom"
      data-testid="qr"
      style={{ opacity: 0.5 }}
      {...({ role: 'presentation', 'aria-label': 'x' } as Record<string, unknown>)}
    />
  )
  const svg = container.querySelector('svg') as SVGSVGElement
  expect(svg.getAttribute('class')).toContain('custom')
  expect(svg.getAttribute('class')).toContain(styles.root)
  expect(svg.getAttribute('data-testid')).toBe('qr')
  expect(svg.style.opacity).toBe('0.5')
  expect(svg.getAttribute('role')).toBe('img')
  expect(svg.getAttribute('aria-label')).toBe('크레플')
})

test('ref — svg 루트로 전달된다', () => {
  const ref = createRef<SVGSVGElement>()
  render(<QrCode ref={ref} value="https://crefle.com" alt="a" />)
  expect(ref.current).toBeInstanceOf(SVGSVGElement)
})

test('용량 초과 — RangeError를 던진다', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<QrCode value={'x'.repeat(3000)} alt="x" />)).toThrow(RangeError)
  spy.mockRestore()
})
