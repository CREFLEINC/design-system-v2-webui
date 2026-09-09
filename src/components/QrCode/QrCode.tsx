import { forwardRef, useMemo, type SVGAttributes } from 'react'
import { cx } from '../../utils/cx'
import { encodeQr, layoutQr, toModulePath } from './qr'
import styles from './QrCode.module.css'

export interface QrCodeProps
  extends Omit<SVGAttributes<SVGSVGElement>, 'children' | 'width' | 'height' | 'viewBox' | 'role' | 'aria-label'> {
  /** 그림에 담을 글(UTF-8). 바뀌면 다시 인코딩된다. 담을 수 없을 만큼 길면 RangeError(오류정정 M 기준 약 2.3KB) */
  value: string
  /** 한 변 px(여백 포함). 칸이 정수 px가 되도록 배율을 내림하고 남는 px는 여백에 흡수. 격자 최소 크기(칸 수+8) 미만이면 그 크기로 렌더. 기본 128 */
  size?: number
  /** 스크린리더가 읽을 대체 텍스트(role="img"의 이름). 그림은 낭독 불가이므로 필수 */
  alt: string
}

const DEFAULT_SIZE = 128
// 기계 판독용 — 테마 토큰을 따르지 않는다(이슈 #88). 다크 테마에서 토큰을 따르면 대비가
// 무너져 스캔 실패. 관례: docs/component-conventions.md '색 토큰'
const DARK = '#000000'
const LIGHT = '#ffffff'

export const QrCode = forwardRef<SVGSVGElement, QrCodeProps>(function QrCode(
  { value, size = DEFAULT_SIZE, alt, className, ...rest },
  ref
) {
  const matrix = useMemo(() => encodeQr(value), [value])
  const { side, scale, origin } = layoutQr(size, matrix.length)
  const d = useMemo(() => toModulePath(matrix, scale, origin), [matrix, scale, origin])

  return (
    <svg
      {...rest}
      ref={ref}
      className={cx(styles.root, className)}
      width={side}
      height={side}
      viewBox={`0 0 ${side} ${side}`}
      role="img"
      aria-label={alt}
      shapeRendering="crispEdges"
    >
      <rect width={side} height={side} fill={LIGHT} />
      <path d={d} fill={DARK} />
    </svg>
  )
})
