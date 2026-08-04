import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Icon } from '../Icon/Icon'
import { cx } from '../../utils/cx'
import styles from './DiffRow.module.css'

export interface DiffRowProps extends HTMLAttributes<HTMLDivElement> {
  /** 필드명(행 라벨). 문자열이면 group의 aria-label fallback. */
  label: ReactNode
  /** 이전 값. null/undefined/'' → 빈값 표기. */
  before?: ReactNode
  /** 이후 값. null/undefined/'' → 빈값 표기(값 삭제 — 취소선·빨강 없음). */
  after?: ReactNode
  /** 빈값 표기 문자열. 기본 '(없음)'. */
  emptyText?: string
  /** false면 '변경 없음' 행 — 값을 한 번만 중립으로 렌더(전체 표시 모드용). 기본 true. */
  changed?: boolean
}

const isEmpty = (v: ReactNode): boolean => v === null || v === undefined || v === ''

// 라벨 폭 정렬(여러 행을 세로로 나열할 때 라벨 컬럼을 맞추는 것)은 소비자 몫 — 이 컴포넌트는 레이아웃 결정을 하지 않는다.
export const DiffRow = forwardRef<HTMLDivElement, DiffRowProps>(function DiffRow(
  { label, before, after, emptyText = '(없음)', changed = true, className, ...rest },
  ref
) {
  const groupLabel = (rest['aria-label'] as string | undefined) ?? (typeof label === 'string' ? label : undefined)
  const unchangedValue = isEmpty(after) ? before : after

  return (
    <div
      ref={ref}
      className={cx(styles.root, className)}
      {...rest}
      role="group"
      aria-label={groupLabel}
      data-changed={changed}
    >
      <span className={styles.label}>{label}</span>
      {changed ? (
        <span className={styles.values}>
          <span className={styles.before}>
            <span className={styles.srOnly}>이전 값 </span>
            {isEmpty(before) ? <span className={styles.empty}>{emptyText}</span> : before}
          </span>
          <Icon className={styles.arrow} name="arrow_forward" size={16} aria-hidden="true" />
          <span className={styles.after}>
            <span className={styles.srOnly}>이후 값 </span>
            {isEmpty(after) ? <span className={styles.empty}>{emptyText}</span> : after}
          </span>
        </span>
      ) : (
        <span className={styles.unchanged}>
          <span className={styles.srOnly}>변경 없음 </span>
          {isEmpty(unchangedValue) ? <span className={styles.empty}>{emptyText}</span> : unchangedValue}
        </span>
      )}
    </div>
  )
})
