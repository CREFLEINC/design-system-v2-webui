import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import { IconButton } from '../IconButton/IconButton'
import { Button } from '../Button/Button'
import styles from './Toast.module.css'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'idle'
export type ToastPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  /** 기본 idle. 컨테이너 채움 + on-container 텍스트로 매핑. */
  variant?: ToastVariant
  /** 강조 제목(선택). 굵게. */
  title?: ReactNode
  /** 본문 메시지. show('문자열')로 넘기면 이 필드가 된다. */
  description?: ReactNode
  /** 자동 사라짐(ms). 0 또는 Infinity → 자동 dismiss 안 함. Provider의 duration을 덮어씀. */
  duration?: number
  /** 선택 액션 버튼(Button text/sm 재사용). */
  action?: ToastAction
  /** 수동 닫기(X) 버튼 표시. 기본 true. */
  dismissible?: boolean
}

/** show()가 배열에 넣는 내부 인스턴스(공개 read 타입). */
export interface ToastInstance extends ToastOptions {
  id: string
  /** 종료 애니메이션 진행 중(제거 예약됨). */
  leaving?: boolean
}

/** useToast() 반환값. */
export interface ToastApi {
  /** 토스트를 띄우고 생성된 id를 반환. 문자열이면 { description } 로 승격. */
  show: (options: ToastOptions | string) => string
  /** id로 특정 토스트를 종료(종료 애니메이션 후 제거). */
  dismiss: (id: string) => void
}

export interface ToastProviderProps {
  children: ReactNode
  /** 스택 코너 위치. 기본 'bottom-right'. */
  position?: ToastPosition
  /** 개별 duration 미지정 시 기본 자동 dismiss(ms). 기본 5000. */
  duration?: number
  /** 동시 표시 최대 개수. 초과 시 가장 오래된 것 즉시 제거. 기본 4. */
  max?: number
  /** 라이브 region 랜드마크의 접근 이름. 기본 '알림'. */
  label?: string
}

const EXIT_MS = 150

// jsdom(테스트 환경)은 Popover API 미지원이며, `popover` 속성이 있는 요소를
// UA 기본값으로 `display: none` 처리한다(showPopover 호출 여부와 무관).
// 실제 지원 브라우저에서만 속성을 부여해 top-layer에 편입시키고,
// 미지원 환경(jsdom 포함)에서는 속성 자체를 생략해 일반 fixed 요소로 남긴다.
const SUPPORTS_POPOVER =
  typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
  idle: 'info'
}

interface ToastContextValue extends ToastApi {
  toasts: ToastInstance[]
  defaultDuration: number
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return { show: ctx.show, dismiss: ctx.dismiss }
}

export function ToastProvider({
  children,
  position = 'bottom-right',
  duration = 5000,
  max = 4,
  label = '알림'
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastInstance[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const target = prev.find((t) => t.id === id)
      if (!target || target.leaving) return prev
      return prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    })
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, EXIT_MS)
  }, [])

  const show = useCallback(
    (options: ToastOptions | string) => {
      const opts: ToastOptions = typeof options === 'string' ? { description: options } : options
      seq.current += 1
      const id = `toast-${seq.current}`
      const instance: ToastInstance = { dismissible: true, ...opts, id }
      setToasts((prev) => {
        if (prev.length >= max) {
          // 강제 축출: 가장 오래된 것을 애니메이션 없이 즉시 제거
          return [...prev.slice(1), instance]
        }
        return [...prev, instance]
      })
      return id
    },
    [max]
  )

  const api = useMemo<ToastContextValue>(
    () => ({ show, dismiss, toasts, defaultDuration: duration }),
    [show, dismiss, toasts, duration]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastRegion toasts={toasts} position={position} label={label} defaultDuration={duration} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

interface ToastRegionProps {
  toasts: ToastInstance[]
  position: ToastPosition
  label: string
  defaultDuration: number
  dismiss: (id: string) => void
}

function ToastRegion({ toasts, position, label, defaultDuration, dismiss }: ToastRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!SUPPORTS_POPOVER) return
    const el = regionRef.current as (HTMLDivElement & { showPopover?: () => void }) | null
    if (el && typeof el.showPopover === 'function') {
      try {
        el.showPopover()
      } catch {
        // 이미 열려 있음 — 무시
      }
    }
  }, [])

  // popover 속성은 지원 브라우저에서만 부여한다(top-layer 편입).
  // jsdom을 포함한 미지원 환경은 속성을 생략해 일반 fixed 요소로 남긴다 —
  // UA가 `[popover]:not(:popover-open){display:none}`을 강제해 테스트에서
  // 콘텐츠가 접근성 트리에서 사라지는 것을 막는다.
  const popoverProps = SUPPORTS_POPOVER ? { popover: 'manual' } : {}

  return (
    <div
      ref={regionRef}
      {...(popoverProps as Record<string, string>)}
      role="region"
      aria-label={label}
      data-position={position}
      className={styles.region}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} defaultDuration={defaultDuration} dismiss={dismiss} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: ToastInstance
  defaultDuration: number
  dismiss: (id: string) => void
}

function ToastItem({ toast, defaultDuration, dismiss }: ToastItemProps) {
  const {
    id,
    variant = 'idle',
    title,
    description,
    duration = defaultDuration,
    action,
    dismissible = true,
    leaving
  } = toast

  const [paused, setPaused] = useState(false)
  const startRef = useRef(0)
  const remainingRef = useRef(duration)

  useEffect(() => {
    remainingRef.current = duration
  }, [duration])

  useEffect(() => {
    if (paused || duration === 0 || duration === Infinity) return
    startRef.current = Date.now()
    const t = setTimeout(() => dismiss(id), remainingRef.current)
    return () => {
      clearTimeout(t)
      remainingRef.current -= Date.now() - startRef.current
    }
  }, [paused, duration, id, dismiss])

  const isError = variant === 'error'
  const role = isError ? 'alert' : 'status'
  const ariaLive = isError ? 'assertive' : 'polite'

  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      className={cx(styles.toast, styles[variant], leaving && styles.leaving)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon name={VARIANT_ICON[variant]} size={20} className={styles.icon} />
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        {description && <div className={styles.description}>{description}</div>}
        {action && (
          <Button
            variant="text"
            size="sm"
            className={styles.action}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
      {dismissible && (
        <IconButton
          icon="close"
          size="sm"
          variant="standard"
          aria-label="알림 닫기"
          className={styles.close}
          onClick={() => dismiss(id)}
        />
      )}
    </div>
  )
}
