import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { cx } from '../../utils/cx'
import styles from './Checkbox.module.css'

export interface CheckboxProps
  // 네이티브 input 속성을 그대로 노출한다. type은 고정('checkbox'), size는 CSS와 충돌하므로 제외.
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** 부분 선택. 네이티브 input.indeterminate 로 반영되어 AT에 "mixed"로 보고된다 */
  indeterminate?: boolean
  /** 박스 오른쪽 라벨. 없으면 접근성 이름을 위해 aria-label 을 넘겨야 한다 */
  children?: ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { indeterminate = false, disabled, className, children, ...rest },
  ref
) {
  const innerRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => innerRef.current!, [])

  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = !!indeterminate
  }, [indeterminate])

  return (
    <label className={cx(styles.root, className)}>
      <span className={styles.control}>
        <input
          ref={innerRef}
          type="checkbox"
          className={styles.input}
          disabled={disabled}
          {...rest}
        />
        <span className={styles.box} aria-hidden="true">
          <svg className={styles.check} viewBox="0 0 24 24">
            <path d="M5 12l4 4L19 7" strokeWidth={2} />
          </svg>
          <svg className={styles.dash} viewBox="0 0 24 24">
            <path d="M6 12h12" strokeWidth={2} />
          </svg>
        </span>
      </span>
      {children != null && <span>{children}</span>}
    </label>
  )
})
