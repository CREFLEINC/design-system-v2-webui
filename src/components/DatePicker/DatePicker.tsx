import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import {
  addDaysISO,
  addMonthsISO,
  clampISO,
  daysInMonth,
  isValidISO,
  monthGrid,
  parseISO,
  todayISO,
  weekdayISO,
} from './dateUtils'
import styles from './DatePicker.module.css'

export type DatePickerSize = 'sm' | 'md' | 'lg' | 'xl'

/** 표시·중간 상태용 기간 값 — 반쪽만 채워질 수 있다. onChange가 방출하는 완결 쌍은 [string, string]이다. */
export type DateRangeValue = [from: string | null, to: string | null]

interface DatePickerBaseProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value' | 'defaultValue'> {
  /** 'YYYY-MM-DD' — 이 날짜 미만은 선택 불가 */
  min?: string
  /** 'YYYY-MM-DD' — 이 날짜 초과는 선택 불가 */
  max?: string
  /** 값이 없을 때 트리거에 표시 (색: --on-surface-muted) */
  placeholder?: string
  /** 트리거 높이 4단. xl은 터치 단말용 — 달력 날짜 셀도 함께 커진다 */
  size?: DatePickerSize
  disabled?: boolean
  /** 에러 상태 — aria-invalid + --semantic-error 보더 */
  invalid?: boolean
  /** 트리거 id — 외부 <label htmlFor>와 연결. 미지정 시 useId 자동 생성 */
  id?: string
  /** 월·요일 라벨 렌더 로케일. 주 시작 요일(일요일)과 값 표시 형식('YYYY-MM-DD')은
   *  로케일과 무관하게 고정이다 — 셸마다 갈리는 것을 없애는 것이 이 컴포넌트의 목적이다 */
  locale?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

export interface DatePickerSingleProps extends DatePickerBaseProps {
  mode?: 'single'
  /** controlled 선택값. undefined면 uncontrolled */
  value?: string | null
  /** uncontrolled 초기값 */
  defaultValue?: string | null
  onChange?: (value: string) => void
  /** 지정 시 폼 제출용 hidden input 렌더 (단일 모드 전용) */
  name?: string
}

export interface DatePickerRangeProps extends DatePickerBaseProps {
  mode: 'range'
  /** controlled 기간 값. 반쪽([from, null])도 표시할 수 있다 */
  value?: DateRangeValue | null
  defaultValue?: DateRangeValue | null
  /** 완결 쌍만 방출한다 — from <= to는 컴포넌트가 보장한다(어떤 조작 순서에서도) */
  onChange?: (value: [from: string, to: string]) => void
}

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps

/** 요일 헤더 라벨의 기준 주 — 2024-01-07(일요일)부터 7일. 값 연산이 아니라 라벨 렌더 전용이다. */
const WEEKDAY_REF_YEAR = 2024
const WEEKDAY_REF_MONTH0 = 0
const WEEKDAY_REF_SUNDAY = 7

/** 유효한 'YYYY-MM-DD'만 통과시킨다. 형식 오류·비실존 날짜는 미선택(null)으로 취급한다. */
function readDate(v: unknown): string | null {
  return typeof v === 'string' && isValidISO(v) ? v : null
}

function readRange(v: unknown): [string | null, string | null] {
  if (!Array.isArray(v)) return [null, null]
  return [readDate(v[0]), readDate(v[1])]
}

