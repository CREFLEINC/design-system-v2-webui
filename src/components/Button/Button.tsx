import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './Button.module.css'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/* '2xl'은 CSS 식별자로 쓸 수 없어(숫자 시작) 클래스명은 xxl로 둔다 */
const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
  '2xl': styles.xxl
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** true면 스피너 표시 + 비활성 (aria-busy) */
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'filled', size = 'md', loading = false, leadingIcon, trailingIcon,
    disabled, className, children, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(styles.button, styles[variant], SIZE_CLASS[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : leadingIcon}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  )
})
