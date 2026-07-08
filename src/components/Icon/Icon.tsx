import type { HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'
import styles from './Icon.module.css'

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  /** Material Symbols 아이콘 이름 (리가처) — 예: 'factory', 'smart_toy' */
  name: string
  /** 아이콘 px 크기. 권장 스텝 16/18/20/24/40/48이지만 컨테이너에 맞춰 자유롭게 지정 가능 */
  size?: number
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
