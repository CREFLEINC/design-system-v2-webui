/**
 * QR 왕복(round-trip) 검증용 테스트 전용 헬퍼 — 제품 코드에서 import 하지 않는다.
 *
 * 우리가 만든 격자/경로를 **제3자 디코더**(jsQR)로 되읽어 원문이 그대로 나오는지 본다.
 * 정답 그림과 칸 단위로 비교하는 스냅샷은 쓰지 않는다 — 마스크 선택은 인코더의 재량이라
 * 같은 값도 다른 격자가 나올 수 있고, 그런 시험은 "스캔되는가"를 증명하지 못한다.
 *
 * `src/test/` 는 라이브러리 빌드(`vite.config.ts` 의 dts exclude)와 번들 진입점
 * (`src/index.ts`) 어디에도 들어가지 않으므로 jsQR 는 런타임 의존성이 되지 않는다.
 */
import jsQR from 'jsqr'
import type { QrMatrix } from '../components/QrCode/qr'

// jsqr 는 CJS(UMD) 패키지다. 번들러·러너의 default 인터롭이 어긋나면 네임스페이스 객체가
// 들어오므로, 함수가 아니면 .default 를 꺼내 쓴다.
const decode: typeof jsQR = typeof jsQR === 'function' ? jsQR : (jsQR as unknown as { default: typeof jsQR }).default

/** RGBA 픽셀 버퍼. jsQR 가 그대로 받는 형태(`ImageData` 와 같은 레이아웃). */
export interface Raster {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** `<path d>` 에서 파싱한 사각형 하나. 단위는 SVG user unit(= CSS px). */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** 흰(255) 배경으로 채운 RGBA 버퍼를 만든다. 알파는 항상 255. */
function blankRaster(width: number, height: number): Raster {
  const data = new Uint8ClampedArray(width * height * 4)
  data.fill(255)
  return { data, width, height }
}

/** 버퍼의 사각 영역을 검정(0)으로 칠한다. 알파는 건드리지 않는다(255 유지). */
function fillBlack(raster: Raster, x: number, y: number, w: number, h: number): void {
  if (x < 0 || y < 0 || x + w > raster.width || y + h > raster.height) {
    throw new RangeError(
      `qrDecode: 사각형이 래스터 밖으로 나갔습니다 — rect(${x}, ${y}, ${w}, ${h}) vs ${raster.width}×${raster.height}`
    )
  }
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      const i = (row * raster.width + col) * 4
      raster.data[i] = 0
      raster.data[i + 1] = 0
      raster.data[i + 2] = 0
    }
  }
}

/**
 * 격자를 RGBA 이미지로 래스터화한다 — 어두운 칸은 검정, 나머지와 여백은 흰색.
 * `quiet` 는 둘레에 둘 여백 칸 수, `scale` 은 칸 한 변의 픽셀 수다.
 * jsQR 는 배율 1(칸=1px)에서 v1 격자를 놓치므로 테스트는 배율 8을 쓴다.
 */
export function rasterizeMatrix(matrix: QrMatrix, scale: number, quiet: number): Raster {
  const side = (matrix.length + 2 * quiet) * scale
  const raster = blankRaster(side, side)
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x]) fillBlack(raster, (quiet + x) * scale, (quiet + y) * scale, scale, scale)
    }
  }
  return raster
}

/**
 * `parseModulePath` 로 얻은 사각형들을 `side × side` 흰 배경 위에 검정으로 채운다.
 * 렌더 층(원점·배율·전치)까지 통과한 결과를 되읽기 위한 것이라 좌표를 보정하지 않는다.
 */
export function rasterizeRects(rects: Rect[], side: number): Raster {
  const raster = blankRaster(side, side)
  for (const rect of rects) fillBlack(raster, rect.x, rect.y, rect.w, rect.h)
  return raster
}

// `toModulePath` 가 내는 문법 그대로. 소수·다른 명령·여분의 공백을 모두 거른다.
const PATH_SYNTAX = /^(?:M\d+ \d+h\d+v\d+h-\d+z)*$/
const PATH_RECT = /M(\d+) (\d+)h(\d+)v(\d+)h-(\d+)z/g

/**
 * `<path d>` 를 사각형 목록으로 되돌린다. 문법이 계약(`^(M\d+ \d+h\d+v\d+h-\d+z)*$`)에서
 * 벗어나면 던진다 — 파서가 조용히 일부만 읽으면 왕복 테스트가 통과해도 의미가 없다.
 */
export function parseModulePath(d: string): Rect[] {
  if (!PATH_SYNTAX.test(d)) {
    throw new SyntaxError(`parseModulePath: 경로 문법 위반 — ${JSON.stringify(d.slice(0, 120))}`)
  }
  const rects: Rect[] = []
  for (const match of d.matchAll(PATH_RECT)) {
    const [, x, y, w, h, back] = match
    if (back !== w) {
      throw new SyntaxError(`parseModulePath: 닫는 h 폭이 여는 h 와 다릅니다 — h${w} … h-${back}`)
    }
    rects.push({ x: Number(x), y: Number(y), w: Number(w), h: Number(h) })
  }
  return rects
}

/** 래스터를 jsQR 로 디코드해 원문을 돌려준다. 읽지 못하면 null. */
export function decodeRaster(raster: Raster): string | null {
  return decode(raster.data, raster.width, raster.height)?.data ?? null
}
