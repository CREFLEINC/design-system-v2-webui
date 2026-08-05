/**
 * 날짜 유틸 — React 무관 순수 함수 모듈.
 *
 * 값 타입은 항상 'YYYY-MM-DD' 문자열이다. 유효한 ISO 날짜 문자열은
 * 사전순 정렬이 곧 시간순 정렬이므로(`'2026-01-01' <= '2026-01-02'`),
 * 날짜 비교는 별도 함수 없이 문자열 비교(`a <= b`)로 충분하다.
 *
 * 주의: 'YYYY-MM-DD' 형태의 ISO 날짜 문자열을 Date 생성자에 직접 넘기는
 * 파싱은 절대 쓰지 않는다 — 날짜만 있는 ISO 문자열은 UTC 자정으로 해석되어
 * 음수 오프셋 타임존에서 하루가 밀린다. 파싱은 항상 수동으로 split한 뒤 숫자로 변환하고,
 * Date 생성은 로컬 생성자(`new Date(y, m - 1, d)`)만 사용한다.
 */

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** 'YYYY-MM-DD' 문자열을 숫자 3개로 분해한다. 형식 검증은 하지 않는다(호출자 책임). */
function splitISO(iso: string): [year: number, month: number, day: number] {
  const [year, month, day] = iso.split('-').map(Number)
  return [year, month, day]
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 로컬 y/m/d 값으로 'YYYY-MM-DD' 문자열을 만든다. */
function formatISO(year: number, month1based: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${pad2(month1based)}-${pad2(day)}`
}

/** 형식('YYYY-MM-DD')과 실존 날짜(월 범위·윤년·월말)를 모두 검증한다. */
export function isValidISO(s: string): boolean {
  if (!ISO_PATTERN.test(s)) return false
  const [year, month, day] = splitISO(s)
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  // 로컬 생성자는 범위를 벗어난 일(day)을 다음 달로 이월한다(예: 2월 30일 → 3월 2일).
  // 왕복 대조로 실존 날짜인지 확인한다 — 이 대조가 윤년 100/400년 규칙까지 커버한다.
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/** 실행 환경 로컬 타임존 기준 오늘 날짜. */
export function todayISO(): string {
  const now = new Date()
  return formatISO(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/** 해당 연·월의 일수. 로컬 생성자의 "0일 = 전달 말일" 특성을 이용한다(윤년 규칙 포함, 엔진이 계산). */
export function daysInMonth(year: number, month1based: number): number {
  return new Date(year, month1based, 0).getDate()
}

/** 해당 연·월 1일의 요일. 0=일요일 ... 6=토요일. */
export function firstWeekday(year: number, month1based: number): number {
  return new Date(year, month1based - 1, 1).getDay()
}

/** iso에서 delta일만큼 이동한 날짜. 월·연 경계는 로컬 생성자가 자동으로 이월한다. */
export function addDaysISO(iso: string, delta: number): string {
  const [year, month, day] = splitISO(iso)
  const date = new Date(year, month - 1, day + delta)
  return formatISO(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

/** year/month1based에서 delta개월 이동한 { year, month }. 일(day)은 다루지 않는다. */
export function addMonths(
  year: number,
  month1based: number,
  delta: number
): { year: number; month: number } {
  const date = new Date(year, month1based - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

/** iso를 [min, max] 범위로 자른다. min·max가 없으면 해당 경계는 무시한다. */
export function clampISO(iso: string, min?: string, max?: string): string {
  let result = iso
  if (min !== undefined && result < min) result = min
  if (max !== undefined && result > max) result = max
  return result
}

/**
 * 해당 연·월의 달력 그리드. 항상 6행 × 7열, 일요일 시작.
 * 이웃 달 자리(선두·후미 빈 칸)는 null — 이웃 달 날짜는 렌더하지 않는다.
 */
export function monthGrid(year: number, month1based: number): (string | null)[][] {
  const total = daysInMonth(year, month1based)
  const startWeekday = firstWeekday(year, month1based)

  const cells: (string | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= total; day++) cells.push(formatISO(year, month1based, day))
  while (cells.length < 6 * 7) cells.push(null)

  const rows: (string | null)[][] = []
  for (let r = 0; r < 6; r++) rows.push(cells.slice(r * 7, r * 7 + 7))
  return rows
}

/** iso를 { year, month, day }로 분해한다. 형식 검증은 하지 않는다(호출자가 isValidISO를 선행). */
export function parseISO(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = splitISO(iso)
  return { year, month, day }
}

/** iso 날짜의 요일. 0=일요일 ... 6=토요일. */
export function weekdayISO(iso: string): number {
  const { year, month, day } = parseISO(iso)
  return new Date(year, month - 1, day).getDay()
}

/**
 * iso에서 delta개월 이동한 날짜. 일(day)은 보존하되 대상 월에 그 일이 없으면
 * 말일로 클램프한다(예: 1월 31일 + 1개월 → 2월 28/29일). 연 단위 이동은
 * delta=±12로 이 함수를 재사용한다(별도 함수를 두지 않는다).
 */
export function addMonthsISO(iso: string, delta: number): string {
  const { year, month, day } = parseISO(iso)
  const { year: nextYear, month: nextMonth } = addMonths(year, month, delta)
  const clampedDay = Math.min(day, daysInMonth(nextYear, nextMonth))
  return formatISO(nextYear, nextMonth, clampedDay)
}
