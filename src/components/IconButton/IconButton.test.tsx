import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'
import styles from './IconButton.module.css'

test('aria-label을 접근 가능한 이름으로 노출하고 클릭을 전달한다', async () => {
  const onClick = vi.fn()
  render(<IconButton icon="settings" aria-label="설정" onClick={onClick} />)
  await userEvent.click(screen.getByRole('button', { name: '설정' }))
  expect(onClick).toHaveBeenCalledOnce()
})

test('variant/size 클래스가 적용된다', () => {
  render(<IconButton icon="add" aria-label="추가" variant="filled" size="lg" />)
  const el = screen.getByRole('button')
  expect(el.className).toContain(styles.filled)
  expect(el.className).toContain(styles.lg)
})

test('내부 아이콘은 장식용(aria-hidden)이고 이름은 aria-label에서만 온다', () => {
  render(<IconButton icon="delete" aria-label="삭제" />)
  const btn = screen.getByRole('button', { name: '삭제' })
  // 리가처 텍스트는 DOM엔 있으나 접근성 트리에서는 숨겨진다
  expect(btn.textContent).toContain('delete')
  expect(btn.querySelector('[aria-hidden="true"]')).not.toBeNull()
})

test('disabled면 클릭이 차단된다', async () => {
  const onClick = vi.fn()
  render(<IconButton icon="star" aria-label="즐겨찾기" disabled onClick={onClick} />)
  await userEvent.click(screen.getByRole('button'))
  expect(onClick).not.toHaveBeenCalled()
})

test('기본 type은 button (form 우발 제출 방지)', () => {
  render(<IconButton icon="close" aria-label="닫기" />)
  expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
})

test('토글이 아니면 aria-pressed 속성이 없다', () => {
  render(<IconButton icon="close" aria-label="닫기" />)
  expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed')
})

test('비제어 토글: 클릭하면 aria-pressed가 뒤집히고 onPressedChange가 호출된다', async () => {
  const onPressedChange = vi.fn()
  render(
    <IconButton icon="star_border" selectedIcon="star" aria-label="즐겨찾기"
      toggle defaultPressed={false} onPressedChange={onPressedChange} />
  )
  const btn = screen.getByRole('button', { name: '즐겨찾기' })
  expect(btn).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(btn)
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  expect(onPressedChange).toHaveBeenCalledWith(true)
})

test('비제어 토글: pressed면 selectedIcon으로 스왑된다', async () => {
  render(
    <IconButton icon="star_border" selectedIcon="star" aria-label="즐겨찾기"
      toggle defaultPressed={false} />
  )
  const btn = screen.getByRole('button')
  expect(btn.textContent).toContain('star_border')
  await userEvent.click(btn)
  // 스왑되면 star_border 리가처는 사라지고 star만 남는다
  expect(btn.textContent).not.toContain('star_border')
  expect(btn.textContent).toContain('star')
})

test('제어 토글: pressed prop이 소스오브트루스 — 부모가 갱신하지 않으면 안 바뀐다', async () => {
  const onPressedChange = vi.fn()
  render(
    <IconButton icon="mic" aria-label="음소거" toggle pressed={false}
      onPressedChange={onPressedChange} />
  )
  const btn = screen.getByRole('button')
  await userEvent.click(btn)
  expect(onPressedChange).toHaveBeenCalledWith(true)
  // 부모가 pressed를 갱신하지 않았으므로 DOM 상태는 그대로 false
  expect(btn).toHaveAttribute('aria-pressed', 'false')
})
