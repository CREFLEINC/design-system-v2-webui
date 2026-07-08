import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
  type ReactNode
} from 'react'
import { cx } from '../../utils/cx'
import styles from './Card.module.css'

export type CardSurface = 'base' | 'low' | 'default' | 'high'
export type CardElevation = 0 | 1 | 2 | 3 | 4 | 5

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** 표면 사다리 매핑: base=--surface, low=--surface-container-low, default=--surface-container, high=--surface-container-high */
  surface?: CardSurface
  /** --elevation-0..5 그림자 레벨 (다크에서는 토큰이 자동으로 약화됨) */
  elevation?: CardElevation
  /** 1px --outline-variant 경계선 (장식용). elevation과 독립적으로 병용 가능 */
  bordered?: boolean
  /**
   * true면 전체 카드가 클릭 가능한 <button>으로 렌더 — 상태 레이어 + 포커스 링 + 네이티브 키보드(Enter/Space).
   * ⚠️ interactive 카드는 내부에 다른 포커스 가능한 컨트롤(버튼/링크)을 두면 안 된다(button 중첩은 유효하지 않은 HTML).
   * 카드 안에 자체 버튼/링크가 필요하면 비-interactive Card(div) + 내부 Button 조합을 사용한다.
   */
  interactive?: boolean
  /** interactive일 때만 유효 (button의 disabled로 전달) */
  disabled?: boolean
  children?: ReactNode
}

/** Header/Body/Footer 공통 — 순수 레이아웃 래퍼 (composition 슬롯) */
export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

const surfaceClass: Record<CardSurface, string> = {
  base: styles.base,
  low: styles.low,
  default: styles.default,
  high: styles.high
}

const elevationClass: Record<CardElevation, string | undefined> = {
  0: undefined,
  1: styles.elev1,
  2: styles.elev2,
  3: styles.elev3,
  4: styles.elev4,
  5: styles.elev5
}

const CardRoot = forwardRef<HTMLElement, CardProps>(function Card(
  {
    surface = 'low',
    elevation = 0,
    bordered = false,
    interactive = false,
    disabled = false,
    className,
    children,
    ...rest
  },
  ref
) {
  const rootClass = cx(
    styles.card,
    surfaceClass[surface],
    elevationClass[elevation],
    bordered && styles.bordered,
    interactive && styles.interactive,
    className
  )

  if (interactive) {
    // 네이티브 <button>은 phrasing content만 허용해 CardHeader/Body/Footer의 <div>를
    // 담을 수 없다(유효하지 않은 HTML). role="button" + 수동 키보드 처리로 대체한다.
    const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
      rest.onKeyDown?.(e)
      if (disabled) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.currentTarget.click()
      }
    }

    return (
      <div
        ref={ref as Ref<HTMLDivElement>}
        className={rootClass}
        {...rest}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          if (disabled) return
          rest.onClick?.(e)
        }}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    )
  }

  return (
    <div ref={ref as Ref<HTMLDivElement>} className={rootClass} {...rest}>
      {children}
    </div>
  )
})

export const CardHeader = forwardRef<HTMLDivElement, CardSectionProps>(
  function CardHeader({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} className={cx(styles.header, className)} {...rest}>
        {children}
      </div>
    )
  }
)

export const CardBody = forwardRef<HTMLDivElement, CardSectionProps>(
  function CardBody({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} className={cx(styles.body, className)} {...rest}>
        {children}
      </div>
    )
  }
)

export const CardFooter = forwardRef<HTMLDivElement, CardSectionProps>(
  function CardFooter({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} className={cx(styles.footer, className)} {...rest}>
        {children}
      </div>
    )
  }
)

type CardComponent = typeof CardRoot & {
  Header: typeof CardHeader
  Body: typeof CardBody
  Footer: typeof CardFooter
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter
}) as CardComponent
