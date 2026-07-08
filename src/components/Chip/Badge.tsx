import { type HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'
import styles from './Badge.module.css'

export type BadgeTone = 'primary' | 'neutral' | 'error'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** 표시할 수치 */
  count?: number
  /** 초과 시 'max+' 표기 (기본 99 → 100은 '99+') */
  max?: number
  /** 점 표시 모드 — count 무시, 텍스트 없음 */
  dot?: boolean
  /** count가 0이어도 표시 (기본 false → null 반환) */
  showZero?: boolean
  tone?: BadgeTone
}

// Icon 선례를 따라 비대화형: forwardRef 없이 순수 함수 컴포넌트, ...rest 스프레드.
export function Badge({ count, max = 99, dot = false, showZero = false, tone = 'primary', className, ...rest }: BadgeProps) {
  const labelled = (rest as Record<string, unknown>)['aria-label'] != null
  if (dot) {
    return <span className={cx(styles.badge, styles.dot, styles[tone], className)} aria-hidden={labelled ? undefined : true} {...rest} />
  }
  if (count == null || (count === 0 && !showZero)) return null
  const text = count > max ? `${max}+` : String(count)
  return <span className={cx(styles.badge, styles.count, styles[tone], className)} {...rest}>{text}</span>
}
