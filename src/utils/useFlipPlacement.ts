import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'

/** 앵커형 팝업의 세로 배치 — 기본은 트리거 아래('down'), 뒤집혔을 때만 'up' */
export type VerticalPlacement = 'down' | 'up'
/**
 * 앵커형 팝업의 가로 배치 — 성장 방향. 기본은 좌측 모서리 정렬로 오른쪽 성장('right'),
 * 전환 시 우측 모서리 정렬로 왼쪽 성장('left')
 */
export type HorizontalPlacement = 'right' | 'left'

/** 두 축 배치와 포털 호스트 좌표를 함께 담는다. */
export interface FlipPlacement {
  vertical: VerticalPlacement
  horizontal: HorizontalPlacement
  portalHost: HTMLElement | null
  style: CSSProperties
  measured: boolean
  theme?: string
}

interface PlacementState {
  vertical: VerticalPlacement
  horizontal: HorizontalPlacement
  style: CSSProperties
  measured: boolean
}

interface FlipPlacementOptions {
  /** Select처럼 팝업이 트리거보다 좁아지면 안 되는 경우에만 사용한다. */
  matchTriggerWidth?: boolean
}

/** 닫힘 리셋·초기값 공용 상수 — 첫 실측 전 원점 노출을 막는다. */
const DEFAULT_PLACEMENT: PlacementState = {
  vertical: 'down',
  horizontal: 'right',
  style: { visibility: 'hidden' },
  measured: false,
}

function resolvePortalHost(open: boolean, trigger: HTMLElement | null): HTMLElement | null {
  if (!open || typeof document === 'undefined') return null
  return trigger?.closest<HTMLDialogElement>('dialog') ?? document.body
}

function resolveTheme(open: boolean, trigger: HTMLElement | null): string | undefined {
  if (!open) return undefined
  return trigger?.closest<HTMLElement>('[data-theme]')?.dataset.theme
}

function readGap(popup: HTMLElement): number {
  const value = window.getComputedStyle(popup).getPropertyValue('--space-1')
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toHostCoordinates(host: HTMLElement, viewportTop: number, viewportLeft: number) {
  if (host === document.body) {
    return {
      top: viewportTop + window.scrollY,
      left: viewportLeft + window.scrollX,
    }
  }

  const hostRect = host.getBoundingClientRect()
  return {
    top: viewportTop - hostRect.top - host.clientTop + host.scrollTop,
    left: viewportLeft - hostRect.left - host.clientLeft + host.scrollLeft,
  }
}

/**
 * 포털 팝업 배치 — 세로는 아래 우선, 가로는 좌측 모서리 정렬 우선.
 *
 * open 시점에 1회만 실측한다. 팝업은 가장 가까운 native dialog 또는 document.body를
 * 호스트로 삼으며, 뷰포트 DOMRect를 해당 호스트의 절대배치 좌표로 변환한다. 스크롤·리사이즈
 * 리스너는 달지 않는다. 닫히면 기본 배치와 미측정 상태로 리셋해 다음 open에서 다시 잰다.
 *
 * 세로: 아래가 부족하고 위가 충분할 때만 'up'. 둘 다 부족하면 'down'을 유지한다.
 * 가로: 오른쪽을 넘치고 왼쪽이 충분할 때만 'left'. 양쪽 다 부족하면 'right'를 유지한다.
 */
export function useFlipPlacement(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  popupRef: RefObject<HTMLElement | null>,
  { matchTriggerWidth = false }: FlipPlacementOptions = {},
): FlipPlacement {
  const [placement, setPlacement] = useState<PlacementState>(DEFAULT_PLACEMENT)
  const trigger = triggerRef.current
  const portalHost = resolvePortalHost(open, trigger)
  const theme = resolveTheme(open, trigger)

  // deps는 open만 — 위치는 열릴 때 한 번 고정하며 ref 객체와 옵션은 호출부에서 안정적이다.
  useLayoutEffect(() => {
    if (!open) {
      setPlacement(DEFAULT_PLACEMENT)
      return
    }

    const currentTrigger = triggerRef.current
    const popup = popupRef.current
    const host = resolvePortalHost(true, currentTrigger)
    if (!currentTrigger || !popup || !host || typeof window === 'undefined') return

    const triggerRect = currentTrigger.getBoundingClientRect()
    const minWidth = matchTriggerWidth ? triggerRect.width : undefined
    if (minWidth !== undefined) popup.style.minWidth = `${minWidth}px`

    const popupRect = popup.getBoundingClientRect()
    const gap = readGap(popup)
    const overflowsBelow = triggerRect.bottom + gap + popupRect.height > window.innerHeight
    const fitsAbove = triggerRect.top - gap - popupRect.height >= 0
    const overflowsRight = triggerRect.left + popupRect.width > window.innerWidth
    const fitsLeft = triggerRect.right - popupRect.width >= 0

    const vertical: VerticalPlacement = overflowsBelow && fitsAbove ? 'up' : 'down'
    const horizontal: HorizontalPlacement = overflowsRight && fitsLeft ? 'left' : 'right'
    const viewportTop =
      vertical === 'up'
        ? triggerRect.top - gap - popupRect.height
        : triggerRect.bottom + gap
    const viewportLeft =
      horizontal === 'left' ? triggerRect.right - popupRect.width : triggerRect.left
    const coordinates = toHostCoordinates(host, viewportTop, viewportLeft)

    setPlacement({
      vertical,
      horizontal,
      style: {
        ...coordinates,
        minWidth,
        visibility: 'visible',
      },
      measured: true,
    })
  }, [open])

  return { ...placement, portalHost, theme }
}
