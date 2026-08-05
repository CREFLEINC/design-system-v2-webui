import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  addDaysISO,
  addMonths,
  addMonthsISO,
  clampISO,
  daysInMonth,
  firstWeekday,
  isValidISO,
  monthGrid,
  parseISO,
  todayISO,
  weekdayISO,
} from './dateUtils'

// ── isValidISO ──────────────────────────────────────────────

test('isValidISO: 형식이 올바르고 실존하는 날짜는 유효하다', () => {
  expect(isValidISO('2026-08-04')).toBe(true)
  expect(isValidISO('2026-01-01')).toBe(true)
  expect(isValidISO('2026-12-31')).toBe(true)
})

test('isValidISO: 형식 오류 문자열은 무효하다', () => {
  expect(isValidISO('2026/08/04')).toBe(false)
  expect(isValidISO('2026-8-4')).toBe(false)
  expect(isValidISO('26-08-04')).toBe(false)
  expect(isValidISO('2026-08')).toBe(false)
  expect(isValidISO('not-a-date')).toBe(false)
  expect(isValidISO('')).toBe(false)
})

test('isValidISO: 존재하지 않는 날짜는 무효하다', () => {
  expect(isValidISO('2026-02-30')).toBe(false) // 2월은 30일 없음
  expect(isValidISO('2026-13-01')).toBe(false) // 13월 없음
  expect(isValidISO('2026-00-10')).toBe(false) // 0월 없음
  expect(isValidISO('2026-04-31')).toBe(false) // 4월은 31일 없음
})

test('isValidISO: 윤년 2024-02-29는 유효, 평년 2023-02-29는 무효', () => {
  expect(isValidISO('2024-02-29')).toBe(true)
  expect(isValidISO('2023-02-29')).toBe(false)
})

test('isValidISO: 400년 규칙(2000년)은 윤년, 100년 규칙(1900년)은 평년', () => {
  expect(isValidISO('2000-02-29')).toBe(true)
  expect(isValidISO('1900-02-29')).toBe(false)
})

// ── todayISO ────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test('todayISO: 로컬 y/m/d를 YYYY-MM-DD로 반환한다', () => {
  vi.setSystemTime(new Date(2026, 7, 4, 15, 30)) // 2026-08-04 로컬
  expect(todayISO()).toBe('2026-08-04')
})

test('todayISO: 자정 근처에서도 로컬 날짜를 그대로 반환한다', () => {
  vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 1))
  expect(todayISO()).toBe('2026-01-01')
})

// ── daysInMonth ─────────────────────────────────────────────

test('daysInMonth: 1월은 31일', () => {
  expect(daysInMonth(2026, 1)).toBe(31)
})

test('daysInMonth: 2월은 평년 28일, 윤년 29일', () => {
  expect(daysInMonth(2023, 2)).toBe(28)
  expect(daysInMonth(2024, 2)).toBe(29)
})

test('daysInMonth: 4월은 30일', () => {
  expect(daysInMonth(2026, 4)).toBe(30)
})

// ── firstWeekday ────────────────────────────────────────────

test('firstWeekday: 2026년 8월 1일은 토요일(6)이다', () => {
  expect(firstWeekday(2026, 8)).toBe(6)
})

test('firstWeekday: 2026년 1월 1일은 목요일(4)이다', () => {
  expect(firstWeekday(2026, 1)).toBe(4)
})

// ── addDaysISO ──────────────────────────────────────────────

test('addDaysISO: 월 경계를 넘는다 (1월 31일 + 1일)', () => {
  expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01')
})

test('addDaysISO: 연 경계를 넘는다 (12월 31일 + 1일)', () => {
  expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01')
})

test('addDaysISO: 윤년 2월 28일 + 1일 = 2월 29일', () => {
  expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29')
})

test('addDaysISO: 평년 2월 28일 + 1일 = 3월 1일', () => {
  expect(addDaysISO('2023-02-28', 1)).toBe('2023-03-01')
})

test('addDaysISO: 음수 delta로 과거로 이동한다 (3월 1일 - 1일)', () => {
  expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
})

// ── addMonths ───────────────────────────────────────────────

test('addMonths: 12월에서 +1개월은 익년 1월', () => {
  expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
})

test('addMonths: 1월에서 -1개월은 전년 12월', () => {
  expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
})

test('addMonths: 같은 해 안에서 이동한다', () => {
  expect(addMonths(2026, 6, 3)).toEqual({ year: 2026, month: 9 })
})

// ── clampISO ────────────────────────────────────────────────

test('clampISO: min보다 이르면 min으로 자른다', () => {
  expect(clampISO('2026-01-01', '2026-06-01', undefined)).toBe('2026-06-01')
})

