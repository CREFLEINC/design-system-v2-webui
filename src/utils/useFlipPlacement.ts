import { useLayoutEffect, useState, type RefObject } from 'react'

/** 앵커형 팝업의 세로 배치 — 기본은 트리거 아래('down'), 뒤집혔을 때만 'up' */
export type VerticalPlacement = 'down' | 'up'
/**
 * 앵커형 팝업의 가로 배치 — 성장 방향. 기본은 좌측 모서리 정렬로 오른쪽 성장('right'),
 * 전환 시 우측 모서리 정렬로 왼쪽 성장('left')
 */
export type HorizontalPlacement = 'right' | 'left'

/** 두 축의 배치를 함께 담는다 — 축은 서로 독립이며 한 번의 실측에서 동시에 결정된다. */
export interface FlipPlacement {
  vertical: VerticalPlacement
  horizontal: HorizontalPlacement
}

/** 닫힘 리셋·초기값 공용 상수 — 동일 참조라 리셋이 불필요한 재렌더를 만들지 않는다. */
const DEFAULT_PLACEMENT: FlipPlacement = { vertical: 'down', horizontal: 'right' }

/**
 * 팝업 배치 — 세로는 아래 우선, 가로는 좌측 모서리 정렬 우선.
 *
 * open 시점에 1회만 실측한다(`useLayoutEffect` → paint 전 동기 실행이라 깜빡임 없음).
 * 스크롤·리사이즈 리스너는 달지 않는다 — 팝업은 바깥 상호작용에 닫히는 일시적 표면이고,
 * 경계값에서 배치가 진동할 위험이 재계산의 이득보다 크다. 닫히면 기본 배치로 리셋해
 * 다음 오픈이 항상 "아래·좌측 정렬 상태"를 실측하게 만든다(재측정의 기준점 고정).
 *
 * 세로: 뷰포트 아래가 부족하고 위가 충분할 때만 'up'. 둘 다 부족하면 'down'을 유지한다.
 * 가로: 뷰포트 오른쪽을 넘치고 왼쪽이 충분할 때만 'left'. 양쪽 다 부족하면 'right'를
 * 유지한다(세로의 "둘 다 부족" 처리와 같은 보수적 기본값). 세로와 달리 간격(gap)이 없다 —
 * flip이 아니라 정렬 전환이라 팝업이 트리거를 가로로 겹쳐 덮기 때문이다.
 *
 * jsdom처럼 모든 rect가 0인 환경에서는 두 판정식이 항상 false가 되어 기본 배치만 반환한다.
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
  const [placement, setPlacement] = useState<FlipPlacement>(DEFAULT_PLACEMENT)

  // deps는 open만 — ref 객체는 렌더 간 안정적이고, placement 상태 변경이 이 이펙트를
  // 재트리거하지 않아야 경계값에서 진동하지 않는다.
  useLayoutEffect(() => {
    if (!open) {
      setPlacement(DEFAULT_PLACEMENT)
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

    // 가로 — 수직과 달리 간격(gap)이 없다: flip이 아니라 정렬 전환이라
    // 팝업이 트리거를 가로로 겹쳐 덮는다. 우측 정렬 시 팝업은
    // [t.right - p.width, t.right] 구간을 차지하므로 왼쪽 여유만 보면 된다.
    const overflowsRight = p.right > window.innerWidth
    const fitsLeft = t.right - p.width >= 0

    setPlacement({
      vertical: overflowsBelow && fitsAbove ? 'up' : 'down',
      horizontal: overflowsRight && fitsLeft ? 'left' : 'right',
    })
  }, [open])

  return placement
}
