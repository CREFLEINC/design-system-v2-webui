import type { HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'
import styles from './Icon.module.css'

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  /** Material Symbols 아이콘 이름 (리가처) — 예: 'factory', 'smart_toy' */
  name: string
  size?: 20 | 24 | 40 | 48
  /** 의미 전달용 라벨. 없으면 장식용(aria-hidden) */
  label?: string
}

export function Icon({ name, size = 24, label, className, style, ...rest }: IconProps) {
  return (
    <span
      className={cx(styles.icon, className)}
      style={{ fontSize: size, ...style }}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      {...rest}
    >
      {name}
    </span>
  )
}
