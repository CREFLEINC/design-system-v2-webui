import { expect, test } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { DiffRow } from './DiffRow'
import styles from './DiffRow.module.css'

test('group 롤 + label에서 파생된 aria-label, label·before·after 렌더', () => {
  render(<DiffRow label="표시명" before="구 명칭" after="새 명칭" />)
  const group = screen.getByRole('group', { name: '표시명' })
  expect(group).toBeInTheDocument()
  expect(within(group).getByText('표시명')).toBeInTheDocument()
  expect(within(group).getByText('구 명칭')).toBeInTheDocument()
  expect(within(group).getByText('새 명칭')).toBeInTheDocument()
})

test('consumer aria-label이 label 파생 이름을 덮어쓴다', () => {
  render(<DiffRow label="표시명" before="구 명칭" after="새 명칭" aria-label="필드 변경" />)
  expect(screen.getByRole('group', { name: '필드 변경' })).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: '표시명' })).toBeNull()
})

test('sr-only 프리픽스 "이전 값"/"이후 값" 존재, 화살표 아이콘은 aria-hidden', () => {
  render(<DiffRow label="분류" before="구 명칭" after="새 명칭" />)
  expect(screen.getByText('이전 값')).toBeInTheDocument()
  expect(screen.getByText('이후 값')).toBeInTheDocument()
  const arrow = screen.getByText('arrow_forward')
  expect(arrow).toHaveAttribute('aria-hidden', 'true')
})

test('빈값→채워짐: before 미지정 시 before 슬롯에 "(없음)" 렌더, emptyText 재정의 반영', () => {
  const { rerender } = render(<DiffRow label="사용 여부" after="사용" />)
  expect(screen.getByText('(없음)')).toBeInTheDocument()
  rerender(<DiffRow label="사용 여부" after="사용" emptyText="—" />)
  expect(screen.queryByText('(없음)')).toBeNull()
  expect(screen.getByText('—')).toBeInTheDocument()
})

test('값 삭제: after 빈 문자열 시 after 슬롯에 "(없음)", DOM에 del/s 요소·line-through 클래스 없음', () => {
  const { container } = render(<DiffRow label="분류" before="표준" after="" />)
  expect(within(container).getByText('표준')).toBeInTheDocument()
  expect(screen.getByText('(없음)')).toBeInTheDocument()
  expect(container.querySelector('del')).toBeNull()
  expect(container.querySelector('s')).toBeNull()
  expect(container.innerHTML).not.toContain('line-through')
})

test('changed=false: 값 1회만 렌더(화살표 아이콘 부재), 루트 data-changed="false", sr-only "변경 없음"', () => {
  render(<DiffRow label="사용 여부" before="사용" after="사용 중지" changed={false} />)
  const group = screen.getByRole('group', { name: '사용 여부' })
  expect(group).toHaveAttribute('data-changed', 'false')
  expect(screen.getByText('변경 없음')).toBeInTheDocument()
  expect(screen.getAllByText('사용 중지')).toHaveLength(1)
  expect(screen.queryByText('사용')).toBeNull()
  expect(screen.queryByText('arrow_forward')).toBeNull()
})

test('changed=false + after 빈값 → before 값이 렌더된다', () => {
  render(<DiffRow label="분류" before="표준" after="" changed={false} />)
  expect(screen.getByText('표준')).toBeInTheDocument()
  expect(screen.queryByText('(없음)')).toBeNull()
})

test('className 병합(cx)·rest 스프레드(data-*)·ref 전달(HTMLDivElement)', () => {
  const ref = { current: null as HTMLDivElement | null }
  render(
    <DiffRow
      ref={ref}
      label="표시명"
      before="구 명칭"
      after="새 명칭"
      className="custom"
      data-testid="dr"
    />
  )
  const el = screen.getByTestId('dr')
  expect(ref.current).toBe(el)
  expect(el.className).toContain('custom')
  expect(el.className).toContain(styles.root)
})
