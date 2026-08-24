import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type TextareaHTMLAttributes
} from 'react'
import { cx } from '../../utils/cx'
import styles from './TextArea.module.css'

export type TextAreaSize = 'sm' | 'md' | 'lg' | 'xl'
export type TextAreaResize = 'none' | 'vertical'

// Omit 'size' — TextField 와 같은 이름으로 디자인 크기를 받는다(네이티브 size 와의 충돌 방지).
// Omit 'rows' — 네이티브 rows 를 그대로 쓰되 기본값 3 을 갖는 우리 prop 으로 다시 선언한다.
export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size' | 'rows'> {
  /** 시각적 라벨. 없으면 반드시 aria-label을 rest로 넘겨야 함 */
  label?: string
  /** 도움말 — error나 (disabled 시) disabledReason이 있으면 대체됨 */
  helperText?: ReactNode
  /** truthy면 invalid 상태(aria-invalid) + 이 텍스트를 error 메시지로 표시 */
  error?: ReactNode
  /** disabled일 때만 렌더 — 잠금 사유를 항상 보이는 DOM 텍스트로 노출하고 aria-describedby로 연결.
   *  error가 있으면 error가 우선. readOnly에는 적용되지 않음(포커스 가능하므로 helperText 사용) */
  disabledReason?: ReactNode
  size?: TextAreaSize
  /** 컨트롤을 부모 폭에 맞춰 확장 */
  fullWidth?: boolean
  /** 최상위 wrapper에 붙는 className (className은 <textarea>로 전달됨) */
  containerClassName?: string
  /** 기본으로 보이는 줄 수 @default 3 */
  rows?: number
  /** 내용에 따라 늘어나되 이 줄 수를 넘지 않는다. 넘으면 내부 스크롤. 지정 시 resize는 무시(none 강제) —
   *  자동 높이 조절이 매 입력마다 높이를 되돌리므로 수동 리사이즈와 공존할 수 없다 */
  maxRows?: number
  /** 사용자 수동 크기 조절. maxRows가 있으면 무시된다 @default 'vertical' */
  resize?: TextAreaResize
  /** 글자 수 상한 — soft limit. 네이티브 maxlength로 전달하지 않는다(붙여넣기 무단 잘림 방지).
   *  넘으면 aria-invalid + 오류 스타일. 제출 차단은 소비자가 검증한다 */
  maxLength?: number
  /** 글자 수 표시 여부 @default maxLength != null */
  showCount?: boolean
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, helperText, error, disabledReason, size = 'md', fullWidth = false,
    containerClassName, className, id: idProp, disabled, required,
    rows = 3, maxRows, resize = 'vertical', maxLength, showCount,
    value, defaultValue, onChange,
    'aria-describedby': describedByProp, ...rest },
  ref
) {
  const reactId = useId()
  const id = idProp ?? reactId
  const helperId = `${id}-helper`
  const errorId = `${id}-error`
  const reasonId = `${id}-reason`
  const countId = `${id}-count`

  // 글자 수 추적 — 제어/비제어 겸용. 값 자체는 네이티브에 그대로 넘기고, 카운트만 여기서 센다.
  const isControlled = value !== undefined
  const [innerValue, setInnerValue] = useState(() => (defaultValue == null ? '' : String(defaultValue)))
  const currentValue = isControlled ? (value == null ? '' : String(value)) : innerValue
  const length = currentValue.length
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (!isControlled) setInnerValue(e.currentTarget.value)
    onChange?.(e)
  }

  const overLimit = maxLength != null && length > maxLength
  const invalid = Boolean(error) || overLimit
  const showReason = Boolean(disabled && disabledReason) && !Boolean(error)
  const showCountResolved = showCount ?? maxLength != null
  const describedBy =
    cx(
      describedByProp,
      error ? errorId : showReason ? reasonId : helperText ? helperId : undefined,
      showCountResolved ? countId : undefined
    ) || undefined

  // zone 은 상한 대비 위치만 나타낸다 — live 메시지가 zone 에만 의존하므로 같은 zone 안의
  // 타건은 live 노드를 갱신하지 않는다(매 타건 낭독 원천 차단).
  const zone: 'over' | 'near' | 'ok' =
    maxLength == null
      ? 'ok'
      : length > maxLength
        ? 'over'
        : maxLength - length <= Math.max(1, Math.floor(maxLength * 0.1))
          ? 'near'
          : 'ok'
  const liveMessage =
    maxLength == null
      ? ''
      : zone === 'over'
        ? `글자 수 상한 ${maxLength}자를 초과했습니다`
        : zone === 'near'
          ? `글자 수 상한 ${maxLength}자에 가까워졌습니다`
          : ''

  // maxRows 가 지정되면 높이를 JS 가 관리하므로 수동 리사이즈 핸들을 내준다.
  const resizeApplied = maxRows == null && resize === 'vertical'

  const innerRef = useRef<HTMLTextAreaElement | null>(null)
  const setTextAreaRef = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  // auto-resize — maxRows 지정 시에만 개입한다. 없으면 네이티브 rows 가 높이를, 네이티브
  // 스크롤이 넘침을 처리한다. line-height 를 측정할 수 없는 환경(jsdom 등)에서는 no-op.
  const syncHeight = useCallback(() => {
    const el = innerRef.current
    if (!el || maxRows == null) return
    const cs = window.getComputedStyle(el)
    const line = parseFloat(cs.lineHeight)
    if (!Number.isFinite(line) || line <= 0) return
    const padding = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
    const maxH = Math.round(line * Math.max(maxRows, rows) + padding) // border-box, 보더 0(box-shadow) 전제
    el.style.height = 'auto' // 줄어드는 경우 재측정을 위해 리셋
    const next = Math.min(el.scrollHeight, maxH) // scrollHeight = 내용 + 패딩 (border-box)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden'
  }, [maxRows, rows])

  useLayoutEffect(() => {
    syncHeight()
  }, [syncHeight, currentValue, size])

  return (
    <div
      className={cx(styles.field, fullWidth && styles.fullWidth, containerClassName)}
      data-disabled={disabled || undefined}
    >
      {label && (
        <label htmlFor={id} className={styles.label}>{label}</label>
      )}
      <div className={cx(styles.areaWrap, styles[size], invalid && styles.invalid, disabled && styles.disabled)}>
        <textarea
          ref={setTextAreaRef}
          id={id}
          className={cx(styles.textarea, resizeApplied && styles.resizeVertical, className)}
          disabled={disabled}
          required={required}
          rows={rows}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          {...rest}
        />
      </div>
      {(error || showReason || helperText || showCountResolved) && (
        <div className={styles.meta}>
          {error ? (
            <p id={errorId} className={styles.error}>{error}</p>
          ) : showReason ? (
            <p id={reasonId} className={styles.reason}>{disabledReason}</p>
          ) : helperText ? (
            <p id={helperId} className={styles.helper}>{helperText}</p>
          ) : null}
          {showCountResolved && (
            <span id={countId} className={cx(styles.count, overLimit && styles.countOver)}>
              {maxLength != null ? `${length}/${maxLength}` : `${length}`}
            </span>
          )}
        </div>
      )}
      {/* live 영역은 maxLength 가 있으면 항상 렌더한다 — aria-live 는 노드가 미리 존재해야 동작한다.
          describedby 에는 넣지 않는다(설명은 #-count, 안내는 여기 — 역할 분리). */}
      {maxLength != null && (
        <span className={styles.srOnly} aria-live="polite">{liveMessage}</span>
      )}
    </div>
  )
})
