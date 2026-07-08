import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Card, type CardSurface, type CardElevation } from '../Card/Card'
import { Icon } from '../Icon/Icon'
import { cx } from '../../utils/cx'
import styles from './StatCard.module.css'

export type StatCardStatus = 'success' | 'error' | 'warning' | 'info' | 'idle'
export type DeltaDirection = 'up' | 'down' | 'flat'

export interface StatCardDelta {
  /** up→success(초록), down→error(레드), flat→neutral. 색+화살표 아이콘 매핑 고정. */
  direction: DeltaDirection
  /** 표시할 증감 값 — 예: '+3.2%', '-12', '0'. ReactNode 허용. */
  value: ReactNode
  /** SR용 서술 라벨. 없으면 방향어(상승/하락/변동 없음)+value로 자동 구성. */
  label?: string
}

// title은 Card→div 네이티브 tooltip 속성과 겹치지 않게 Omit (라벨 개념과 혼동 방지).
export interface StatCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** KPI 라벨(작은 캡션). 문자열이면 group의 aria-label fallback으로도 사용. */
  label: ReactNode
  /** 큰 대표 값. 예: '98.2', '1,240'. */
  value: ReactNode
  /** 값 뒤 단위(약한 텍스트). 예: '%', '건', 'ea'. */
  unit?: ReactNode
  /** 증감 지표(선택). */
  delta?: StatCardDelta
  /** 상태 점(선택) — semantic 채움 마크. */
  status?: StatCardStatus
  /** 상태 점의 접근성 라벨(status 지정 시 필수 권장). 예: '가동중'. */
  statusLabel?: string
  /** 스파크라인 슬롯 — 인라인 미니 SVG 등. 차트는 만들지 않고 자리만 제공. */
  children?: ReactNode
  /** Card로 전달되는 표면 사다리. 기본 'low'. */
  surface?: CardSurface
  /** Card로 전달되는 elevation. 기본 0. */
  elevation?: CardElevation
  /** Card로 전달되는 1px --outline-variant 경계선. */
  bordered?: boolean
}

const arrowName: Record<DeltaDirection, string> = {
  up: 'arrow_upward',
  down: 'arrow_downward',
  flat: 'trending_flat'
}

const directionWord: Record<DeltaDirection, string> = {
  up: '상승',
  down: '하락',
  flat: '변동 없음'
}

export const StatCard = forwardRef<HTMLElement, StatCardProps>(function StatCard(
  { label, value, unit, delta, status, statusLabel, children, surface, elevation, bordered, className, ...rest },
  ref
) {
  const groupLabel = (rest['aria-label'] as string | undefined) ?? (typeof label === 'string' ? label : undefined)
  const deltaSrText = delta ? (delta.label ?? `${directionWord[delta.direction]} ${String(delta.value)}`) : undefined

  return (
    <Card
      ref={ref}
      className={cx(styles.root, className)}
      surface={surface}
      elevation={elevation}
      bordered={bordered}
      {...rest}
      role="group"
      aria-label={groupLabel}
    >
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {status && (
          <span
            className={styles.dot}
            data-status={status}
            role={statusLabel ? 'img' : undefined}
            aria-label={statusLabel}
            aria-hidden={statusLabel ? undefined : true}
          />
        )}
      </div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {delta && (
        <span className={styles.delta} data-direction={delta.direction}>
          <span className={styles.srOnly}>{deltaSrText}</span>
          <Icon className={styles.deltaIcon} name={arrowName[delta.direction]} size={16} aria-hidden="true" />
          <span aria-hidden="true">{delta.value}</span>
        </span>
      )}
      {children && <div className={styles.spark}>{children}</div>}
    </Card>
  )
})
