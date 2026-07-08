import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import { IconButton } from '../IconButton/IconButton'
import styles from './AlertBanner.module.css'

export type AlertVariant = 'success' | 'error' | 'warning' | 'info'

// HTMLAttributes.title은 string(브라우저 tooltip)이라 ReactNode title과 충돌 → Omit.
export interface AlertBannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** 시맨틱 유형 — 컨테이너 배경/텍스트/기본 아이콘/라이브 강도를 결정 (기본 'info') */
  variant?: AlertVariant
  /** 굵게 표시되는 제목 (선택) */
  title?: ReactNode
  /** 본문 설명 — children으로 전달 (선택) */
  children?: ReactNode
  /** 앞머리 아이콘 오버라이드. 문자열=Material Symbols 이름, false=아이콘 숨김. 미지정 시 variant별 기본 아이콘 */
  icon?: string | false
  /** 제공되면 우상단 닫기(IconButton)를 렌더하고 클릭 시 호출 */
  onDismiss?: () => void
  /** 닫기 버튼의 접근 가능한 이름 (기본 '닫기') */
  dismissLabel?: string
  /** 액션 슬롯(예: Button). 설명 아래에 렌더 */
  action?: ReactNode
  /**
   * 라이브 영역 강도 오버라이드. 미지정 시 variant로 결정:
   * error/warning → assertive(role="alert"), success/info → polite(role="status").
   */
  assertive?: boolean
}

const DEFAULT_ICON: Record<AlertVariant, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
}

// 컴포넌트 소유 role이 소비자 rest보다 우선해야 하므로 Select 예외 패턴을 따른다:
// {...rest}를 먼저 스프레드하고 role을 그 뒤에 둔다.
export const AlertBanner = forwardRef<HTMLDivElement, AlertBannerProps>(function AlertBanner(
  { variant = 'info', title, children, icon, onDismiss, dismissLabel = '닫기', action, assertive, className, ...rest },
  ref
) {
  const isAssertive = assertive ?? (variant === 'error' || variant === 'warning')
  const role = isAssertive ? 'alert' : 'status'
  const iconName = icon === false ? null : icon ?? DEFAULT_ICON[variant]

  return (
    <div ref={ref} className={cx(styles.root, styles[variant], className)} {...rest} role={role}>
      {iconName && <Icon name={iconName} size={20} className={styles.icon} />}
      <div className={styles.content}>
        {title != null && <div className={styles.title}>{title}</div>}
        {children != null && <div className={styles.description}>{children}</div>}
        {action != null && <div className={styles.action}>{action}</div>}
      </div>
      {onDismiss && (
        <IconButton
          className={styles.dismiss}
          icon="close"
          size="sm"
          variant="standard"
          aria-label={dismissLabel}
          onClick={onDismiss}
        />
      )}
    </div>
  )
})
