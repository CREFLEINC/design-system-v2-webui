import { expect, test } from 'vitest'
import { createRef } from 'react'
import { render } from '@testing-library/react'
import { Skeleton, SkeletonText } from './Skeleton'
import styles from './Skeleton.module.css'

test('장식 요소이므로 aria-hidden으로 접근성 트리에서 제외된다', () => {
  const { container } = render(<Skeleton />)
  const el = container.firstChild as HTMLElement
  expect(el).toHaveAttribute('aria-hidden', 'true')
  // role이 없어 접근성 쿼리로 잡히지 않는다
  expect(el).not.toHaveAttribute('role')
})

test('variant에 따라 클래스가 적용된다 (기본 text)', () => {
  const { container, rerender } = render(<Skeleton />)
  expect((container.firstChild as HTMLElement).className).toContain(styles.text)
  rerender(<Skeleton variant="rect" width={200} height={80} />)
  expect((container.firstChild as HTMLElement).className).toContain(styles.rect)
  rerender(<Skeleton variant="circle" size={48} />)
  expect((container.firstChild as HTMLElement).className).toContain(styles.circle)
})

test('치수 props를 인라인 style로 매핑한다 (number→px, string→그대로, circle=정사각)', () => {
  const { container, rerender } = render(<Skeleton variant="circle" size={48} />)
  let el = container.firstChild as HTMLElement
  expect(el.style.width).toBe('48px')
  expect(el.style.height).toBe('48px')
  rerender(<Skeleton variant="rect" width="50%" height={120} />)
  el = container.firstChild as HTMLElement
  expect(el.style.width).toBe('50%')
  expect(el.style.height).toBe('120px')
})

test('SkeletonText는 lines 개수만큼 줄을 렌더하고 마지막 줄을 짧게 만든다', () => {
  const { container } = render(<SkeletonText lines={4} />)
  const lines = container.querySelectorAll(`.${styles.text}`)
  expect(lines).toHaveLength(4)
  const last = lines[lines.length - 1] as HTMLElement
  const first = lines[0] as HTMLElement
  // 기본 lastLineWidth 60% — 앞선 라인(100%)과 다르게 짧다
  expect(last.style.width).toBe('60%')
  expect(first.style.width).not.toBe('60%')
})

test('소비자 className/style을 병합하고 컴포넌트 소유 aria-hidden을 유지한다', () => {
  const { container } = render(
    <Skeleton className="custom" style={{ opacity: 0.5 }} aria-hidden={false} />
  )
  const el = container.firstChild as HTMLElement
  expect(el.className).toContain('custom')
  expect(el.className).toContain(styles.skeleton)
  expect(el.style.opacity).toBe('0.5')
  // 소비자가 aria-hidden=false를 넘겨도 컴포넌트 소유 값이 이긴다 (rest 뒤 배치)
  expect(el).toHaveAttribute('aria-hidden', 'true')
})

test('ref를 루트 요소로 전달한다', () => {
  const ref = createRef<HTMLDivElement>()
  render(<Skeleton ref={ref} />)
  expect(ref.current).toBeInstanceOf(HTMLDivElement)
  const groupRef = createRef<HTMLDivElement>()
  render(<SkeletonText ref={groupRef} />)
  expect(groupRef.current).toBeInstanceOf(HTMLDivElement)
})