/** 트리거 표시 문자열. 형식은 고정 — 'YYYY-MM-DD ~ YYYY-MM-DD', 반쪽이면 'YYYY-MM-DD ~'. */
function formatRange(from: string, to: string | null): string {
  return to === null ? `${from} ~` : `${from} ~ ${to}`
}

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  props,
  ref
) {
  const {
    min,
    max,
    placeholder,
    size = 'md',
    disabled = false,
    invalid = false,
    id,
    locale = 'ko-KR',
    className,
    name,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    mode,
    value,
    defaultValue,
    // 판별 유니온이라 여기서 꺼낸 onChange를 직접 호출하면 시그니처 내로잉이 풀린다.
    // 방출은 commitSingle/commitRange에서 props.mode로 좁혀 호출한다. 여기선 rest에서 걷어내기만 한다.
    onChange: _onChange,
    ...rest
  } = props

  const isRange = mode === 'range'

  const reactId = useId()
  const baseId = id ?? reactId
  const dialogId = `${baseId}-dialog`
  const monthLabelId = `${baseId}-month`

  // 소비자가 넘긴 경계값도 유효한 ISO만 받아들인다(형식 오류는 경계 없음으로 취급).
  const minISO = readDate(min) ?? undefined
  const maxISO = readDate(max) ?? undefined

  const isControlled = value !== undefined
  const [inner, setInner] = useState<string | DateRangeValue | null>(defaultValue ?? null)
  const raw = isControlled ? value : inner
  const [selFrom, selTo]: [string | null, string | null] = isRange
    ? readRange(raw)
    : [readDate(raw), null]

  const [open, setOpen] = useState(false)
  /** 기간 모드에서 첫 확정만 끝난 중간 상태. 완결 전까지 밖으로 나가지 않는다. */
  const [pending, setPending] = useState<string | null>(null)
  /** roving tabindex의 활성 날짜. 표시 월도 이 값에서 파생된다(단일 진실원). */
  const [activeISO, setActiveISO] = useState<string>(() =>
    clampISO(selFrom ?? todayISO(), minISO, maxISO)
  )

  const rootRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const setTriggerRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }
  /** true면 다음 렌더에서 활성 셀로 포커스를 옮긴다. 월 이동 버튼은 포커스를 버튼에 남긴다(APG). */
  const wantsCellFocus = useRef(false)

  const today = todayISO()
  const { year: viewYear, month: viewMonth, day: activeDay } = parseISO(activeISO)
  const grid = useMemo(() => monthGrid(viewYear, viewMonth), [viewYear, viewMonth])

  // 표시 월의 첫날·말일 — 월 이동 버튼의 비활성 판정에 쓴다(날짜 산술은 전부 유틸 경유).
  const monthFirst = addDaysISO(activeISO, 1 - activeDay)
  const monthLast = addDaysISO(monthFirst, daysInMonth(viewYear, viewMonth) - 1)
  const prevDisabled = minISO !== undefined && minISO >= monthFirst
  const nextDisabled = maxISO !== undefined && maxISO <= monthLast

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(
        new Date(viewYear, viewMonth - 1, 1)
      ),
    [locale, viewYear, viewMonth]
  )

  const weekdayLabels = useMemo(() => {
    const short = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    const long = new Intl.DateTimeFormat(locale, { weekday: 'long' })
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(WEEKDAY_REF_YEAR, WEEKDAY_REF_MONTH0, WEEKDAY_REF_SUNDAY + i)
      return { short: short.format(d), long: long.format(d) }
    })
  }, [locale])

  const isOutOfRange = (iso: string) =>
    (minISO !== undefined && iso < minISO) || (maxISO !== undefined && iso > maxISO)

  const focusTrigger = () => triggerRef.current?.focus()

  const closePopup = () => {
    setOpen(false)
    setPending(null)
  }

  const openPopup = () => {
    // 표시 월 = 선택일(기간은 from)의 월, 없으면 오늘. 범위 밖이면 클램프.
    setActiveISO(clampISO(selFrom ?? todayISO(), minISO, maxISO))
    setPending(null)
    wantsCellFocus.current = true
    setOpen(true)
  }

  /** 활성 셀 이동 — 항상 [min, max] 안으로 클램프하고 포커스가 따라가게 한다. */
  const moveActive = (next: string) => {
    const clamped = clampISO(next, minISO, maxISO)
    if (clamped === activeISO) return
    wantsCellFocus.current = true
    setActiveISO(clamped)
  }

  /** 월 헤더 이동 — 포커스는 누른 버튼에 남는다(반복 클릭 가능해야 하므로). */
  const shiftMonth = (delta: number) => {
    setActiveISO(clampISO(addMonthsISO(activeISO, delta), minISO, maxISO))
  }

  const commitSingle = (iso: string) => {
    if (!isControlled) setInner(iso)
    if (props.mode !== 'range') props.onChange?.(iso)
    closePopup()
    focusTrigger()
  }

  const commitRange = (from: string, to: string) => {
    if (!isControlled) setInner([from, to])
    if (props.mode === 'range') props.onChange?.([from, to])
    closePopup()
    focusTrigger()
  }

  /**
   * 날짜 확정 — 기간 불변식(from <= to)을 강제하는 **유일한** 지점.
   * 두 번째 확정이 첫 번째보다 이르면 방출하지 않고 그 날짜를 새 from으로 삼아 재시작한다.
   * 따라서 어떤 조작 순서에서도 onChange는 from <= to인 완결 쌍만 방출한다.
   */
  const confirmDate = (iso: string) => {
    if (isOutOfRange(iso)) return
    if (!isRange) {
      commitSingle(iso)
      return
    }
    if (pending === null || iso < pending) {
      setPending(iso)
      return
    }
    commitRange(pending, iso)
  }

  const handleCellClick = (iso: string) => {
    if (isOutOfRange(iso)) return
    setActiveISO(iso)
    confirmDate(iso)
  }

  const handleTriggerClick = () => {
    if (disabled) return
    if (open) {
      closePopup()
      return
    }
    openPopup()
  }

  const handleTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    // Enter·Space는 native button click으로 이미 열린다(handleTriggerClick).
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      openPopup()
      return
    }
    if (open && e.key === 'Escape') {
      e.preventDefault()
      closePopup()
    }
  }

  /** 다이얼로그 안에서 Tab이 도달할 요소 — 문서 순서: 이전 달 → 다음 달 → 활성 셀. */
  const focusableItems = (): HTMLElement[] => {
    const root = popupRef.current
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>('button, td[tabindex="0"]')).filter(
      (el) => !(el as HTMLButtonElement).disabled
    )
  }

  const handleDialogKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closePopup()
      focusTrigger()
      return
    }
    if (e.key !== 'Tab') return
    const items = focusableItems()
    if (items.length === 0) return
    // 자체 미니 포커스 트랩 — 런타임 의존성 0 유지.
    e.preventDefault()
    const current = items.indexOf(document.activeElement as HTMLElement)
    const last = items.length - 1
    const nextIndex = e.shiftKey
      ? current <= 0
        ? last
        : current - 1
      : current === -1 || current === last
        ? 0
        : current + 1
    items[nextIndex].focus()
  }

  const handleGridKeyDown = (e: ReactKeyboardEvent<HTMLTableElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        moveActive(addDaysISO(activeISO, -1))
        break
      case 'ArrowRight':
        e.preventDefault()
        moveActive(addDaysISO(activeISO, 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        moveActive(addDaysISO(activeISO, -7))
        break
      case 'ArrowDown':
        e.preventDefault()
        moveActive(addDaysISO(activeISO, 7))
        break
      case 'Home':
        e.preventDefault()
        moveActive(addDaysISO(activeISO, -weekdayISO(activeISO)))
        break
      case 'End':
        e.preventDefault()
        moveActive(addDaysISO(activeISO, 6 - weekdayISO(activeISO)))
        break
      case 'PageUp':
        e.preventDefault()
        moveActive(addMonthsISO(activeISO, e.shiftKey ? -12 : -1))
        break
      case 'PageDown':
        e.preventDefault()
        moveActive(addMonthsISO(activeISO, e.shiftKey ? 12 : 1))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        confirmDate(activeISO)
        break
      default:
        break
    }
  }

  // 바깥 클릭 시 닫기 (Select와 동일 — portal 없이 pointerdown으로 판정)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closePopup()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // 열릴 때·키보드 이동 시 활성 셀로 포커스를 옮긴다.
  useEffect(() => {
    if (!open || !wantsCellFocus.current) return
    wantsCellFocus.current = false
    popupRef.current?.querySelector<HTMLElement>('td[tabindex="0"]')?.focus()
  }, [open, activeISO])

  const displayText = isRange
    ? pending !== null
      ? formatRange(pending, null)
      : selFrom !== null
        ? formatRange(selFrom, selTo)
        : null
    : selFrom

  const renderCell = (iso: string) => {
    const outOfRange = isOutOfRange(iso)
    // 기간 진행 중에는 pending 하나만 강조한다(hover 프리뷰는 범위 밖).
    const isEdge = isRange
      ? pending !== null
        ? iso === pending
        : iso === selFrom || iso === selTo
      : iso === selFrom
    const isBetween =
      isRange &&
      pending === null &&
      selFrom !== null &&
      selTo !== null &&
      iso > selFrom &&
      iso < selTo
    const isToday = iso === today

    return (
      <td
        key={iso}
        role="gridcell"
        data-date={iso}
        className={cx(
          styles.cell,
          styles[size],
          isEdge && styles.selected,
          isBetween && styles.inRange,
          isToday && styles.today,
          outOfRange && styles.cellDisabled
        )}
        tabIndex={iso === activeISO ? 0 : -1}
        aria-selected={isEdge || isBetween}
        aria-disabled={outOfRange || undefined}
        aria-current={isToday ? 'date' : undefined}
        onClick={() => handleCellClick(iso)}
      >
        {parseISO(iso).day}
      </td>
    )
  }

  return (
    <div ref={rootRef} className={cx(styles.root, className)}>
      <button
        {...rest}
        ref={setTriggerRef}
        id={baseId}
        type="button"
        className={cx(
          styles.trigger,
          styles[size],
          open && styles.open,
          invalid && styles.invalid
        )}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        onClick={(e) => {
          rest.onClick?.(e)
          handleTriggerClick()
        }}
        onKeyDown={(e) => {
          rest.onKeyDown?.(e)
          handleTriggerKeyDown(e)
        }}
      >
        <span className={cx(styles.value, displayText === null && styles.placeholder)}>
          {displayText ?? placeholder}
        </span>
        <span className={styles.calendarIcon} aria-hidden="true">
          <Icon name="calendar_today" size={20} />
        </span>
      </button>

      {open && (
        <div
          ref={popupRef}
          id={dialogId}
          role="dialog"
          aria-modal="true"
          aria-label={isRange ? '기간 선택' : '날짜 선택'}
          className={styles.popup}
          onKeyDown={handleDialogKeyDown}
        >
          <div className={styles.header}>
            <button
              type="button"
              className={styles.nav}
              aria-label="이전 달"
              disabled={prevDisabled}
              onClick={() => shiftMonth(-1)}
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <div id={monthLabelId} className={styles.monthLabel} aria-live="polite">
              {monthLabel}
            </div>
            <button
              type="button"
              className={styles.nav}
              aria-label="다음 달"
              disabled={nextDisabled}
              onClick={() => shiftMonth(1)}
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>

          <table
            role="grid"
            aria-labelledby={monthLabelId}
            className={cx(styles.grid, styles[size])}
            onKeyDown={handleGridKeyDown}
          >
            <thead>
              <tr>
                {weekdayLabels.map((w) => (
                  <th
                    key={w.long}
                    scope="col"
                    abbr={w.long}
                    className={cx(styles.weekday, styles[size])}
                  >
                    {w.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((week, r) => (
                <tr key={`week-${r}`}>
                  {week.map((iso, c) =>
                    iso === null ? (
                      <td
                        key={`empty-${r}-${c}`}
                        role="gridcell"
                        className={cx(styles.cell, styles[size], styles.cellEmpty)}
                      />
                    ) : (
                      renderCell(iso)
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isRange && name && <input type="hidden" name={name} value={selFrom ?? ''} />}
    </div>
  )
})
