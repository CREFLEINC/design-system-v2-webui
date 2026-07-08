import { createContext, useCallback, useMemo, useState } from 'react'
import type { HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'
import styles from './Radio.module.css'

export type RadioOrientation = 'vertical' | 'horizontal'

export interface RadioGroupContextValue {
  /** 그룹 내 모든 radio가 공유하는 name (네이티브 roving의 기반) */
  name: string
  /** 현재 선택된 value (없으면 미선택) */
  value: string | undefined
  /** 선택 변경 시 호출 (선택된 radio의 value) */
  onChange: (value: string) => void
  /** 그룹 전체 비활성 */
  disabled?: boolean
}

// Radio가 소비하는 컨텍스트. 그룹 밖에서는 null → Radio가 단독 모드로 동작.
export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** 그룹 name — 하위 Radio들이 공유한다 (필수) */
  name: string
  /** 제어 컴포넌트: 선택된 value */
  value?: string
  /** 비제어 컴포넌트: 초기 선택 value */
  defaultValue?: string
  /** 선택 변경 콜백 (선택된 value) */
  onChange?: (value: string) => void
  /** 그룹 전체 비활성 */
  disabled?: boolean
  /** 배치 방향 (기본 vertical) */
  orientation?: RadioOrientation
  /** 라벨 요소 id (aria-labelledby). 없으면 aria-label 제공 필요 */
  'aria-labelledby'?: string
  'aria-label'?: string
}

export function RadioGroup({
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  orientation = 'vertical',
  className,
  children,
  ...rest
}: RadioGroupProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue)
  const selected = isControlled ? value : internal

  const handleChange = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next)
      onChange?.(next)
    },
    [isControlled, onChange]
  )

  const ctx = useMemo<RadioGroupContextValue>(
    () => ({ name, value: selected, onChange: handleChange, disabled }),
    [name, selected, handleChange, disabled]
  )

  return (
    <RadioGroupContext.Provider value={ctx}>
      <div
        className={cx(styles.group, orientation === 'horizontal' && styles.horizontal, className)}
        role="radiogroup"
        {...rest}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}
