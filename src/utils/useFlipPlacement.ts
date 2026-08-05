import { useLayoutEffect, useState, type RefObject } from 'react'

/** 앵커형 팝업의 세로 배치 — 기본은 트리거 아래('down'), 뒤집혔을 때만 'up' */
export type FlipPlacement = 'down' | 'up'

/**
 * 팝업 세로 배치 — 아래 우선, 뷰포트 아래가 부족하고 위가 충분할 때만 'up'.
 *
 * open 시점에 1회만 실측한다(`useLayoutEffect` → paint 전 동기 실행이라 깜빡임 없음).
 * 스크롤·리사이즈 리스너는 달지 않는다 — 팝업은 바깥 상호작용에 닫히는 일시적 표면이고,
 * 경계값에서 배치가 진동할 위험이 재계산의 이득보다 크다. 닫히면 'down'으로 리셋해
 * 다음 오픈이 항상 "아래 배치 상태"를 실측하게 만든다(재측정의 기준점 고정).
 *
 * 위·아래 둘 다 부족하면 'down'을 유지한다(기존 동작 보존).
 * jsdom처럼 모든 rect가 0인 환경에서는 판정식이 항상 false가 되어 'down'만 반환한다.
 *
 * @param open 팝업이 열려 있는지
 * @param triggerRef 팝업을 여는 트리거 요소 ref
 * @param popupRef 팝업 요소 ref (open일 때만 마운트돼도 무방)
 */
export function useFlipPlacement(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  popupRef: RefObject<HTMLElement | null>,
): FlipPlacement {
  const [placement, setPlacement] = useState<FlipPlacement>('down')

  // deps는 open만 — ref 객체는 렌더 간 안정적이고, placement 상태 변경이 이 이펙트를
  // 재트리거하지 않아야 경계값에서 진동하지 않는다.
  useLayoutEffect(() => {
    if (!open) {
      setPlacement('down')
      return
    }
    const trigger = triggerRef.current
    const popup = popupRef.current
    if (!trigger || !popup) return

    const t = trigger.getBoundingClientRect()
    // 아래 배치 상태에서의 실측 — 예측 높이(CSS max-height 등)를 JS에 복제하지 않는다.
    const p = popup.getBoundingClientRect()
    const overflowsBelow = p.bottom > window.innerHeight
    // 트리거-팝업 간격도 실측에서 유도한다(CSS의 --space-1을 JS에 중복 정의하지 않기 위함).
    const gap = p.top - t.bottom
    const fitsAbove = t.top - gap - p.height >= 0

    setPlacement(overflowsBelow && fitsAbove ? 'up' : 'down')
  }, [open])

  return placement
}
