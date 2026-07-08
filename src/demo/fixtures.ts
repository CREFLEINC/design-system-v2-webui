// OnMyFactory 대시보드 데모용 정적 픽스처 — 페칭 없음, 순수 상수.
// 실제 스마트팩토리 모니터링 화면을 흉내 낸 "그럴듯한" 값들.
import type { ChartSeries, ChartPoint, StatCardStatus, DeltaDirection, ChipStatus } from '../index'

/* ------------------------------------------------------------------ */
/* StatCard 4종                                                        */
/* ------------------------------------------------------------------ */
export interface StatFixture {
  label: string
  value: string
  unit?: string
  delta: { direction: DeltaDirection; value: string }
  status?: StatCardStatus
  statusLabel?: string
  /** 게이지로 표현할 값(전체 가동률 카드에만) */
  gauge?: number
}

export const stats: StatFixture[] = [
  {
    label: '전체 가동률',
    value: '87.4',
    unit: '%',
    delta: { direction: 'up', value: '+2.1%' },
    gauge: 87,
  },
  {
    label: '활성 에이전트',
    value: '24',
    unit: '대',
    delta: { direction: 'up', value: '+3' },
    status: 'success',
    statusLabel: '정상 가동',
  },
  {
    label: '경고',
    value: '3',
    unit: '건',
    delta: { direction: 'up', value: '+2' },
    status: 'warning',
    statusLabel: '주의 필요',
  },
  {
    label: '시간당 처리량',
    value: '1,284',
    unit: 'ea',
    delta: { direction: 'down', value: '-4.6%' },
    status: 'info',
    statusLabel: '평균 이하',
  },
]

/* ------------------------------------------------------------------ */
/* 시간별 가동률 추이 — LineChart (다중 시리즈)                          */
/* ------------------------------------------------------------------ */
const hours = ['00시', '04시', '08시', '12시', '16시', '20시', '24시']

export const utilizationSeries: ChartSeries[] = [
  {
    name: 'A 라인',
    data: hours.map((label, i) => ({ label, value: [82, 85, 91, 88, 93, 90, 87][i] })),
  },
  {
    name: 'B 라인',
    data: hours.map((label, i) => ({ label, value: [78, 80, 84, 86, 82, 85, 83][i] })),
  },
  {
    name: 'C 라인',
    data: hours.map((label, i) => ({ label, value: [70, 74, 79, 81, 77, 72, 75][i] })),
  },
]

/* ------------------------------------------------------------------ */
/* 라인별 처리량 — BarChart                                             */
/* ------------------------------------------------------------------ */
const lines = ['1라인', '2라인', '3라인', '4라인', '5라인']

// 라인당 시간당 처리량(백 단위) — 축 라벨이 3자리로 유지되도록 스케일을 낮춰 클리핑을 피한다.
export const throughputSeries: ChartSeries[] = [
  {
    name: '처리량',
    data: lines.map((label, i) => ({ label, value: [284, 246, 312, 208, 268][i] })),
  },
]

/* ------------------------------------------------------------------ */
/* 설비 상태 구성비 — PieChart(donut)                                   */
/* ------------------------------------------------------------------ */
export const statusMix: ChartPoint[] = [
  { label: '정상', value: 42 },
  { label: '경고', value: 6 },
  { label: '점검', value: 4 },
  { label: '정지', value: 2 },
]

export const statusMixTotal = statusMix.reduce((sum, p) => sum + p.value, 0)

/* ------------------------------------------------------------------ */
/* 설비 이벤트 로그 — Table                                             */
/* ------------------------------------------------------------------ */
export interface EventRow {
  id: string
  /** 정렬 키 겸 표시값 (HH:MM) */
  time: string
  equipment: string
  /** Chip 시맨틱 상태 */
  status: ChipStatus
  /** 상태 한글 라벨 */
  statusLabel: string
  message: string
}

export const eventRows: EventRow[] = [
  { id: 'e1', time: '14:32', equipment: '압축기 D', status: 'error', statusLabel: '불량', message: '온도 임계값 초과 — 즉시 점검 필요' },
  { id: 'e2', time: '14:18', equipment: '컨베이어 2', status: 'warning', statusLabel: '경고', message: '벨트 진동 상승 감지' },
  { id: 'e3', time: '13:57', equipment: '로봇암 A-3', status: 'success', statusLabel: '정상', message: '사이클 타임 회복 완료' },
  { id: 'e4', time: '13:40', equipment: '검사기 V1', status: 'success', statusLabel: '정상', message: '비전 검사 정상 재개' },
  { id: 'e5', time: '13:12', equipment: '포장기 P2', status: 'idle', statusLabel: '대기', message: '자재 보충 대기 중' },
  { id: 'e6', time: '12:48', equipment: '압축기 C', status: 'warning', statusLabel: '경고', message: '유압 변동 폭 확대' },
  { id: 'e7', time: '12:20', equipment: '용접셀 W-1', status: 'success', statusLabel: '정상', message: 'AI 에이전트 자동 보정 적용' },
]
