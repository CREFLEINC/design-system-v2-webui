import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './TextField.module.css'

export type TextFieldSize = 'sm' | 'md' | 'lg'

// Omit 'size' — native input.size is a number and collides with our design size.
export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** 시각적 라벨. 없으면 반드시 aria-label을 rest로 넘겨야 함 */
  label?: string
  /** 도움말 — error가 있으면 대체됨 */
  helperText?: ReactNode
  /** truthy면 invalid 상태(aria-invalid) + 이 텍스트를 error 메시지로 표시 */
  error?: ReactNode
  size?: TextFieldSize
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  /** 인풋을 부모 폭에 맞춰 확장 */
  fullWidth?: boolean
  /** 최상위 wrapper에 붙는 className (className은 <input>으로 전달됨) */
  containerClassName?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, helperText, error, size = 'md', leadingIcon, trailingIcon, fullWidth = false,
    containerClassName, className, id: idProp, disabled, required,
    'aria-describedby': describedByProp, ...rest },
  ref
) {
  const reactId = useId()
  const id = idProp ?? reactId
  const helperId = `${id}-helper`
  const errorId = `${id}-error`
  const invalid = Boolean(error)
  const describedBy =
    cx(describedByProp, invalid ? errorId : helperText ? helperId : undefined) || undefined

  return (
    <div
      className={cx(styles.field, fullWidth && styles.fullWidth, containerClassName)}
      data-disabled={disabled || undefined}
    >
      {label && (
        <label htmlFor={id} className={styles.label}>{label}</label>
      )}
      <div className={cx(styles.inputWrap, styles[size], invalid && styles.invalid, disabled && styles.disabled)}>
        {leadingIcon && <span className={styles.leading} aria-hidden="true">{leadingIcon}</span>}
        <input
          ref={ref}
          id={id}
          className={cx(styles.input, className)}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          {...rest}
        />
        {trailingIcon && <span className={styles.trailing} aria-hidden="true">{trailingIcon}</span>}
      </div>
      {invalid ? (
        <p id={errorId} className={styles.error}>{error}</p>
      ) : helperText ? (
        <p id={helperId} className={styles.helper}>{helperText}</p>
      ) : null}
    </div>
  )
})
