import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type HTMLAttributes,
  type ReactNode
} from 'react'
import { cx } from '../../utils/cx'
import styles from './AppShell.module.css'

/** 슬롯(Topbar/Sidebar) 내부의 커스텀 토글이 접힘 상태를 읽고/바꾸기 위한 컨텍스트. AppShell 밖에서 호출 시 throw. */
export interface AppShellContextValue {
  collapsed: boolean
  setCollapsed: (next: boolean) => void
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext)
  if (!ctx) throw new Error('useAppShell은 <AppShell> 내부에서만 호출할 수 있습니다')
  return ctx
}

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /** 상단 바 슬롯. 보통 <Topbar/>. 내부 <header>가 banner 랜드마크를 제공하므로 AppShell은 banner를 중복 생성하지 않는다. (선택) */
  topbar?: ReactNode
  /** 좌측 사이드바 슬롯. 보통 <Sidebar/>. 내부 <nav>가 navigation 랜드마크를 제공한다. (선택) */
  sidebar?: ReactNode
  /** 스크롤되는 <main> 본문 콘텐츠 */
  children: ReactNode
  /** 제어 모드: 사이드바 그리드 컬럼 접힘. 지정 시 내부 상태를 쓰지 않는다 (Sidebar와 동일 패턴) */
  collapsed?: boolean
  /** 비제어 초기 접힘. 기본 false */
  defaultCollapsed?: boolean
  /** 접힘이 바뀔 때 호출 — useAppShell().setCollapsed 또는 슬롯 토글에서 트리거 */
  onCollapsedChange?: (collapsed: boolean) => void
  /** <main> id 겸 skip-link 타깃. 미지정 시 useId로 생성 */
  mainId?: string
  /** skip-to-content 링크 텍스트. 기본 '본문으로 건너뛰기' */
  skipLinkLabel?: string
  /** <main>의 접근명(선택). 지정 시 aria-label 부여 → getByRole('main', { name }) 조회 가능 */
  mainLabel?: string
}

export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(function AppShell(
  {
    topbar,
    sidebar,
    children,
    collapsed,
    defaultCollapsed = false,
    onCollapsedChange,
    mainId,
    skipLinkLabel = '본문으로 건너뛰기',
    mainLabel,
    className,
    ...rest
  },
  ref
) {
  const generatedMainId = useId()
  const resolvedMainId = mainId ?? generatedMainId

  const isControlled = collapsed !== undefined
  const [internal, setInternal] = useState(defaultCollapsed)
  const effectiveCollapsed = isControlled ? collapsed : internal

  const setCollapsed = (next: boolean) => {
    if (!isControlled) setInternal(next)
    onCollapsedChange?.(next)
  }

  return (
    <AppShellContext.Provider value={{ collapsed: effectiveCollapsed, setCollapsed }}>
      <div ref={ref} className={cx(styles.shell, className)} {...rest} data-collapsed={effectiveCollapsed}>
        <a className={styles.skipLink} href={`#${resolvedMainId}`}>
          {skipLinkLabel}
        </a>
        <div className={styles.topbarArea}>{topbar}</div>
        <div className={styles.sidebarArea}>{sidebar}</div>
        <main
          id={resolvedMainId}
          tabIndex={-1}
          aria-label={mainLabel}
          className={styles.main}
        >
          {children}
        </main>
      </div>
    </AppShellContext.Provider>
  )
})
