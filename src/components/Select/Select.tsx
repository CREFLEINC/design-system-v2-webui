import {
  forwardRef,
  useId,
  useRef,
  useState,
  useEffect,
  useMemo,
  type ButtonHTMLAttributes,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import styles from './Select.module.css'

export type SelectSize = 'sm' | 'md' | 'lg'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectOptionGroup {
  /** 그룹 헤더 라벨 (presentational, role=group의 aria-label 소스) */
  label: string
  options: SelectOption[]
}

/** 평면 옵션 또는 그룹을 섞어서 전달 가능 */
export type SelectItems = Array<SelectOption | SelectOptionGroup>

export interface SelectProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value' | 'defaultValue'> {
  options: SelectItems
  /** controlled 선택값. undefined면 uncontrolled */
  value?: string | null
  /** uncontrolled 초기값 */
  defaultValue?: string | null
  /** 옵션 선택 시 호출. controlled에서는 이걸로 상위 상태를 갱신해야 표시가 바뀐다 */
  onChange?: (value: string) => void
  /** 선택값 없을 때 트리거에 표시 (색: --on-surface-muted) */
  placeholder?: string
  size?: SelectSize
  disabled?: boolean
  /** 에러 상태 — aria-invalid + --semantic-error 보더 */
  invalid?: boolean
  /** 지정 시 폼 제출용 hidden input 렌더 */
  name?: string
  /** 트리거 id — 외부 <label htmlFor>와 연결. 미지정 시 useId 자동 생성 */
  id?: string
  /** 트리거 좌측 장식 아이콘 */
  leadingIcon?: ReactNode
  /** id 라벨이 없을 때의 접근성 이름 */
  'aria-label'?: string
  'aria-labelledby'?: string
}

function isGroup(item: SelectOption | SelectOptionGroup): item is SelectOptionGroup {
  return (item as SelectOptionGroup).options !== undefined
}

