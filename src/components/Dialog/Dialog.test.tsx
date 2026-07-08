import { createRef } from 'react'
import { beforeAll, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from './Dialog'
import { Button } from '../Button/Button'

// jsdom(29)에는 <dialog> 모달 API가 없다(showModal/close === undefined).
// 컨트롤드 open→showModal/close 경로를 실제로 태우기 위한 최소 폴리필.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.open = true }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.open = false
      this.dispatchEvent(new Event('close'))
    }
  }
})

test('open이면 열리고 title이 dialog의 접근가능한 이름이 된다', () => {
  render(<Dialog open onClose={() => {}} title="설정">본문 내용</Dialog>)
  const dlg = screen.getByRole('dialog', { name: '설정' })
  expect(dlg).toHaveAttribute('open')
  expect(screen.getByText('본문 내용')).toBeInTheDocument()
})

test('open=false면 showModal되지 않고 ref가 forward된다', () => {
  const ref = createRef<HTMLDialogElement>()
  render(<Dialog ref={ref} open={false} onClose={() => {}} title="설정">본문</Dialog>)
  expect(ref.current).not.toBeNull()
  expect(ref.current!.open).toBe(false)
})

test('닫기 버튼 클릭이 onClose를 호출한다', async () => {
  const onClose = vi.fn()
  render(<Dialog open onClose={onClose} title="설정">본문</Dialog>)
  await userEvent.click(screen.getByRole('button', { name: '닫기' }))
  expect(onClose).toHaveBeenCalledOnce()
})

test('스크림(dialog 자체) 클릭은 닫고, 내용 클릭은 무시한다', async () => {
  const onClose = vi.fn()
  render(<Dialog open onClose={onClose} title="설정">본문</Dialog>)
  const dlg = screen.getByRole('dialog')
  // 내용(제목) 클릭 → 타깃이 dialog가 아니므로 닫히지 않음
  await userEvent.click(screen.getByText('설정'))
  expect(onClose).not.toHaveBeenCalled()
  // 스크림 = dialog 엘리먼트 자체가 event.target → 닫힘
  await userEvent.click(dlg)
  expect(onClose).toHaveBeenCalledOnce()
})

test('closeOnBackdropClick=false면 스크림 클릭을 무시한다', async () => {
  const onClose = vi.fn()
  render(<Dialog open onClose={onClose} closeOnBackdropClick={false} title="설정">본문</Dialog>)
  await userEvent.click(screen.getByRole('dialog'))
  expect(onClose).not.toHaveBeenCalled()
})

test('cancel(Escape) 이벤트가 preventDefault되고 onClose로 라우팅된다', () => {
  const onClose = vi.fn()
  render(<Dialog open onClose={onClose} title="설정">본문</Dialog>)
  const dlg = screen.getByRole('dialog')
  const cancel = new Event('cancel', { cancelable: true, bubbles: true })
  dlg.dispatchEvent(cancel)
  expect(onClose).toHaveBeenCalledOnce()
  expect(cancel.defaultPrevented).toBe(true)
})

test('open 동안 body overflow를 hidden으로 잠그고 닫히면 복구한다', () => {
  const { rerender } = render(<Dialog open onClose={() => {}} title="설정">본문</Dialog>)
  expect(document.body.style.overflow).toBe('hidden')
  rerender(<Dialog open={false} onClose={() => {}} title="설정">본문</Dialog>)
  expect(document.body.style.overflow).toBe('')
})

test('footer에 넘긴 Button 액션이 렌더된다', () => {
  render(
    <Dialog open onClose={() => {}} title="삭제" footer={<Button variant="filled">확인</Button>}>
      정말 삭제할까요?
    </Dialog>
  )
  expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()
})
