import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './Switch.module.css'

export type SwitchLabelPlacement = 'start' | 'end'

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'> {
  /** 스위치 옆 라벨. 있으면 wrapping <label>이 접근가능한 이름을 제공한다.
   *  없으면 consumer가 aria-label을 ...rest로 넘겨야 한다. */
  label?: ReactNode
  /** 라벨 위치. 기본 'end' (컨트롤 오른쪽). */
  labelPlacement?: SwitchLabelPlacement
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, labelPlacement = 'end', disabled, className, ...rest },
  ref
) {
  return (
    <label
      className={cx(
        styles.root,
        styles[labelPlacement],
        disabled && styles.disabled,
        className
      )}
    >
      <span className={styles.control}>
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          className={styles.input}
          disabled={disabled}
          {...rest}
        />
        <span className={styles.track} aria-hidden="true">
          <span className={styles.thumb} />
        </span>
      </span>
      {label != null && <span className={styles.labelText}>{label}</span>}
    </label>
  )
})
