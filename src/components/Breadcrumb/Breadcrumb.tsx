import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode
} from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import styles from './Breadcrumb.module.css'

export interface BreadcrumbItem {
  /** 표시 라벨 */
  label: ReactNode
  /** 링크 대상. 생략 시 링크가 아닌 텍스트로 렌더. 배열의 마지막 항목은 href가 있어도 현재 위치(비링크)로 렌더된다 */
  href?: string
}

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  /** 경로 항목. 배열 순서 = 계층 순서. 마지막 항목은 항상 현재 페이지(aria-current="page", 비링크) */
  items: BreadcrumbItem[]
  /**
   * 항목 수가 이 값을 초과하면 가운데를 접어 "첫 항목 + … + 마지막 2개"로 축약한다.
   * 미지정(또는 <= 3, 또는 items.length 이상)이면 접지 않는다. 축약이 의미 있으려면 4 이상 권장.
   */
  maxItems?: number
  /** 구분자 Material Symbols 아이콘 이름. 기본 'chevron_right' */
  separatorIcon?: string
  /** 생략(…) 트리거 접근 라벨. 기본 '생략된 경로 펼치기' */
  expandLabel?: string
  /** nav 접근성 라벨. 기본 '탐색 경로' */
  'aria-label'?: string
}

interface RenderEntry {
  key: string
  item: BreadcrumbItem
  isCurrent: boolean
}

// forwardRef 대상 = <nav> (HTMLElement). ...rest는 nav에 마지막 스프레드(consumer wins).
// aria-label은 destructure 기본값으로 흡수 후 명시 지정하므로 소비자 override가 자연히 이긴다.
// role/aria가 소비자를 이겨야 하는 커스텀 위젯이 아니라(네이티브 nav/a 시맨틱) 기본 "consumer wins" 규칙 적용.
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  {
    items,
    maxItems,
    separatorIcon = 'chevron_right',
    expandLabel = '생략된 경로 펼치기',
    'aria-label': ariaLabel = '탐색 경로',
    className,
    ...rest
  },
  ref
) {
  const [expanded, setExpanded] = useState(false)

  // 생략(…) 트리거는 확장 시 unmount되어 포커스가 body로 떨어진다.
  // 확장 직후 첫 번째로 새로 드러난 링크(또는 링크가 없으면 nav 자체)로 포커스를 옮긴다.
  const navRef = useRef<HTMLElement>(null)
  const setNavRefs = useCallback(
    (node: HTMLElement | null) => {
      navRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )
  const firstRevealedRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!expanded) return
    if (firstRevealedRef.current) {
      firstRevealedRef.current.focus()
    } else {
      navRef.current?.focus()
    }
  }, [expanded])

  const shouldCollapse =
    !expanded && maxItems != null && items.length > maxItems && items.length > 3

  const lastIndex = items.length - 1

  let entries: (RenderEntry | { key: string; ellipsis: true })[]

  if (shouldCollapse) {
    entries = [
      { key: 'item-0', item: items[0], isCurrent: 0 === lastIndex },
      { key: 'ellipsis', ellipsis: true },
      { key: `item-${lastIndex - 1}`, item: items[lastIndex - 1], isCurrent: lastIndex - 1 === lastIndex },
      { key: `item-${lastIndex}`, item: items[lastIndex], isCurrent: true }
    ]
  } else {
    entries = items.map((item, idx) => ({
      key: `item-${idx}`,
      item,
      isCurrent: idx === lastIndex
    }))
  }

  return (
    <nav
      ref={setNavRefs}
      tabIndex={-1}
      aria-label={ariaLabel}
      className={cx(styles.root, className)}
      {...rest}
    >
      <ol className={styles.list}>
        {entries.map((entry, idx) => (
          <li className={styles.item} key={entry.key}>
            {idx > 0 && (
              <span className={styles.separator} data-crefle-separator aria-hidden="true">
                <Icon name={separatorIcon} size={18} />
              </span>
            )}
            {'ellipsis' in entry ? (
              <button
                type="button"
                className={styles.ellipsis}
                aria-label={expandLabel}
                aria-expanded={false}
                onClick={() => setExpanded(true)}
              >
                <Icon name="more_horiz" size={18} />
              </button>
            ) : entry.isCurrent ? (
              <span className={styles.current} aria-current="page">
                {entry.item.label}
              </span>
            ) : entry.item.href ? (
              <a
                ref={idx === 1 ? firstRevealedRef : undefined}
                className={styles.link}
                href={entry.item.href}
              >
                {entry.item.label}
              </a>
            ) : (
              <span className={styles.link} data-static>
                {entry.item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
})
