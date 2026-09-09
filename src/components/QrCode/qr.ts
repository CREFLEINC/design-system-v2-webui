/**
 * QR 코드 순수 유틸 — React 무관. 인코딩(격자 만들기)과 배치(격자를 px 좌표로 옮기기)를 분리한다.
 *
 * 인코딩은 이식한 참조 구현(`./qrcodegen`)에 전부 위임하고, 이 모듈은 그 결과를
 * 그리기 좋은 형태(`boolean[][]`, SVG path 문자열)로 옮기는 일만 한다.
 * React 없이 테스트할 수 있어야 왕복(round-trip) 검증을 격자 층에서 바로 할 수 있다.
 */
import { Ecc, QrCode } from './qrcodegen'

/**
 * 격자 둘레에 반드시 남겨야 하는 밝은 여백(quiet zone)의 칸 수.
 * ISO/IEC 18004 가 요구하는 최소치가 4칸이다 — 이보다 좁으면 스캐너가 코드의 시작을 찾지 못한다.
 */
export const QUIET_ZONE = 4

/** 인코딩 결과 격자. `matrix[y][x]` 가 true 면 어두운 칸. 항상 정사각(한 변 21~177, `21 + 4k`). */
export type QrMatrix = boolean[][]

/** `layoutQr` 가 계산한 px 배치. 단위는 CSS px(= SVG user unit). */
export interface QrLayout {
  /** 그림 한 변의 길이(px). 여백을 포함한 전체 크기이자 `viewBox` 한 변. */
  side: number
  /** 칸 한 변의 길이(px). 항상 1 이상의 정수. */
  scale: number
  /** 칸 (0, 0) 의 좌상단 px 좌표. x·y 가 같으므로 하나만 둔다. */
  origin: number
}

/**
 * 값을 QR 격자로 인코딩한다. 오류정정 M 기준이며, Nayuki 기본값대로
 * 버전이 커지지 않는 범위에서 오류정정 레벨을 자동 상향(boostEcl)한다.
 * 버전(1~40)과 마스크(0~7)는 자동 선택된다.
 *
 * 담을 수 없을 만큼 값이 길면 `RangeError` 를 던진다 — 빈 그림이나 잘린 그림을 조용히
 * 그리면 "스캔은 되는데 내용이 틀린" 코드가 되어 더 나쁘다. 원인은 `cause` 로 보존한다.
 */
export function encodeQr(value: string): QrMatrix {
  let qr: QrCode
  try {
    qr = QrCode.encodeText(value, Ecc.MEDIUM)
  } catch (cause) {
    if (cause instanceof RangeError && cause.message === 'Data too long') {
      throw new RangeError(`QrCode: 값이 너무 길어 QR 코드에 담을 수 없습니다 (${value.length}자)`, { cause })
    }
    throw cause
  }

  const matrix: QrMatrix = []
  for (let y = 0; y < qr.size; y++) {
    const row: boolean[] = []
    for (let x = 0; x < qr.size; x++) row.push(qr.getModule(x, y))
    matrix.push(row)
  }
  return matrix
}

/**
 * 요청 크기(px)와 격자 칸 수로 px 배치를 계산한다.
 *
 * 규칙과 이유:
 * - 배율(`scale`)을 **내림**해 칸 한 변을 정수 px 로 맞춘다. 소수 배율이면 칸 경계가
 *   픽셀 사이에 놓여 브라우저가 회색(안티에일리어싱) 픽셀을 만들고, 그 흐린 경계가
 *   스캐너의 판독을 떨어뜨린다.
 * - 내림하고 남는 px 는 **여백이 흡수**한다. 여백을 좌우(상하) 균등하게 늘리므로
 *   여백은 항상 `QUIET_ZONE` 칸 이상이고, 격자는 그림 한가운데에 놓인다.
 * - 요청 크기가 최소 크기(칸 수 + 여백 8칸, 즉 칸 1px)보다 작거나 유한수가 아니면
 *   최소 크기로 키운다. 칸이 1px 미만이면 어차피 스캔이 불가능하므로,
 *   요청보다 커지는 쪽이 조용히 못 읽는 그림을 그리는 것보다 낫다.
 */
export function layoutQr(size: number, moduleCount: number): QrLayout {
  const total = moduleCount + 2 * QUIET_ZONE
  const side = Math.max(Number.isFinite(size) ? Math.floor(size) : 0, total)
  const scale = Math.floor(side / total)
  const origin = Math.floor((side - scale * total) / 2) + QUIET_ZONE * scale
  return { side, scale, origin }
}

/**
 * 격자를 SVG `<path>` 의 `d` 문자열로 옮긴다. 어두운 칸만 그린다.
 *
 * 한 행에서 가로로 이어진 어두운 칸을 사각형 하나로 합쳐 `M{x} {y}h{w}v{scale}h-{w}z` 를
 * 이어 붙인다. 칸마다 사각형을 그리면 경로가 수십 배로 길어지고, 인접한 사각형 사이에
 * 렌더러가 이음매를 남길 수 있다.
 *
 * 좌표는 전부 정수이고 명령은 `M/h/v/z` 뿐이다 — 이 문법은 테스트가 파싱하는 계약이므로
 * 공백·소수·다른 명령을 끼워 넣지 않는다.
 */
export function toModulePath(matrix: QrMatrix, scale: number, origin: number): string {
  let d = ''
  for (let y = 0; y < matrix.length; y++) {
    const row = matrix[y]
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x++
        continue
      }
      let end = x + 1
      while (end < row.length && row[end]) end++
      const width = (end - x) * scale
      d += `M${origin + x * scale} ${origin + y * scale}h${width}v${scale}h-${width}z`
      x = end
    }
  }
  return d
}
