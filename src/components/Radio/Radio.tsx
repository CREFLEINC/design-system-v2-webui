import { forwardRef, useContext } from 'react'
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../utils/cx'
import { RadioGroupContext } from './RadioGroup'
import styles from './Radio.module.css'

// InputHTMLAttributes.value(string|number|readonly string[])를 string으로 좁힌다.
// InputHTMLAttributes.size(number)는 시각 크기와 혼동되므로 Omit.
export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'value'> {
  /** 이 옵션의 값 — 그룹의 value와 일치하면 선택됨 (필수) */
  value: string
  /** 라벨 콘텐츠 (label 요소로 연결됨) */
  children?: ReactNode
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { value, children, className, disabled, onChange, ...rest },
  ref
) {
  const ctx = useContext(RadioGroupContext)

  // 그룹 안: 컨텍스트가 name/checked/disabled/onChange의 단일 소스
  const grouped = ctx !== null
  const name = grouped ? ctx.name : rest.name
  const isDisabled = grouped ? ctx.disabled || disabled : disabled

  const inputProps = grouped
    ? {
        name,
        checked: ctx.value === value,
        onChange: (e: ChangeEvent<HTMLInputElement>) => {
          ctx.onChange(value)
          onChange?.(e)
        }
      }
    : { name, onChange }

  return (
    <label className={cx(styles.radio, className)}>
      <input
        ref={ref}
        type="radio"
        className={styles.input}
        value={value}
        disabled={isDisabled}
        {...rest}
        {...inputProps}
      />
      <span className={styles.control} aria-hidden="true">
        <span className={styles.dot} aria-hidden="true" />
      </span>
      <span className={styles.label}>{children}</span>
    </label>
  )
})
