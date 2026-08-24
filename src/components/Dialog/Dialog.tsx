import { forwardRef, useEffect, useId, useImperativeHandle, useRef, type DialogHTMLAttributes, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import styles from './Dialog.module.css'

export type DialogSize = 'sm' | 'md' | 'lg'
export type DialogPlacement = 'center' | 'right' | 'left'

// native title/onClose/onCancel 시그니처와 충돌하므로 걷어내고 우리 의미로 재정의한다.
export interface DialogProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title' | 'onClose' | 'onCancel' | 'open'> {
  /** 컨트롤드 표시 상태. true → showModal(), false → close(). open이 단일 진실원(source of truth). */
  open: boolean
  /** 닫기 "요청" 콜백. Escape / 스크림 클릭 / X 버튼이 모두 여기로 라우팅된다.
   *  부모가 이 콜백에서 open=false로 내려야 실제로 닫힌다. */
  onClose: () => void
  /** 헤더 제목. 주어지면 aria-labelledby로 <dialog>에 연결된다. */
  title?: ReactNode
  /** max-width 프리셋. 기본 md. */
  size?: DialogSize
  /** 화면 배치. 기본 center(중앙 모달). right/left는 해당 가장자리에 전체 높이로 부착되고
   *  가로 폭에는 size가 그대로 적용된다. 오버레이·포커스 트랩·ESC·스크롤 잠금은 동일. */
  placement?: DialogPlacement
  /** 스크림(백드롭) 클릭으로 닫기 허용. 기본 true. false면 스크림 클릭 무시(파괴적 확인 등). */
  closeOnBackdropClick?: boolean
  /** 우상단 X 닫기 버튼 표시. 기본 true. */
  showCloseButton?: boolean
  /** 하단 액션 영역 — 보통 <Button> 들. 없으면 footer 미렌더. */
  footer?: ReactNode
  /** 본문. aria-describedby로 연결된다. */
  children?: ReactNode
}

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog(
  {
    open,
    onClose,
    title,
    size = 'md',
    placement = 'center',
    closeOnBackdropClick = true,
    showCloseButton = true,
    footer,
    children,
    className,
    onClick: onClickProp,
    ...rest
  },
  ref
) {
  const innerRef = useRef<HTMLDialogElement>(null)
  useImperativeHandle(ref, () => innerRef.current as HTMLDialogElement)

  const titleId = useId()
  const bodyId = useId()

  // open이 단일 진실원. native state와 어긋나지 않게 [open]에만 반응해 열고 닫는다.
  useEffect(() => {
    const d = innerRef.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])

  // 스크롤 락 — native modal은 body 스크롤을 잠그지 않으므로 직접 처리.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Escape → native cancel. preventDefault로 native 자동닫힘을 막고 onClose로 라우팅.
  function handleCancel(e: SyntheticEvent<HTMLDialogElement, Event>) {
    e.preventDefault()
    onClose()
  }

  // 스크림 클릭: 타깃이 dialog 엘리먼트 자체일 때만 백드롭 클릭이다.
  // 소비자가 넘긴 onClick도 함께 실행한다(핸들러 스왈로 방지 — 라이브러리 표준).
  function handleBackdrop(e: MouseEvent<HTMLDialogElement>) {
    onClickProp?.(e)
    if (closeOnBackdropClick && e.target === innerRef.current) onClose()
  }

  return (
    <dialog
      ref={innerRef}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={bodyId}
      className={cx(styles.dialog, styles[size], placement !== 'center' && styles[placement], className)}
      onClick={handleBackdrop}
      onCancel={handleCancel}
      {...rest}
    >
      <div className={styles.panel}>
        {(title || showCloseButton) && (
          <header className={styles.header}>
            {title && <h2 id={titleId} className={styles.title}>{title}</h2>}
            {showCloseButton && (
              <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
                <Icon name="close" size={24} />
              </button>
            )}
          </header>
        )}
        <div id={bodyId} className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  )
})
