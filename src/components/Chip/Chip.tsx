import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import styles from './Chip.module.css'

export type ChipStatus = 'success' | 'error' | 'warning' | 'info' | 'idle'
export type ChipSize = 'sm' | 'md'

interface ChipCommon {
  size?: ChipSize
  /** 선행 아이콘 — 소비자가 <Icon name="..." size={16} /> 전달 (Button.leadingIcon과 동일 패턴) */
  leadingIcon?: ReactNode
  children: ReactNode
}

/** 상태/표시용 칩 — 비대화형. 루트 <span>. removable(후행 X) 지원. */
export interface StatusChipProps extends ChipCommon, Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  variant?: 'status'
  /** 시맨틱 상태 → soft container 배경 (기본 'idle') */
  status?: ChipStatus
  /** 지정 시 후행 X 제거 버튼을 렌더하고 클릭 시 호출 */
  onRemove?: () => void
  /** 제거 버튼 aria-label (기본 '제거') */
  removeLabel?: string
}

/** 필터/선택용 칩 — 토글. 루트 <button aria-pressed>. */
export interface FilterChipProps extends ChipCommon, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant: 'filter'
  /** 선택 상태 (aria-pressed로 노출, controlled) */
  selected?: boolean
  /** 토글 콜백 — 다음 선택값(!selected)을 전달 */
  onSelectedChange?: (selected: boolean) => void
}

export type ChipProps = StatusChipProps | FilterChipProps

export const Chip = forwardRef<HTMLButtonElement | HTMLSpanElement, ChipProps>(function Chip(props, ref) {
  const { size = 'md', leadingIcon, children, className } = props

  if (props.variant === 'filter') {
    const { variant: _v, selected = false, onSelectedChange, onClick, size: _s, leadingIcon: _li, children: _c, className: _cn, ...rest } = props
    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        aria-pressed={selected}
        className={cx(styles.chip, styles.filter, selected && styles.selected, styles[size], className)}
        onClick={(e) => { onSelectedChange?.(!selected); onClick?.(e) }}
        {...rest}
      >
        {leadingIcon}
        <span className={styles.label}>{children}</span>
      </button>
    )
  }

  const { variant: _v, status = 'idle', onRemove, removeLabel = '제거', size: _s, leadingIcon: _li, children: _c, className: _cn, ...rest } = props
  return (
    <span
      ref={ref as Ref<HTMLSpanElement>}
      className={cx(styles.chip, styles.status, styles[`status-${status}`], styles[size], className)}
      {...rest}
    >
      {leadingIcon}
      <span className={styles.label}>{children}</span>
      {onRemove && (
        <button type="button" className={styles.remove} aria-label={removeLabel} onClick={() => onRemove()}>
          <Icon name="close" size={size === 'sm' ? 16 : 18} />
        </button>
      )}
    </span>
  )
})
