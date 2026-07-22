import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Stepper, type StepperItem } from './Stepper'

const steps: StepperItem[] = [
  { label: '기안', status: 'complete' },
  { label: '검토', status: 'current' },
  { label: '승인', status: 'pending' }
]

test('steps 순서대로 ol > li N개를 렌더하고 라벨 텍스트를 표시한다', () => {
  const { container } = render(<Stepper steps={steps} />)
  expect(container.querySelector('ol')).toBeTruthy()
  const items = container.querySelectorAll('li')
  expect(items).toHaveLength(steps.length)
  items.forEach((li, idx) => {
    expect(li.textContent).toContain(steps[idx].label as string)
  })
})

test('status가 current인 li에만 aria-current="step"이 있다', () => {
  const { container } = render(<Stepper steps={steps} />)
  const items = container.querySelectorAll('li')
  items.forEach((li, idx) => {
    if (steps[idx].status === 'current') {
      expect(li).toHaveAttribute('aria-current', 'step')
    } else {
      expect(li).not.toHaveAttribute('aria-current')
    }
  })
})

test('기본 심볼: complete=check, rejected=close, current/pending은 단계 번호(1-based)', () => {
  const symbolSteps: StepperItem[] = [
    { label: '기안', status: 'complete' },
    { label: '반려', status: 'rejected' },
    { label: '검토', status: 'current' },
    { label: '승인', status: 'pending' }
  ]
  const { container } = render(<Stepper steps={symbolSteps} />)
  const nodes = Array.from(container.querySelectorAll('li')).map((li) => li.children[0])
  expect(nodes[0].textContent).toContain('check')
  expect(nodes[1].textContent).toContain('close')
  expect(nodes[2].textContent).toBe('3')
  expect(nodes[3].textContent).toBe('4')
})

test('icon prop이 기본 심볼을 대체한다', () => {
  const iconSteps: StepperItem[] = [
    { label: '기안', status: 'complete', icon: <span>★</span> },
    { label: '검토', status: 'current' }
  ]
  const { container } = render(<Stepper steps={iconSteps} />)
  const firstNode = container.querySelectorAll('li')[0].children[0]
  expect(firstNode.textContent).toBe('★')
  expect(firstNode.textContent).not.toContain('check')
})

test('커넥터는 N-1개이며 aria-hidden이고, 소유 li가 complete일 때만 data-done이 있다', () => {
  const { container } = render(<Stepper steps={steps} />)
  const connectors = container.querySelectorAll('[data-crefle-connector]')
  expect(connectors).toHaveLength(steps.length - 1)
  connectors.forEach((connector) => {
    expect(connector).toHaveAttribute('aria-hidden', 'true')
    const ownerLi = connector.closest('li')!
    if (ownerLi.getAttribute('data-status') === 'complete') {
      expect(connector).toHaveAttribute('data-done')
    } else {
      expect(connector).not.toHaveAttribute('data-done')
    }
  })
  // 마지막 li에는 커넥터가 없다
  const items = container.querySelectorAll('li')
  const lastLi = items[items.length - 1]
  expect(lastLi.querySelector('[data-crefle-connector]')).toBeNull()
})

test('description ReactNode를 렌더한다', () => {
  render(
    <Stepper
      steps={[
        { label: '기안', status: 'complete', description: <span>담당자: 홍길동</span> },
        { label: '검토', status: 'current' }
      ]}
    />
  )
  expect(screen.getByText('담당자: 홍길동')).toBeInTheDocument()
})

test('루트 data-orientation은 기본 horizontal이고 orientation="vertical" 지정 시 vertical이다', () => {
  const { container, rerender } = render(<Stepper steps={steps} />)
  expect(container.querySelector('ol')).toHaveAttribute('data-orientation', 'horizontal')
  rerender(<Stepper steps={steps} orientation="vertical" />)
  expect(container.querySelector('ol')).toHaveAttribute('data-orientation', 'vertical')
})

test('상태를 SR 텍스트로도 노출한다 — pending 단계(승인)에 "대기" 텍스트가 존재한다', () => {
  const { container } = render(<Stepper steps={steps} />)
  const pendingLi = container.querySelectorAll('li')[2]
  expect(pendingLi.textContent).toContain('대기')
})
