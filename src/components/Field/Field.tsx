import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './Field.module.css'

export type FieldSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/* '2xl'은 CSS 식별자로 쓸 수 없어(숫자 시작) 클래스명은 xxl로 둔다 (#85·#93 패턴).
   styles[size] 동적 조회를 쓰지 않는 이유이기도 하다 — 매핑이 빠지면 undefined가
   조용히 흘러 슬롯 하한이 사라진다. */
const SIZE_CLASS: Record<FieldSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
  '2xl': styles.xxl
}

export interface FieldIds {
  controlId: string
  labelId: string
  describedById: string | undefined
  invalid: boolean
}

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label?: ReactNode
  reserveLabel?: boolean
  required?: boolean
  helperText?: ReactNode
  error?: ReactNode
  disabledReason?: ReactNode
  size?: FieldSize
  fullWidth?: boolean
  labelAs?: 'label' | 'span'
  children: ReactNode | ((ids: FieldIds) => ReactNode)
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    label,
    reserveLabel = false,
    required = false,
    helperText,
    error,
    disabledReason,
    size = 'md',
    fullWidth = false,
    labelAs = 'label',
    children,
    className,
    id: idProp,
    ...rest
  },
  ref
) {
  const reactId = useId()
  const seed = idProp ?? reactId
  const controlId = `${seed}-control`
  const labelId = `${seed}-label`
  const helperId = `${seed}-helper`
  const errorId = `${seed}-error`
  const reasonId = `${seed}-reason`

  const invalid = Boolean(error)
  const message = invalid
    ? { content: error, id: errorId, className: styles.error }
    : disabledReason
      ? { content: disabledReason, id: reasonId, className: styles.reason }
      : helperText
        ? { content: helperText, id: helperId, className: styles.helper }
        : undefined
  const ids: FieldIds = {
    controlId,
    labelId,
    describedById: message?.id,
    invalid,
  }
  const hasLabel = Boolean(label)

  return (
    <div
      {...rest}
      ref={ref}
      id={idProp}
      className={cx(styles.field, fullWidth && styles.fullWidth, className)}
    >
      {hasLabel ? (
        <span className={styles.labelRow}>
          {labelAs === 'label' ? (
            <label id={labelId} htmlFor={controlId} className={styles.label}>{label}</label>
          ) : (
            <span id={labelId} className={styles.label}>{label}</span>
          )}
          {required && <span className={styles.requiredMark} aria-hidden="true">*</span>}
        </span>
      ) : reserveLabel ? (
        <span className={styles.spacer} aria-hidden="true">{'\u00a0'}</span>
      ) : null}

      <div className={cx(styles.control, SIZE_CLASS[size])}>
        {typeof children === 'function' ? children(ids) : children}
      </div>

      {message && (
        <p id={message.id} className={cx(styles.message, message.className)}>
          {message.content}
        </p>
      )}
    </div>
  )
})