interface FlatEntry {
  opt: SelectOption
  id: string
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    options,
    value,
    defaultValue,
    onChange,
    placeholder,
    size = 'md',
    disabled = false,
    invalid = false,
    name,
    id,
    leadingIcon,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    ...rest
  },
  ref
) {
  const reactId = useId()
  const baseId = id ?? reactId
  const listboxId = `${baseId}-listbox`

  const isControlled = value !== undefined
  const [inner, setInner] = useState<string | null>(defaultValue ?? null)
  const selected = isControlled ? value ?? null : inner

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const setTriggerRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  const typeBuffer = useRef('')
  const typeTs = useRef(0)

  const flat = useMemo<FlatEntry[]>(() => {
    const arr: FlatEntry[] = []
    options.forEach((item) => {
      if (isGroup(item)) {
        item.options.forEach((opt) => arr.push({ opt, id: '' }))
      } else {
        arr.push({ opt: item, id: '' })
      }
    })
    return arr.map((e, i) => ({ ...e, id: `${baseId}-opt-${i}` }))
  }, [options, baseId])

  const selectedEntry = flat.find((e) => e.opt.value === selected)

  const firstEnabled = () => flat.findIndex((e) => !e.opt.disabled)
  const lastEnabled = () => {
    for (let i = flat.length - 1; i >= 0; i--) if (!flat[i].opt.disabled) return i
    return -1
  }
  const nextEnabled = (from: number) => {
    for (let i = from + 1; i < flat.length; i++) if (!flat[i].opt.disabled) return i
    return from >= 0 && !flat[from]?.opt.disabled ? from : firstEnabled()
  }
  const prevEnabled = (from: number) => {
    for (let i = from - 1; i >= 0; i--) if (!flat[i].opt.disabled) return i
    return from >= 0 && !flat[from]?.opt.disabled ? from : lastEnabled()
  }

  const focusTrigger = () => triggerRef.current?.focus()

  const openList = () => {
    const initial =
      selectedEntry && !selectedEntry.opt.disabled ? flat.indexOf(selectedEntry) : firstEnabled()
    setActiveIndex(initial)
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setActiveIndex(-1)
  }

  const selectIndex = (i: number) => {
    const entry = flat[i]
    if (!entry || entry.opt.disabled) return
    const v = entry.opt.value
    if (!isControlled) setInner(v)
    onChange?.(v)
    close()
    focusTrigger()
  }

  const typeAhead = (char: string) => {
    const now = Date.now()
    if (now - typeTs.current > 500) typeBuffer.current = ''
    typeTs.current = now
    typeBuffer.current += char.toLowerCase()
    const buf = typeBuffer.current
    const match = flat.findIndex(
      (e) => !e.opt.disabled && e.opt.label.toLowerCase().startsWith(buf)
    )
    if (match < 0) return
    if (open) setActiveIndex(match)
    else selectIndex(match)
  }

  const isPrintable = (e: ReactKeyboardEvent) =>
    e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    const key = e.key
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ' || key === 'Home' || key === 'End') {
        e.preventDefault()
        openList()
        return
      }
      if (isPrintable(e)) {
        e.preventDefault()
        typeAhead(key)
      }
      return
    }
    switch (key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => nextEnabled(i))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => prevEnabled(i))
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(firstEnabled())
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(lastEnabled())
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (activeIndex >= 0) selectIndex(activeIndex)
        break
      case 'Escape':
        e.preventDefault()
        close()
        focusTrigger()
        break
      case 'Tab':
        close()
        break
      default:
        if (isPrintable(e)) {
          e.preventDefault()
          typeAhead(key)
        }
    }
  }

  const handleTriggerClick = () => {
    if (disabled) return
    if (open) close()
    else openList()
  }

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // 활성 옵션 가시 영역 유지
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const el = document.getElementById(flat[activeIndex]?.id ?? '')
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex, flat])

  const activeDescId = open && activeIndex >= 0 ? flat[activeIndex]?.id : undefined

  const renderOption = (opt: SelectOption, i: number) => {
    const entry = flat[i]
    const isSel = opt.value === selected
    const isActive = i === activeIndex
    return (
      <div
        key={entry.id}
        id={entry.id}
        role="option"
        aria-selected={isSel}
        aria-disabled={opt.disabled || undefined}
        className={cx(
          styles.option,
          isActive && styles.optionActive,
          opt.disabled && styles.optionDisabled
        )}
        onClick={() => {
          if (!opt.disabled) selectIndex(i)
        }}
        onMouseMove={() => {
          if (!opt.disabled && activeIndex !== i) setActiveIndex(i)
        }}
      >
        <Icon name="check" size={20} className={styles.check} />
        <span className={styles.optionLabel}>{opt.label}</span>
      </div>
    )
  }

  let counter = -1

  return (
    <div ref={rootRef} className={cx(styles.root, className)}>
      <button
        {...rest}
        ref={setTriggerRef}
        id={baseId}
        type="button"
        role="combobox"
        className={cx(
          styles.trigger,
          styles[size],
          open && styles.open,
          invalid && styles.invalid
        )}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeDescId}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        onClick={(e) => {
          rest.onClick?.(e)
          handleTriggerClick()
        }}
        onKeyDown={(e) => {
          rest.onKeyDown?.(e)
          handleKeyDown(e)
        }}
      >
        {leadingIcon}
        <span className={cx(styles.value, !selectedEntry && styles.placeholder)}>
          {selectedEntry ? selectedEntry.opt.label : placeholder}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          <Icon name="expand_more" size={20} />
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          id={listboxId}
          className={styles.listbox}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
        >
          {options.map((item, gi) => {
            if (isGroup(item)) {
              return (
                <div key={`group-${gi}`} role="group" aria-label={item.label}>
                  <div className={styles.groupLabel} aria-hidden="true">
                    {item.label}
                  </div>
                  {item.options.map((opt) => {
                    counter += 1
                    return renderOption(opt, counter)
                  })}
                </div>
              )
            }
            counter += 1
            return renderOption(item, counter)
          })}
        </div>
      )}

      {name && <input type="hidden" name={name} value={selected ?? ''} />}
    </div>
  )
})
