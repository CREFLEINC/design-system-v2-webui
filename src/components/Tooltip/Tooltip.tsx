import {
  cloneElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cx } from '../../utils/cx'
import styles from './Tooltip.module.css'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'content'> {
  /** 툴팁에 표시할 비대화형 내용 (짧은 라벨 권장) */
  content: ReactNode
  /** 앵커(트리거) 대비 배치. 기본 'top' */
  placement?: TooltipPlacement
  /** hover/focus 후 표시까지 지연(ms). 기본 400 */
  delay?: number
  /**
   * 단일 트리거 엘리먼트. cloneElement로 aria-describedby가 주입되므로
   * 반드시 하나의 포커스 가능한 엘리먼트여야 한다 (button, a, input 등).
   */
  children: ReactElement
}

export const Tooltip = forwardRef<HTMLSpanElement, TooltipProps>(function Tooltip(
  {
    content,
    placement = 'top',
    delay = 400,
    children,
    className,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const tooltipId = useId()

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }

  const show = () => {
    clearTimer()
    timerRef.current = setTimeout(() => setOpen(true), delay)
  }

  const hide = () => {
    clearTimer()
    setOpen(false)
  }

  // 언마운트 시 타이머 정리 (누수/경고 방지)
  useEffect(() => () => clearTimer(), [])

  // 열렸을 때만 자식에 aria-describedby 주입(기존 값과 병합)
  const childDescribedBy = (children.props as { 'aria-describedby'?: string })['aria-describedby']
  const mergedDescribedBy = open
    ? cx(childDescribedBy, tooltipId) || undefined
    : childDescribedBy

  const trigger = cloneElement(children, {
    'aria-describedby': mergedDescribedBy,
  } as Partial<{ 'aria-describedby'?: string }>)

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    onKeyDown?.(e)
    if (e.key === 'Escape') hide()
  }

  return (
    <span
      ref={ref}
      className={cx(styles.root, className)}
      onMouseEnter={(e) => {
        onMouseEnter?.(e)
        show()
      }}
      onMouseLeave={(e) => {
        onMouseLeave?.(e)
        hide()
      }}
      onFocus={(e) => {
        onFocus?.(e)
        show()
      }}
      onBlur={(e) => {
        onBlur?.(e)
        hide()
      }}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {trigger}
      {open && (
        <span id={tooltipId} role="tooltip" className={cx(styles.tooltip, styles[placement])}>
          {content}
        </span>
      )}
    </span>
  )
})
