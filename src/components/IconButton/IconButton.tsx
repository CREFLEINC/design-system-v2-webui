import { forwardRef, useState, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import styles from './IconButton.module.css'

export type IconButtonVariant = 'standard' | 'filled' | 'tonal'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Material Symbols 아이콘 이름 (리가처). 예: 'settings', 'close' */
  icon: string
  /** toggle && pressed일 때 보여줄 대체 아이콘 (선택). 예: 'star' */
  selectedIcon?: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  /** true면 토글 버튼으로 동작 — aria-pressed를 노출한다 */
  toggle?: boolean
  /** 제어(controlled) 모드 pressed 상태 */
  pressed?: boolean
  /** 비제어(uncontrolled) 모드 초기 pressed 상태 */
  defaultPressed?: boolean
  /** pressed가 바뀌려 할 때 호출 (제어/비제어 공통) */
  onPressedChange?: (pressed: boolean) => void
  /**
   * 아이콘 전용 버튼은 보이는 텍스트가 없으므로 접근 가능한 이름이 필수.
   * ButtonHTMLAttributes의 optional 'aria-label'을 required로 좁힌다.
   * aria-labelledby로 이름을 주고 싶으면 aria-label=""로 회피 가능.
   */
  'aria-label': string
}

const ICON_SIZE = { sm: 20, md: 24, lg: 24 } as const

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    selectedIcon,
    variant = 'standard',
    size = 'md',
    toggle = false,
    pressed,
    defaultPressed,
    onPressedChange,
    disabled,
    className,
    type = 'button',
    onClick,
    ...rest
  },
  ref
) {
  const isControlled = pressed !== undefined
  const [internal, setInternal] = useState(defaultPressed ?? false)
  const isPressed = isControlled ? pressed : internal

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (toggle) {
      const next = !isPressed
      if (!isControlled) setInternal(next)
      onPressedChange?.(next)
    }
    onClick?.(e)
  }

  const displayIcon = toggle && isPressed && selectedIcon ? selectedIcon : icon

  return (
    <button
      ref={ref}
      type={type}
      className={cx(styles.root, styles[variant], styles[size], className)}
      disabled={disabled}
      aria-pressed={toggle ? isPressed : undefined}
      onClick={handleClick}
      {...rest}
    >
      <Icon name={displayIcon} size={ICON_SIZE[size]} />
    </button>
  )
})
