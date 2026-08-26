import {
  forwardRef,
  useCallback,
  useEffect,
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
    value, defaultValue, onChange, form: formProp, style,
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

  // 자동 높이가 소유한 인라인 height/overflow-y 추적 — 소비자가 style prop 으로 준 값을
  // 침범하지 않기 위해, 우리가 마지막으로 쓴 값(written)과 덮기 직전의 값(saved)을 기억한다.
  // DOM 값이 written 과 다르면 그 사이 소비자(React)가 새로 쓴 것이므로 소유권을 주장하지 않는다.
  const autoSizeRef = useRef<{
    written: { height: string; overflowY: string }
    saved: { height: string; overflowY: string }
  } | null>(null)

  // auto-resize — maxRows 지정 시에만 개입한다. 없으면 네이티브 rows 가 높이를, 네이티브
  // 스크롤이 넘침을 처리한다. line-height 를 측정할 수 없는 환경(jsdom 등)에서는 no-op.
  const syncHeight = useCallback(() => {
    const el = innerRef.current
    if (!el) return
    if (maxRows == null) {
      // maxRows 해제: 우리가 쓴 값이 그대로 남아 있는 속성만 소비자 값(saved)으로 복원한다.
      // 소유한 적 없으면(마운트 직후 포함) no-op — 소비자의 style prop 을 침범하지 않는다.
      const owned = autoSizeRef.current
      if (owned) {
        if (el.style.height === owned.written.height) {
          if (owned.saved.height) el.style.height = owned.saved.height
          else el.style.removeProperty('height')
        }
        if (el.style.overflowY === owned.written.overflowY) {
          if (owned.saved.overflowY) el.style.overflowY = owned.saved.overflowY
          else el.style.removeProperty('overflow-y')
        }
        autoSizeRef.current = null
      }
      return
    }
    const cs = window.getComputedStyle(el)
    const line = parseFloat(cs.lineHeight)
    if (!Number.isFinite(line) || line <= 0) return
    // 덮기 직전 인라인 값 포착 — 직전 written 과 같으면 이전 saved 를 승계(우리 값 위에 다시 쓰는 중),
    // 다르면 소비자가 새로 쓴 값이므로 그것을 복원 대상으로 갱신한다. 반드시 height='auto' 리셋 *전*에 읽는다.
    const prev = autoSizeRef.current
    const saved = {
      height: prev && el.style.height === prev.written.height ? prev.saved.height : el.style.height,
      overflowY: prev && el.style.overflowY === prev.written.overflowY ? prev.saved.overflowY : el.style.overflowY
    }
    const padding = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
    const maxH = Math.round(line * Math.max(maxRows, rows) + padding) // border-box, 보더 0(box-shadow) 전제
    el.style.height = 'auto' // 줄어드는 경우 재측정을 위해 리셋
    const next = Math.min(el.scrollHeight, maxH) // scrollHeight = 내용 + 패딩 (border-box)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden'
    autoSizeRef.current = {
      written: { height: el.style.height, overflowY: el.style.overflowY },
      saved
    }
  }, [maxRows, rows])

  // 소비자 style 은 어떤 CSS 키로든 높이 공식의 입력 — scrollHeight(letterSpacing·whiteSpace·
  // wordBreak·tabSize·커스텀 프로퍼티의 var() 참조까지)·computed lineHeight·수직 패딩 — 을
  // 바꿀 수 있다. 개별 키 열거는 원리적으로 끝나지 않으므로(키를 열거할 때마다 다음 누락
  // 키가 나온다), React 가 DOM 에 commit 하는 단위와 정확히 같은 "키:값 전체"를 정렬
  // 직렬화한 signature 하나를 deps 로 추적한다. 어떤 키든 값이 실제로 바뀌면 재측정하고
  // (포괄 커버), 값이 전부 같으면 — 객체 identity 가 매 렌더 새로 생기는 일반적인 인라인
  // style 패턴 포함 — 문자열이 동일해 effect 가 건너뛴다(조기 반환: 매 렌더 강제 reflow
  // 없음). React 의 style 갱신도 키별 값 diff 라 값이 같으면 DOM 재기록이 없다(실측) —
  // 이 signature 는 "React 가 이 렌더에서 인라인 style 을 실제로 바꿀 수 있는 경우"와
  // 정확히 일치한다. 정렬은 키 순서 차이를 중화하고, JSON.stringify 는 8 과 '8' 같은
  // 타입 차이(React 의 px 부여 여부가 갈린다)를 구별하며, null/undefined 값은 React 가
  // 무시하므로 제외한다(빈 결과는 '' — style 부재와 동일 취급). 직렬화 비용은 키 셋에
  // 0.4µs·스물에 3.3µs 실측 — 강제 reflow(ms 단위)와 세 자릿수 차이다.
  // 반대로 prop·리렌더 없이 computed 스타일만 바뀌는 경우 — media query·테마 전환·웹폰트
  // 로드·조상 클래스 변경 — 는 의도적 범위 밖이다(감지 채널 없음, 다음 입력·prop·폭
  // 변경에서 자기 교정된다).
  const styleEntries = style == null ? [] : Object.entries(style).filter(([, v]) => v != null)
  const styleSignature =
    styleEntries.length === 0
      ? ''
      : JSON.stringify(styleEntries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)))

  useLayoutEffect(() => {
    syncHeight()
  }, [syncHeight, currentValue, size, className, containerClassName, fullWidth, styleSignature])

  // 레이아웃만 바뀌는 변화 — 부모 컨테이너의 반응형 폭 변경처럼 어떤 prop 도 바뀌지 않는 경우 —
  // 는 위 deps 로 잡을 수 없다. ResizeObserver 로 textarea 의 content-box 를 관찰해 재측정한다.
  // 폭 필터: 우리가 쓰는 것은 height/overflow-y 뿐이라 폭을 바꾸지 않는다 — 폭이 그대로인 알림은
  // 우리 높이 쓰기의 메아리이므로 재측정하지 않는다(관찰→쓰기→재관찰 순환 차단). 최초 알림은
  // 기준선만 기록한다(마운트 동기화는 layout effect 몫).
  // rAF 지연: RO delivery 루프 안에서 동기로 리사이즈하면 브라우저가 "loop completed with
  // undelivered notifications" 오류 이벤트를 내므로(소비자 오류 추적 오염) 다음 프레임으로 미루고,
  // 연속 알림은 하나로 합친다. 측정은 height:'auto' 리셋 상태(스크롤바 없는 폭)에서 이뤄져 결과가
  // 폭에만 결정적으로 의존한다 — 같은 폭엔 같은 값을 다시 쓰므로 진동(무한 루프)이 없다.
  const roWidthRef = useRef<number | null>(null)
  const roRafRef = useRef(0)
  useEffect(() => {
    if (maxRows == null) return
    if (typeof ResizeObserver === 'undefined') return // jsdom·미지원 브라우저 — deps 채널만으로 동작 (SSR 은 useEffect 라 애초에 미실행)
    const el = innerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[entries.length - 1].contentRect.width
      if (roWidthRef.current === null) {
        roWidthRef.current = width // 최초 알림 = 기준선
        return
      }
      if (width === roWidthRef.current) return // 폭 불변 = 우리 쓰기의 메아리
      roWidthRef.current = width
      if (roRafRef.current) return // 이미 예약됨 — 합침
      roRafRef.current = requestAnimationFrame(() => {
        roRafRef.current = 0
        syncHeight()
      })
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (roRafRef.current) {
        cancelAnimationFrame(roRafRef.current)
        roRafRef.current = 0
      }
      roWidthRef.current = null
    }
  }, [maxRows, syncHeight])

  // 네이티브 form.reset() 은 change 이벤트를 내지 않는다 — owner form 의 'reset' 을 구독해
  // 리셋 후 실제 DOM 값으로 글자 수 state 를 재동기화한다. controlled 는 value prop 이 정본이므로 불필요.
  // form 속성이 바뀌면 owner 가 바뀌므로 formProp 을 deps 에 두어 재구독한다 (effect 는 commit 후
  // 실행되어 innerRef.current.form 이 새 owner 로 재해석된다). 조상 form 교체는 remount 를 동반해
  // 어차피 재실행된다. unmount 후 microtask 는 콜백 ref 가 null 을 먼저 받으므로 아래 가드로 무해하다.
  useEffect(() => {
    if (isControlled) return
    const form = innerRef.current?.form
    if (!form) return
    const handleReset = () => {
      // reset 이벤트는 값 복귀 *전*에 발생한다(스펙·jsdom 실측 동일) — 동기로 읽으면 이전 값.
      // microtask 로 미뤄 복귀 후의 실제 값을 읽는다. preventDefault 로 리셋이 취소된 경우에도
      // "실제 DOM 값"과 동기화되므로 안전하다.
      queueMicrotask(() => {
        const el = innerRef.current
        if (el) setInnerValue(el.value)
      })
    }
    form.addEventListener('reset', handleReset)
    return () => form.removeEventListener('reset', handleReset)
  }, [isControlled, formProp])

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
          form={formProp}
          style={style}
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
