import { forwardRef, type HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import styles from './NumberPad.module.css'

export type NumberPadSize = 'md' | 'lg' | 'xl'

export interface NumberPadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** 현재 입력 버퍼 (controlled). 빈 문자열 = 미입력 */
  value: string
  /** 키 입력으로 버퍼가 바뀔 때 다음 버퍼 문자열로 호출 */
  onChange: (value: string) => void
  /** 버퍼 최대 글자 수('.' 포함). 초과를 만드는 키 입력은 무시된다 */
  maxLength?: number
  /** 숫자 상한. Number(다음 버퍼) > max 가 되는 키 입력은 무시된다 */
  max?: number
  /** true면 소수점 키를 렌더한다 (기본 false — 소수점 키 미렌더) */
  allowDecimal?: boolean
  /** 지정 시에만 확인 키가 렌더된다. 현재 버퍼 문자열로 호출 */
  onConfirm?: (value: string) => void
  /** 키 높이 — 컨트롤 공통 토큰. 기본 'xl'(터치 우선 컴포넌트) */
  size?: NumberPadSize
  /** 전체 키 비활성 */
  disabled?: boolean
}

/* ------------------------------------------------------------------ *
 * 입력 버퍼 규칙 — 순수 함수. 키 입력마다 "후보(candidate) 버퍼"를 만들고
 * 제약을 통과하면 onChange, 실패하면 조용히 무시한다(오류 상태 없음).
 * export하지 않는다 — 컴포넌트의 내부 계약이며 UI 동작으로 검증된다.
 * ------------------------------------------------------------------ */

/**
 * 숫자 키의 후보 버퍼.
 * 선행 0 정규화: 버퍼가 정확히 '0'이면 이어붙이지 않고 대체한다 — '007'이 만들어지지 않는다.
 * ('0'에서 '0'을 누르면 후보가 '0'으로 현재 값과 같아져 commit이 no-op 처리한다.)
 * '.' 뒤의 0은 유의미하므로 그대로 이어붙는다('0.' + '0' → '0.0').
 */
function digitCandidate(value: string, digit: string): string {
  return value === '0' ? digit : value + digit
}

/**
 * 소수점 키의 후보 버퍼.
 * 이미 '.'을 포함하면 null(무시) — 소수점 단일성.
 * 빈 버퍼에서는 '.'만 남기지 않고 '0.'으로 시작한다(길이가 0 → 2로 2글자 점프).
 */
function decimalCandidate(value: string): string | null {
  if (value.includes('.')) return null
  return value === '' ? '0.' : `${value}.`
}

/** C 키의 후보 버퍼 — 전체 지움 (이미 ''이면 commit이 no-op 처리) */
function clearCandidate(): string {
  return ''
}

/** ← 키의 후보 버퍼 — 마지막 한 글자 지움 (''이면 ''이 되어 commit이 no-op 처리) */
function backspaceCandidate(value: string): string {
  return value.slice(0, -1)
}

/**
 * maxLength·max 제약 판정. 통과하면 true.
 * 숫자·소수점 키의 후보에만 적용한다 — 지움 키는 제약을 넘길 수 없다.
 * 후보는 항상 Number로 파싱 가능하다(숫자와 최대 1개의 '.'뿐, Number('9.') === 9).
 * 불변식: 패드 키 입력만으로는 maxLength 초과·Number(value) > max 인 버퍼가 만들어지지 않는다.
 */
function withinConstraints(candidate: string, maxLength?: number, max?: number): boolean {
  if (maxLength !== undefined && candidate.length > maxLength) return false
  if (max !== undefined && Number(candidate) > max) return false
  return true
}

/** 1~9 — 3열 격자에 순서대로 흘러 [1][2][3] / [4][5][6] / [7][8][9] 3행이 된다 */
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** ← 아이콘 크기 — 키 높이에 맞춰 한 단계 키운다 */
const BACKSPACE_ICON_SIZE: Record<NumberPadSize, number> = { md: 20, lg: 20, xl: 24 }

export const NumberPad = forwardRef<HTMLDivElement, NumberPadProps>(function NumberPad(
  {
    value,
    onChange,
    maxLength,
    max,
    allowDecimal = false,
    onConfirm,
    size = 'xl',
    disabled = false,
    className,
    'aria-label': ariaLabel = '숫자 입력 패드',
    ...rest
  },
  ref
) {
  // 결과가 현재 버퍼와 같으면 호출하지 않는다 — 불필요 재렌더·소비자 잡음 방지.
  const commit = (candidate: string | null) => {
    if (candidate === null || candidate === value) return
    onChange(candidate)
  }

  const pressDigit = (digit: string) => {
    const candidate = digitCandidate(value, digit)
    if (!withinConstraints(candidate, maxLength, max)) return
    commit(candidate)
  }

  const pressDecimal = () => {
    const candidate = decimalCandidate(value)
    if (candidate === null || !withinConstraints(candidate, maxLength, max)) return
    commit(candidate)
  }

  const pressClear = () => commit(clearCandidate())

  const pressBackspace = () => commit(backspaceCandidate(value))

  // 확인은 버퍼를 바꾸지 않는다. ''여도 호출한다 — 확정 여부 판단은 소비자 몫.
  const pressConfirm = () => onConfirm?.(value)

  return (
    // 컴포넌트 소유 ARIA는 {...rest} 뒤에 둔다(Select 기준 패턴) — 소비자가 role을 덮어쓰면
    // 패드의 그룹 맥락이 깨진다. aria-label은 구조분해 기본값이라 소비자 값이 이긴다.
    <div
      {...rest}
      ref={ref}
      className={cx(styles.root, styles[size], className)}
      role="group"
      aria-label={ariaLabel}
    >
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          className={styles.key}
          disabled={disabled}
          onClick={() => pressDigit(digit)}
        >
          {digit}
        </button>
      ))}

      {/* 4행 [C][0][←] — 이 12키의 자리는 어떤 설정에서도 바뀌지 않는다.
          C는 파괴적 키라 위치가 흔들리면 습관적 오조작이 입력 전체를 날린다. */}
      <button
        type="button"
        className={cx(styles.key, styles.utility)}
        disabled={disabled}
        onClick={pressClear}
        aria-label="C — 전체 지우기"
      >
        C
      </button>
      <button
        type="button"
        className={styles.key}
        disabled={disabled}
        onClick={() => pressDigit('0')}
      >
        0
      </button>
      <button
        type="button"
        className={cx(styles.key, styles.utility)}
        disabled={disabled}
        onClick={pressBackspace}
        aria-label="한 글자 지우기"
      >
        <Icon name="backspace" size={BACKSPACE_ICON_SIZE[size]} />
      </button>

      {/* 5행은 조건부다 — 불충족 키는 렌더하지 않는다(영구 disabled 키는 "왜 있지"만 남긴다) */}
      {allowDecimal && (
        <button type="button" className={styles.key} disabled={disabled} onClick={pressDecimal}>
          .
        </button>
      )}
      {onConfirm && (
        <button
          type="button"
          className={cx(styles.key, styles.confirm, allowDecimal ? styles.span2 : styles.span3)}
          disabled={disabled}
          onClick={pressConfirm}
        >
          확인
        </button>
      )}
    </div>
  )
})
