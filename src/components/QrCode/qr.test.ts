import { expect, test } from 'vitest'
import { decodeRaster, parseModulePath, rasterizeMatrix, rasterizeRects } from '../../test/qrDecode'
import { QUIET_ZONE, encodeQr, layoutQr, toModulePath, type QrMatrix } from './qr'

// 격자 층 왕복에 쓰는 배율. jsQR 는 배율 1(칸=1px)에서 v1 격자를 놓치므로 8로 고정한다.
const TEST_SCALE = 8

/** 한 행에서 가로로 이어진 어두운 칸 덩어리(run)의 개수 — toModulePath 가 내야 할 사각형 수와 같다. */
function countDarkRuns(matrix: QrMatrix): number {
  let runs = 0
  for (const row of matrix) {
    for (let x = 0; x < row.length; x++) {
      if (row[x] && !row[x - 1]) runs++
    }
  }
  return runs
}

// ── 왕복(격자 층) ────────────────────────────────────────────
// 인코더가 만든 격자를 그대로 래스터화해 제3자 디코더(jsQR)로 되읽는다.
// 원문이 그대로 나오면 "이 격자는 실제로 스캔된다"가 증명된다.

const ROUND_TRIP_VALUES = [
  { label: '숫자만 16자', value: '0123456789012345' },
  { label: '영숫자 모드 문자셋', value: 'HELLO WORLD 2026-09-09 $%*+-./:' },
  { label: '한글 URL(UTF-8 바이트 모드)', value: 'https://crefle.com/설비/라인-3?id=42&이름=크레플' },
  { label: '긴 ASCII URL', value: 'https://example.com/path/to/resource?query=string&another=value#fragment' },
  { label: '500자 텍스트', value: 'Lorem ipsum dolor sit amet, '.repeat(18).slice(0, 500) },
  { label: '2000자(고버전)', value: 'x'.repeat(2000) },
  { label: '1자', value: 'A' },
]

test.each(ROUND_TRIP_VALUES)('왕복(격자 층): $label 을 인코딩한 격자가 원문으로 디코드된다', ({ value }) => {
  const decoded = decodeRaster(rasterizeMatrix(encodeQr(value), TEST_SCALE, QUIET_ZONE))
  expect(decoded).toBe(value)
})

// ── 격자 형태 ────────────────────────────────────────────────

test('격자는 정사각이고 한 변이 규격 크기(21 + 4k, 21~177)다', () => {
  for (const value of ['A', 'https://crefle.com/issues/88', 'x'.repeat(500), 'x'.repeat(2000)]) {
    const matrix = encodeQr(value)
    const n = matrix.length
    expect(n).toBeGreaterThanOrEqual(21)
    expect(n).toBeLessThanOrEqual(177)
    expect((n - 21) % 4).toBe(0)
    for (const row of matrix) expect(row).toHaveLength(n)
  }
})

test('좌상단 7×7 에 파인더 패턴(테두리 어두움 / 안쪽 1칸 밝음 / 중앙 3×3 어두움)이 있다', () => {
  const matrix = encodeQr('https://crefle.com/issues/88')
  for (let y = 0; y <= 6; y++) {
    for (let x = 0; x <= 6; x++) {
      // 중심 (3, 3) 에서의 체비쇼프 거리: 0~1 중앙, 2 밝은 링, 3 바깥 테두리
      const distance = Math.max(Math.abs(x - 3), Math.abs(y - 3))
      expect({ x, y, dark: matrix[y][x] }).toEqual({ x, y, dark: distance !== 2 })
    }
  }
})

// ── 값과 격자의 대응 ─────────────────────────────────────────

test('값이 다르면 격자가 다르고, 같은 값은 항상 같은 격자를 낸다', () => {
  expect(JSON.stringify(encodeQr('a'))).not.toBe(JSON.stringify(encodeQr('b')))
  expect(JSON.stringify(encodeQr('same'))).toBe(JSON.stringify(encodeQr('same')))
})

test('빈 문자열도 유효한 입력이다 — 21×21 격자가 나오고 왕복 결과가 빈 문자열', () => {
  const matrix = encodeQr('')
  expect(matrix).toHaveLength(21)
  expect(matrix[0]).toHaveLength(21)
  expect(decodeRaster(rasterizeMatrix(matrix, TEST_SCALE, QUIET_ZONE))).toBe('')
})

test('용량을 넘는 값은 RangeError 로 막는다 — 잘린 그림을 조용히 그리지 않는다', () => {
  expect(() => encodeQr('x'.repeat(3000))).toThrow(RangeError)
  expect(() => encodeQr('x'.repeat(3000))).toThrow(/3000/)
})

// ── layoutQr 불변식 ──────────────────────────────────────────

test('layoutQr: 칸 경계가 정수 px 이고 여백이 항상 4칸 이상이다', () => {
  for (const n of [21, 25, 33, 57, 105, 177]) {
    for (let size = 1; size <= 600; size++) {
      const { side, scale, origin } = layoutQr(size, n)
      const at = `n=${n} size=${size}`
      expect(Number.isInteger(side), at).toBe(true)
      expect(Number.isInteger(scale), at).toBe(true)
      expect(Number.isInteger(origin), at).toBe(true)
      expect(scale, at).toBeGreaterThanOrEqual(1)
      expect(side, at).toBe(Math.max(size, n + 2 * QUIET_ZONE))
      // 왼쪽·위 여백과 오른쪽·아래 여백 모두 4칸 이상
      expect(origin, at).toBeGreaterThanOrEqual(QUIET_ZONE * scale)
      expect(side - (origin + n * scale), at).toBeGreaterThanOrEqual(QUIET_ZONE * scale)
    }
  }
})

test('layoutQr: 비유한수는 최소 크기로, 소수 크기는 내림한다', () => {
  expect(layoutQr(NaN, 21).side).toBe(29)
  expect(layoutQr(Infinity, 21).side).toBe(29)
  expect(layoutQr(128.9, 21).side).toBe(128)
})

// ── toModulePath 문법·왕복 ───────────────────────────────────

const PATH_SYNTAX = /^(?:M\d+ \d+h\d+v\d+h-\d+z)*$/
const PATH_VALUE = 'https://crefle.com/issues/88'

test.each([128, 256, 333])('toModulePath: size=%i 경로가 계약 문법을 지키고 칸 격자에 정렬된다', (size) => {
  const matrix = encodeQr(PATH_VALUE)
  const n = matrix.length
  const { scale, origin } = layoutQr(size, n)
  const d = toModulePath(matrix, scale, origin)

  expect(d).toMatch(PATH_SYNTAX)

  const rects = parseModulePath(d)
  expect(rects).toHaveLength(countDarkRuns(matrix))
  for (const { x, y, w, h } of rects) {
    expect([x, y, w, h].every(Number.isInteger)).toBe(true)
    expect(h).toBe(scale)
    expect(w % scale).toBe(0)
    expect((x - origin) % scale).toBe(0)
    expect((y - origin) % scale).toBe(0)
    expect(x).toBeGreaterThanOrEqual(origin)
    expect(x + w).toBeLessThanOrEqual(origin + n * scale)
  }
})

test.each([128, 256, 333])('왕복(경로 층): size=%i 경로에서 복원한 사각형이 원문으로 디코드된다', (size) => {
  const matrix = encodeQr(PATH_VALUE)
  const { side, scale, origin } = layoutQr(size, matrix.length)
  const rects = parseModulePath(toModulePath(matrix, scale, origin))
  expect(decodeRaster(rasterizeRects(rects, side))).toBe(PATH_VALUE)
})
