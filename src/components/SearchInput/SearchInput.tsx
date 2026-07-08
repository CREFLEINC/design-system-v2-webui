// SCOPE: 검색 필드 + leading 검색아이콘(또는 loading 스피너) + 텍스트가 있을 때만 나타나는 clear(×) 버튼.
// 트레일링 필터 드롭다운은 out-of-scope.
//
// TextField를 합성하지 않고 독립 컴포넌트로 작성한다: TextField의 trailing 슬롯은
// <span aria-hidden="true">로 감싸므로 인터랙티브 clear IconButton을 넣으면 a11y 트리에서
// 사라지고, leading 슬롯도 loading 스피너로 스왑할 수 없기 때문이다. 대신 Icon + IconButton을
// import 재사용하고, 라벨/헬퍼/에러/aria-describedby 로직·사이즈 토큰·보더 상태머신은
// TextField.module.css의 .inputWrap 레시피와 1:1로 동일하게 재현한다.
import {
  forwardRef,
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode
} from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import { IconButton } from '../IconButton/IconButton'
import styles from './SearchInput.module.css'

export type SearchInputSize = 'sm' | 'md' | 'lg'

// Omit native 'size' (number, collides with design size) and 'type' (we force type="search").
export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** 시각적 라벨. 없으면 반드시 aria-label을 rest로 넘겨야 함 (TextField와 동일 규약) */
  label?: string
  /** 도움말 — error가 있으면 대체됨 */
  helperText?: ReactNode
  /** truthy면 invalid(aria-invalid) + 이 텍스트를 에러 메시지로 표시 */
  error?: ReactNode
  size?: SearchInputSize
  /** 부모 폭에 맞춰 확장 */
  fullWidth?: boolean
  /** true면 leading 검색 아이콘 자리에 스피너 표시 (검색 진행 중) */
  loading?: boolean
  /** 제어(controlled) 값 */
  value?: string
  /** 비제어(uncontrolled) 초기 값 */
  defaultValue?: string
  /** Enter로 검색 확정 시 현재 입력값과 함께 호출 */
  onSearch?: (value: string) => void
  /** clear(×) 버튼으로 값이 비워진 뒤 호출 (선택) */
  onClear?: () => void
  /** clear 버튼 접근 이름 — 기본 '지우기' */
  clearLabel?: string
  /** 최상위 wrapper className (className은 <input>으로 전달됨) */
  containerClassName?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    label,
    helperText,
    error,
    size = 'md',
    fullWidth = false,
    loading = false,
    value,
    defaultValue,
    onSearch,
    onClear,
    clearLabel = '지우기',
    containerClassName,
    className,
    id: idProp,
    disabled,
    required,
    onChange,
    onKeyDown,
    'aria-describedby': describedByProp,
    ...rest
  },
  ref
) {
  const reactId = useId()
  const id = idProp ?? reactId
  const helperId = `${id}-helper`
  const errorId = `${id}-error`
  const invalid = Boolean(error)
  const describedBy =
    cx(describedByProp, invalid ? errorId : helperText ? helperId : undefined) || undefined

  const inputRef = useRef<HTMLInputElement | null>(null)
  const setRefs = useCallback(
    (n: HTMLInputElement | null) => {
      inputRef.current = n
      if (typeof ref === 'function') ref(n)
      else if (ref) ref.current = n
    },
    [ref]
  )

  const isControlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue ?? '')
  const current = isControlled ? value : internal
  const hasText = current.length > 0

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!isControlled) setInternal(e.target.value)
    onChange?.(e)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e)
    if (e.key === 'Enter') {
      if (!e.nativeEvent.isComposing) onSearch?.(e.currentTarget.value)
    } else if (e.key === 'Escape') {
      if (hasText) handleClear()
    }
  }

  function handleClear() {
    const input = inputRef.current
    if (!input) return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, '')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.focus()
    onClear?.()
  }

  return (
    <div
      className={cx(styles.field, fullWidth && styles.fullWidth, containerClassName)}
      data-disabled={disabled || undefined}
    >
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div
        className={cx(
          styles.inputWrap,
          styles[size],
          invalid && styles.invalid,
          disabled && styles.disabled
        )}
      >
        <span className={styles.leading} aria-hidden="true">
          {loading ? <span className={styles.spinner} /> : <Icon name="search" size={20} />}
        </span>
        <input
          ref={setRefs}
          id={id}
          type="search"
          className={cx(styles.input, className)}
          value={current}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          {...rest}
        />
        {hasText && !disabled && (
          <IconButton
            className={styles.clear}
            icon="close"
            size="sm"
            variant="standard"
            aria-label={clearLabel}
            onClick={handleClear}
          />
        )}
      </div>
      {invalid ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className={styles.helper}>
          {helperText}
        </p>
      ) : null}
    </div>
  )
})
