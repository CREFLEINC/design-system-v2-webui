import { forwardRef, type HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'
import styles from './Progress.module.css'

export type ProgressTone = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'idle'
export type ProgressSize = 'sm' | 'md'

/** value < upTo → 이 tone. 오름차순으로 평가, 첫 매치가 승리, 없으면 tone으로 폴백. */
export interface ThresholdStop {
  upTo: number
  tone: ProgressTone
}

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** 0–100 (또는 min/max 스케일). indeterminate면 무시. */
  value?: number
  /** 진행량을 모를 때. valuenow 생략 + 감속 가능한 애니메이션 sliver. (linear 전용) */
  indeterminate?: boolean
  min?: number
  max?: number
  size?: ProgressSize
  tone?: ProgressTone
  thresholds?: ThresholdStop[]
  /** aria-valuetext (스크린리더 낭독 문자열). indeterminate에도 사용 가능. */
  valueText?: string
  /** 접근 이름. 미지정 시 aria-labelledby/aria-label을 rest로 전달. */
  label?: string
  /** 트랙 끝에 "NN%" 텍스트 표시 (시각용, aria-hidden). */
  showValue?: boolean
}

/** thresholds를 오름차순 정렬한 사본에서 percent < upTo인 첫 stop을 찾는다. 없으면 tone 폴백. */
export function resolveTone(
  percent: number,
  tone: ProgressTone,
  thresholds?: ThresholdStop[]
): ProgressTone {
  if (thresholds && thresholds.length > 0) {
    const sorted = [...thresholds].sort((a, b) => a.upTo - b.upTo)
    const match = sorted.find((stop) => percent < stop.upTo)
    if (match) return match.tone
  }
  return tone
}

export function clampValue(value: number | undefined, min: number, max: number): number {
  const v = value ?? min
  return Math.min(max, Math.max(min, v))
}

export function toPercent(clamped: number, min: number, max: number): number {
  if (max === min) return 0
  return ((clamped - min) / (max - min)) * 100
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  {
    value,
    indeterminate = false,
    min = 0,
    max = 100,
    size = 'md',
    tone = 'primary',
    thresholds,
    valueText,
    label,
    showValue = false,
    className,
    ...rest
  },
  ref
) {
  const clamped = clampValue(value, min, max)
  const percent = toPercent(clamped, min, max)
  const resolvedTone = indeterminate ? tone : resolveTone(percent, tone, thresholds)

  return (
    <div
      {...rest}
      ref={ref}
      role="progressbar"
      aria-valuemin={min}
      aria-valuemax={max}
      {...(indeterminate ? {} : { 'aria-valuenow': clamped })}
      {...(valueText !== undefined ? { 'aria-valuetext': valueText } : {})}
      {...(label ? { 'aria-label': label } : {})}
      className={cx(styles.root, className)}
    >
      <span className={cx(styles.track, styles[size])}>
        {indeterminate ? (
          <span className={cx(styles.indeterminate, styles['fill-' + resolvedTone])} />
        ) : (
          <span
            className={cx(styles.fill, styles['fill-' + resolvedTone])}
            style={{ width: percent + '%' }}
          />
        )}
      </span>
      {showValue && !indeterminate && (
        <span className={styles.percent} aria-hidden="true">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  )
})
