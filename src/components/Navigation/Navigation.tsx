import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref
} from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import { IconButton } from '../IconButton/IconButton'
import styles from './Navigation.module.css'

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

interface SidebarContextValue {
  collapsed: boolean
}

const SidebarContext = createContext<SidebarContextValue>({ collapsed: false })

export interface SidebarProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** nav 랜드마크 접근성 라벨. 페이지에 nav가 둘 이상일 때 필수적으로 권장 */
  'aria-label'?: string
  /** 상단 브랜드/로고 슬롯 (선택) */
  header?: ReactNode
  /** 하단 슬롯(사용자/설정 등, 선택) */
  footer?: ReactNode
  /** 접힘 토글(IconButton) 노출 여부. 기본 true */
  collapsible?: boolean
  /** 제어 모드 접힘 상태. 지정 시 내부 상태를 쓰지 않는다 (IconButton pressed 패턴) */
  collapsed?: boolean
  /** 비제어 초기 접힘 상태. 기본 false */
  defaultCollapsed?: boolean
  /** 접힘이 바뀌려 할 때 호출 (제어/비제어 공통) */
  onCollapsedChange?: (collapsed: boolean) => void
  /** SidebarItem / SidebarSection 들 */
  children: ReactNode
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  {
    header,
    footer,
    collapsible = true,
    collapsed,
    defaultCollapsed = false,
    onCollapsedChange,
    className,
    children,
    ...rest
  },
  ref
) {
  const listId = useId()
  const isControlled = collapsed !== undefined
  const [internal, setInternal] = useState(defaultCollapsed)
  const isCollapsed = isControlled ? collapsed : internal

  const handleToggle = () => {
    const next = !isCollapsed
    if (!isControlled) setInternal(next)
    onCollapsedChange?.(next)
  }

  const listRef = useRef<HTMLDivElement>(null)

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const container = listRef.current
    if (!container) return
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[data-sidebar-item]:not([aria-disabled="true"])')
    )
    if (items.length === 0) return
    const activeEl = document.activeElement as HTMLElement | null
    const currentIndex = activeEl ? items.indexOf(activeEl) : -1

    let nextIndex: number | undefined
    switch (e.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1 + items.length) % items.length
        break
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + items.length) % items.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = items.length - 1
        break
      default:
        return
    }
    e.preventDefault()
    items[nextIndex]?.focus()
  }

  return (
    <nav
      ref={ref}
      className={cx(styles.sidebar, className)}
      {...rest}
      data-collapsed={isCollapsed}
    >
      {(header || collapsible) && (
        <div className={styles.header}>
          {header && <div className={styles.headerSlot}>{header}</div>}
          {collapsible && (
            <IconButton
              icon={isCollapsed ? 'menu' : 'menu_open'}
              aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
              aria-expanded={!isCollapsed}
              aria-controls={listId}
              variant="standard"
              onClick={handleToggle}
              className={styles.toggle}
            />
          )}
        </div>
      )}
      <SidebarContext.Provider value={{ collapsed: isCollapsed }}>
        <div ref={listRef} id={listId} className={styles.list} onKeyDown={onKeyDown}>
          {children}
        </div>
      </SidebarContext.Provider>
      {footer && <div className={styles.footer}>{footer}</div>}
    </nav>
  )
})

/* ------------------------------------------------------------------ */
/* SidebarItem                                                         */
/* ------------------------------------------------------------------ */

export interface SidebarItemProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  /** Material Symbols 아이콘 이름(리가처). 예: 'dashboard'. 장식(aria-hidden) — 접근명은 라벨에서 온다 */
  icon: string
  /** 항목 라벨(가시 텍스트). collapsed에서도 접근명 보존 위해 visually-hidden 처리(display:none 아님) */
  children: ReactNode
  /** SPA 링크 href. 있으면 <a>, 없으면 <button type=button> 로 렌더 */
  href?: string
  /** 현재 페이지면 true → aria-current="page" + active 스타일(--primary-container) */
  active?: boolean
  /** 비활성 — tabIndex=-1, aria-disabled, 클릭/화살표 이동에서 제외 */
  disabled?: boolean
  /** 후행 배지/카운트(선택). 보통 <Badge>3</Badge>. collapsed에선 코너 dot로 축약 */
  badge?: ReactNode
}

