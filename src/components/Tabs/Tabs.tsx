import { forwardRef, useId, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './Tabs.module.css'

export type TabsSize = 'sm' | 'md'

export interface TabItem {
  /** 탭·패널을 잇는 안정적 식별자 — value/defaultValue/onChange가 참조한다 */
  value: string
  /** 탭 라벨. 텍스트 또는 <Icon/>+텍스트 등 ReactNode */
  label: ReactNode
  /** 이 탭이 제어하는 패널 내용 */
  content: ReactNode
  /** true면 탭이 비활성 — 클릭·키보드 로빙에서 건너뛴다 */
  disabled?: boolean
  /** 라벨 뒤 후행 뱃지/카운트(선택). 보통 <Badge count={3}/>. SidebarItem.badge와 동일 패턴.
      count 0 숨김/노출은 Badge의 showZero 정책을 따른다 */
  badge?: ReactNode
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** 탭 구성. 순서가 곧 시각·키보드 순서 */
  items: TabItem[]
  /** 제어 모드 — 활성 탭 value. 지정 시 내부 상태를 쓰지 않는다 */
  value?: string
  /** 비제어 모드 초기 활성 탭 value. 미지정 시 첫 번째 enabled 탭 */
  defaultValue?: string
  /** 활성 탭이 바뀔 때 호출 (제어/비제어 공통) */
  onChange?: (value: string) => void
  /** 탭 높이/타이포 스케일. 기본 md */
  size?: TabsSize
  /** tablist에 붙는 접근성 라벨 (탭 그룹의 의미) */
  'aria-label'?: string
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { items, value, defaultValue, onChange, size = 'md', className, 'aria-label': ariaLabel, ...rest },
  ref
) {
  const base = useId()
  const tabId = (v: string) => `${base}-tab-${v}`
  const panelId = (v: string) => `${base}-panel-${v}`
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const firstEnabled = items.find((it) => !it.disabled)?.value
  const isValid = (v: string | undefined) =>
    v !== undefined && items.some((it) => it.value === v && !it.disabled)
  const seed = isValid(defaultValue) ? (defaultValue as string) : firstEnabled

  const isControlled = value !== undefined
  const [internal, setInternal] = useState<string | undefined>(seed)
  const activeValue = isControlled ? value : internal

  const select = (v: string) => {
    const item = items.find((it) => it.value === v)
    if (!item || item.disabled || v === activeValue) return
    if (!isControlled) setInternal(v)
    onChange?.(v)
  }

  const enabledIndexes = () =>
    items.reduce<number[]>((acc, it, i) => {
      if (!it.disabled) acc.push(i)
      return acc
    }, [])

  const moveTo = (index: number) => {
    const target = items[index]
    if (!target) return
    refs.current[target.value]?.focus()
    select(target.value)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = enabledIndexes()
    if (enabled.length === 0) return
    const activeIdx = items.findIndex((it) => it.value === activeValue)
    const pos = enabled.indexOf(activeIdx)

    let nextIndex: number | undefined
    switch (e.key) {
      case 'ArrowRight':
        nextIndex = enabled[(pos + 1 + enabled.length) % enabled.length]
        break
      case 'ArrowLeft':
        nextIndex = enabled[(pos - 1 + enabled.length) % enabled.length]
        break
      case 'Home':
        nextIndex = enabled[0]
        break
      case 'End':
        nextIndex = enabled[enabled.length - 1]
        break
      default:
        return
    }
    e.preventDefault()
    moveTo(nextIndex)
  }

  return (
    <div ref={ref} role="presentation" className={cx(styles.tabs, className)} {...rest}>
      <div role="tablist" aria-label={ariaLabel} className={cx(styles.tablist, styles[size])} onKeyDown={onKeyDown}>
        {items.map((it) => {
          const isActive = it.value === activeValue
          return (
            <button
              key={it.value}
              ref={(el) => {
                refs.current[it.value] = el
              }}
              type="button"
              role="tab"
              id={tabId(it.value)}
              className={cx(styles.tab, isActive && styles.active)}
              aria-selected={isActive}
              aria-controls={panelId(it.value)}
              aria-disabled={it.disabled || undefined}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                if (!it.disabled) select(it.value)
              }}
            >
              {it.label}
              {/* 라벨-뱃지 구분 공백: 접근성 이름이 "결재 대기3"처럼 붙지 않게 한다.
                  공백만 있는 텍스트 노드는 flex 레이아웃에서 렌더되지 않아 시각 간격(gap)에는 영향 없음 */}
              {it.badge != null && ' '}
              {it.badge}
            </button>
          )
        })}
      </div>
      {items.map((it) => (
        <div
          key={it.value}
          role="tabpanel"
          id={panelId(it.value)}
          aria-labelledby={tabId(it.value)}
          tabIndex={0}
          hidden={it.value !== activeValue}
          className={styles.panel}
        >
          {it.content}
        </div>
      ))}
    </div>
  )
})