test('clampISO: max보다 늦으면 max로 자른다', () => {
  expect(clampISO('2026-12-01', undefined, '2026-06-01')).toBe('2026-06-01')
})

test('clampISO: 범위 안이면 그대로 반환한다', () => {
  expect(clampISO('2026-06-15', '2026-06-01', '2026-06-30')).toBe('2026-06-15')
})

test('clampISO: min·max 미지정이면 그대로 반환한다', () => {
  expect(clampISO('2026-06-15')).toBe('2026-06-15')
})

// ── monthGrid ───────────────────────────────────────────────

test('monthGrid: 2026년 8월 실측 대조 — 1일=토요일, 31일까지, 6행×7열, 선두 6칸 null', () => {
  const grid = monthGrid(2026, 8)
  expect(grid).toHaveLength(6)
  grid.forEach((row) => expect(row).toHaveLength(7))

  // 선두 6칸(일~금)은 이웃 달 자리 — null
  expect(grid[0].slice(0, 6)).toEqual([null, null, null, null, null, null])
  // 1일은 토요일(그리드 첫 주 마지막 칸)
  expect(grid[0][6]).toBe('2026-08-01')
  // 31일까지 존재
  const flat = grid.flat()
  expect(flat.filter((c): c is string => c !== null)).toHaveLength(31)
  expect(flat).toContain('2026-08-31')
  // 마지막 행 뒤쪽은 다음 달 자리 — null로 채워짐 (8/1=토요일 시작이므로 31일은 마지막 행 두 번째 칸)
  expect(grid[5][1]).toBe('2026-08-31')
  expect(grid[5].slice(2)).toEqual([null, null, null, null, null])
})

test('monthGrid: 항상 6행 × 7열을 반환한다 (다른 달에서도)', () => {
  const grid = monthGrid(2023, 2) // 평년 2월, 28일
  expect(grid).toHaveLength(6)
  grid.forEach((row) => expect(row).toHaveLength(7))
  const flat = grid.flat()
  expect(flat.filter((c): c is string => c !== null)).toHaveLength(28)
})

// ── 문자열 비교 = 시간순 비교 ───────────────────────────────

test('from <= to 불변식은 문자열 비교로 성립한다 (사전순 = 시간순)', () => {
  expect('2026-01-09' <= '2026-01-10').toBe(true) // 자릿수 안 맞춰도 zero-pad 덕에 안전
  expect('2026-09-30' <= '2026-10-01').toBe(true) // 월 경계
  expect('2026-12-31' <= '2027-01-01').toBe(true) // 연 경계
  expect('2026-06-15' <= '2026-06-15').toBe(true) // 같은 날 (from === to 허용)
  expect('2026-06-16' <= '2026-06-15').toBe(false)
})

// ── parseISO (wave-1 재작업 1회차 추가) ─────────────────────

test('parseISO: YYYY-MM-DD를 { year, month, day }로 분해한다', () => {
  expect(parseISO('2026-08-04')).toEqual({ year: 2026, month: 8, day: 4 })
})

// ── weekdayISO (wave-1 재작업 1회차 추가) ───────────────────

test('weekdayISO: 임의 날짜의 요일을 반환한다 (0=일요일)', () => {
  expect(weekdayISO('2026-08-01')).toBe(6) // 토요일
  expect(weekdayISO('2026-08-04')).toBe(2) // 화요일
  expect(weekdayISO('2026-01-01')).toBe(4) // 목요일
})

// ── addMonthsISO (wave-1 재작업 1회차 추가) ─────────────────

test('addMonthsISO: 대상 월에 해당 일이 없으면 말일로 클램프한다 (1/31 + 1개월)', () => {
  expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28')
})

test('addMonthsISO: 윤년 2월 말일로 클램프한다 (1/31 + 1개월, 윤년)', () => {
  expect(addMonthsISO('2024-01-31', 1)).toBe('2024-02-29')
})

test('addMonthsISO: 연 단위 이동(delta=±12)도 말일 클램프를 적용한다', () => {
  expect(addMonthsISO('2024-02-29', 12)).toBe('2025-02-28') // 윤년 2/29 → 평년 2/28
})

test('addMonthsISO: 음수 delta로 이동해도 말일 클램프가 적용된다 (3/31 - 1개월)', () => {
  expect(addMonthsISO('2026-03-31', -1)).toBe('2026-02-28')
})

test('addMonthsISO: 대상 월에 해당 일이 있으면 일(day)을 그대로 보존한다', () => {
  expect(addMonthsISO('2026-06-15', 1)).toBe('2026-07-15')
})

test('addMonthsISO: 연 경계를 넘어 이동한다 (12월 + 1개월 → 익년 1월)', () => {
  expect(addMonthsISO('2026-12-15', 1)).toBe('2027-01-15')
})