export const SidebarItem = forwardRef<HTMLAnchorElement, SidebarItemProps>(function SidebarItem(
  { icon, children, href, active = false, disabled = false, badge, className, onClick, ...rest },
  ref
) {
  const { collapsed } = useContext(SidebarContext)

  const handleClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    onClick?.(e)
  }

  const itemClass = cx(styles.item, active && styles.active, disabled && styles.disabled, className)

  const commonProps = {
    className: itemClass,
    'data-sidebar-item': true,
    'aria-current': active ? ('page' as const) : undefined,
    'aria-disabled': disabled || undefined,
    tabIndex: disabled ? -1 : undefined
  }

  const content = (
    <>
      <Icon name={icon} size={24} className={styles.icon} />
      <span className={cx(styles.label, collapsed && styles.labelHidden)}>{children}</span>
      {badge && (
        <span className={cx(styles.badge, collapsed && styles.badgeDot)}>
          {collapsed ? null : badge}
        </span>
      )}
    </>
  )

  if (href !== undefined) {
    return (
      <a ref={ref} href={href} {...rest} {...commonProps} onClick={handleClick}>
        {content}
      </a>
    )
  }

  // href 없음 → <button type="button">. 링크와 동일한 접근성 속성(aria-current/aria-disabled 등)을 재사용하되
  // 포커스 대상 엘리먼트 타입은 SidebarItemProps 계약(AnchorHTMLAttributes)상 HTMLAnchorElement로 고정되어 있어
  // 여기서만 button 렌더용으로 좁혀 캐스팅한다(다른 Tier1/2 컴포넌트엔 없는 href-분기 전용 처리).
  const buttonRef = ref as unknown as Ref<HTMLButtonElement>
  const buttonRest = rest as HTMLAttributes<HTMLButtonElement>
  const buttonClick = handleClick as unknown as (e: ReactMouseEvent<HTMLButtonElement>) => void

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      {...buttonRest}
      {...commonProps}
      onClick={buttonClick}
    >
      {content}
    </button>
  )
})

/* ------------------------------------------------------------------ */
/* SidebarSection                                                      */
/* ------------------------------------------------------------------ */

export interface SidebarSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** 섹션 라벨 텍스트. role="group"의 aria-label로도 쓰여 collapsed에서도 SR에 보존 */
  label: string
  children: ReactNode
}

export const SidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(function SidebarSection(
  { label, children, className, ...rest },
  ref
) {
  const { collapsed } = useContext(SidebarContext)
  return (
    <div ref={ref} className={cx(styles.section, className)} {...rest} role="group" aria-label={label}>
      <div className={cx(styles.sectionLabel, collapsed && styles.sectionLabelHidden)} aria-hidden="true">
        {label}
      </div>
      {children}
    </div>
  )
})

/* ------------------------------------------------------------------ */
/* Topbar                                                               */
/* ------------------------------------------------------------------ */

export interface TopbarProps extends HTMLAttributes<HTMLElement> {
  /** 좌측 브랜드/로고 슬롯 */
  brand?: ReactNode
  /** 좌중앙 브레드크럼 슬롯 — 제공 시 <nav aria-label="브레드크럼">로 래핑 */
  breadcrumb?: ReactNode
  /** 우측 액션/사용자 슬롯 */
  actions?: ReactNode
  /** banner 랜드마크 라벨(선택) */
  'aria-label'?: string
}

export const Topbar = forwardRef<HTMLElement, TopbarProps>(function Topbar(
  { brand, breadcrumb, actions, className, ...rest },
  ref
) {
  return (
    <header ref={ref} className={cx(styles.topbar, className)} {...rest}>
      {brand && <div className={styles.brand}>{brand}</div>}
      {breadcrumb && (
        <nav aria-label="브레드크럼" className={styles.breadcrumb}>
          {breadcrumb}
        </nav>
      )}
      <div className={styles.spacer} />
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
})
