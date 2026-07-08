import { forwardRef, type HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'
import { resolveTone, clampValue, toPercent, type ProgressTone, type ThresholdStop } from './Progress'
import styles from './Progress.module.css'

export type GaugeSize = 'sm' | 'md' | 'lg'

export interface GaugeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  value?: number
  min?: number
  max?: number
  /** SVG width/height(px)로 매핑 (sm 48 / md 72 / lg 96) */
  size?: GaugeSize
  /** stroke 두께(px). 미지정 시 size로 파생 (sm 4 / md 6 / lg 8). */
  thickness?: number
  tone?: ProgressTone
  thresholds?: ThresholdStop[]
  valueText?: string
  label?: string
  /** 중앙 숫자 라벨 (기본 true, aria-hidden). */
  showValue?: boolean
}

/** size → SVG 박스 크기(px) / 기본 stroke 두께(px). CSS px-0/1/2 규칙을 건드리지 않도록 TSX 숫자 상수로 유지. */
const GAUGE_DIMENSIONS: Record<GaugeSize, { box: number; thickness: number }> = {
  sm: { box: 48, thickness: 4 },
  md: { box: 72, thickness: 6 },
  lg: { box: 96, thickness: 8 },
}

export const Gauge = forwardRef<HTMLDivElement, GaugeProps>(function Gauge(
  {
    value,
    min = 0,
    max = 100,
    size = 'md',
    thickness,
    tone = 'primary',
    thresholds,
    valueText,
    label,
    showValue = true,
    className,
    ...rest
  },
  ref
) {
  const dimensions = GAUGE_DIMENSIONS[size]
  const strokeWidth = thickness ?? dimensions.thickness
  const box = dimensions.box
  const center = box / 2
  const r = (box - strokeWidth) / 2
  const circumference = 2 * Math.PI * r

  const clamped = clampValue(value, min, max)
  const percent = toPercent(clamped, min, max)
  const resolvedTone = resolveTone(percent, tone, thresholds)
  const dashOffset = circumference * (1 - percent / 100)

  return (
    <div
      {...rest}
      ref={ref}
      role="progressbar"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
      {...(valueText !== undefined ? { 'aria-valuetext': valueText } : {})}
      {...(label ? { 'aria-label': label } : {})}
      className={cx(styles.gaugeRoot, className)}
    >
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden="true">
        <circle
          className={styles['track-ring']}
          cx={center}
          cy={center}
          r={r}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className={cx(styles.arc, styles['arc-' + resolvedTone])}
          cx={center}
          cy={center}
          r={r}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      {showValue && (
        <span className={styles.value} aria-hidden="true">
          {Math.round(clamped)}
        </span>
      )}
    </div>
  )
})
