import {
  forwardRef,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react'
import { cx } from '../../utils/cx'
import styles from './ImageMarkerBoard.module.css'

/** 0~1 비율 좌표. 컨테이너 밖으로 나가는 유일한 좌표 표현 */
export interface RatioPoint {
  x: number
  y: number
}

export interface ImageMarker {
  /** 안정적 식별자 — onSelect/onMove가 돌려준다 */
  id: string
  /** 표식 중심의 가로 비율 (0~1) */
  x: number
  /** 표식 중심의 세로 비율 (0~1) */
  y: number
  /** 표식 이름 — 접근성 이름(aria-label)으로 쓰인다 */
  label: string
  /** 고름 여부 — 채움 색 + aria-pressed */
  selected?: boolean
}

export interface ImageMarkerBoardImage {
  src: string
  /** 대체 텍스트 — 화면 낭독기는 배치를 읽을 수 없으므로 필수 */
  alt: string
}

export interface ImageMarkerBoardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** 배경 이미지. 없으면 emptyContent를 렌더하고 표식을 그리지 않는다 */
  image?: ImageMarkerBoardImage
  /** 이미지가 없을 때 보일 안내 */
  emptyContent?: ReactNode
  /** 표식 목록. 배열 순서 = DOM 순서 = Tab 순서 */
  markers: ImageMarker[]
  /** true면 놓기·옮기기(드래그·화살표)를 막는다. 고르기는 유지 */
  readOnly?: boolean
  /** 화살표 한 번에 미는 비율. 기본 0.01 */
  step?: number
  /** 빈 자리를 눌렀을 때 — 비율 좌표 */
  onPlace?: (point: RatioPoint) => void
  /** 표식을 눌렀을 때(Enter/Space 포함) — 표식 id */
  onSelect?: (id: string) => void
  /** 표식을 옮겼을 때(드래그 중 매 이동·화살표 1회) — 옮긴 뒤 비율 좌표 */
  onMove?: (id: string, point: RatioPoint) => void
  /** 판(role=group)의 접근성 라벨. 기본 '이미지 표식 판' */
  'aria-label'?: string
}

/* ------------------------------------------------------------------ *
 * 좌표 변환 — 모듈 내부 순수 함수. export하지 않는다(NumberPad 선례):
 * 컨테이너의 내부 계약이며 UI 동작(테스트)으로 검증된다.
 * 비율→픽셀 변환은 JS에 없다 — 표식은 left/top 퍼센트 + CSS translate로 놓이고,
 * 리사이즈·이미지 교체 시 브라우저 레이아웃이 퍼센트를 다시 푼다.
 * ------------------------------------------------------------------ */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** 화면 좌표 → 비율. rect가 0이면(이미지 미로드·display:none) null — NaN을 밖으로 내보내지 않는다 */
function toRatio(rect: DOMRect, clientX: number, clientY: number): RatioPoint | null {
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height)
  }
}

/** 접근성 텍스트 전용 반올림 — 밖으로 내보내는 좌표는 clamp 외 가공하지 않는다 */
const pct = (v: number) => Math.round(v * 100)

/** 이 픽셀 이상 움직여야 드래그로 본다. 미만은 흔들림 있는 클릭이다 */
const DRAG_THRESHOLD_PX = 3

const ARROWS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 }
}

/** 진행 중인 드래그. 렌더에 관여하지 않으므로 state가 아닌 ref로 든다 */
interface DragState {
  id: string
  pointerId: number
  startX: number
  startY: number
  moved: boolean
}

export const ImageMarkerBoard = forwardRef<HTMLDivElement, ImageMarkerBoardProps>(
  function ImageMarkerBoard(
    {
      image,
      emptyContent,
      markers,
      readOnly = false,
      step = 0.01,
      onPlace,
      onSelect,
      onMove,
      className,
      'aria-label': ariaLabel = '이미지 표식 판',
      ...rest
    },
    ref
  ) {
    const base = useId()
    // 위치 기준면은 루트가 아니라 surface다 — surface의 크기 = 이미지 렌더 크기.
    const surfaceRef = useRef<HTMLDivElement>(null)
    const drag = useRef<DragState | null>(null)
    // 드래그가 끝난 뒤 브라우저가 쏘는 click을 1회 삼킨다 — 드래그가 곧 선택은 아니다.
    const suppressClick = useRef(false)
    const [announcement, setAnnouncement] = useState('')

    const placeable = !readOnly && Boolean(onPlace)

    // 놓기. 표식에서 올라온 클릭은 출처 검사로 걸러낸다 — 어디에서도 전파를 끊지 않으므로
    // 소비자가 루트에 건 onClick은 표식 클릭에서도 그대로 도달한다(핸들러 비삼김 관례).
    const handleSurfaceClick = (e: ReactMouseEvent<HTMLDivElement>) => {
      if (readOnly || !onPlace) return
      if ((e.target as Element).closest('button')) return
      const point = toRatio(e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY)
      if (point) onPlace(point)
    }

    // 고르기 — readOnly에서도 살아 있다("보기만 하는 화면"에서도 어느 표식인지는 확인해야 한다).
    // Enter/Space는 네이티브 button의 click으로 들어와 같은 경로를 탄다.
    const handleMarkerClick = (marker: ImageMarker) => {
      if (suppressClick.current) {
        suppressClick.current = false
        return
      }
      onSelect?.(marker.id)
    }

    const handleMarkerPointerDown = (
      marker: ImageMarker,
      e: ReactPointerEvent<HTMLButtonElement>
    ) => {
      suppressClick.current = false // 이전 드래그의 잔여 억제 해제
      if (readOnly) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      drag.current = {
        id: marker.id,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        moved: false
      }
      // jsdom에는 포인터 캡처 API가 없다(실측) — TextArea의 ResizeObserver 가드와 같은 방식
      const el = e.currentTarget
      if (typeof el.setPointerCapture === 'function') el.setPointerCapture(e.pointerId)
    }

    const handleMarkerPointerMove = (
      marker: ImageMarker,
      e: ReactPointerEvent<HTMLButtonElement>
    ) => {
      const d = drag.current
      if (!d || d.id !== marker.id || d.pointerId !== e.pointerId) return
      if (!d.moved) {
        if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD_PX) return
        d.moved = true
      }
      // rect는 매 이동마다 읽는다 — 드래그 중 리사이즈돼도 최신 크기를 반영한다.
      const surface = surfaceRef.current
      if (!surface) return
      const point = toRatio(surface.getBoundingClientRect(), e.clientX, e.clientY)
      if (point) onMove?.(marker.id, point)
    }

    const handleMarkerPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
      const d = drag.current
      if (!d || d.pointerId !== e.pointerId) return
      const el = e.currentTarget
      if (typeof el.releasePointerCapture === 'function') el.releasePointerCapture(e.pointerId)
      if (d.moved) suppressClick.current = true
      drag.current = null
    }

    // cancel 뒤에는 click이 오지 않는다 — 억제를 세우면 다음 정상 클릭을 삼킨다.
    const handleMarkerPointerCancel = (e: ReactPointerEvent<HTMLButtonElement>) => {
      const d = drag.current
      if (!d || d.pointerId !== e.pointerId) return
      const el = e.currentTarget
      if (typeof el.releasePointerCapture === 'function') el.releasePointerCapture(e.pointerId)
      drag.current = null
    }

    const handleMarkerKeyDown = (marker: ImageMarker, e: ReactKeyboardEvent<HTMLButtonElement>) => {
      const delta = ARROWS[e.key]
      if (!delta) return
      // readOnly에서는 preventDefault도 하지 않는다 — 기본 스크롤을 남긴다.
      if (readOnly) return
      e.preventDefault()
      const next = {
        x: clamp01(marker.x + delta.dx * step),
        y: clamp01(marker.y + delta.dy * step)
      }
      // 가장자리에서 값이 그대로면 호출·안내를 생략한다(NumberPad no-op 선례).
      if (next.x === marker.x && next.y === marker.y) return
      onMove?.(marker.id, next)
      setAnnouncement(`${marker.label}: 가로 ${pct(next.x)}%, 세로 ${pct(next.y)}%`)
    }

    return (
      // 컴포넌트 소유 ARIA는 {...rest} 뒤에 둔다(Select/NumberPad 패턴) — 소비자가 role을
      // 덮어쓰면 판의 그룹 맥락이 깨진다. aria-label은 구조분해 기본값이라 소비자 값이 이긴다.
      <div
        {...rest}
        ref={ref}
        className={cx(styles.root, readOnly && styles.readOnly, className)}
        role="group"
        aria-label={ariaLabel}
      >
        {image ? (
          <div
            ref={surfaceRef}
            className={cx(styles.surface, placeable && styles.placeable)}
            onClick={handleSurfaceClick}
          >
            <img
              src={image.src}
              alt={image.alt}
              draggable={false}
              className={styles.image}
            />
            {markers.map((marker, index) => (
              <button
                key={marker.id}
                type="button"
                className={cx(styles.marker, marker.selected && styles.selected)}
                style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
                aria-label={marker.label}
                aria-pressed={Boolean(marker.selected)}
                // 설명 id는 배열 인덱스 기반이다 — 소비자 마커 id에 공백이 섞이면
                // aria-describedby(공백 구분 목록)가 깨진다.
                aria-describedby={`${base}-pos-${index}`}
                onClick={() => handleMarkerClick(marker)}
                onPointerDown={(e) => handleMarkerPointerDown(marker, e)}
                onPointerMove={(e) => handleMarkerPointerMove(marker, e)}
                onPointerUp={handleMarkerPointerUp}
                onPointerCancel={handleMarkerPointerCancel}
                onKeyDown={(e) => handleMarkerKeyDown(marker, e)}
              >
                <span id={`${base}-pos-${index}`} className={styles.srOnly}>
                  가로 {pct(marker.x)}%, 세로 {pct(marker.y)}%
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>{emptyContent}</div>
        )}
        {/* 라이브 리전은 빈 상태에서도 항상 렌더한다 — 화면 낭독기는 미리 존재하던
            live 영역의 변화만 안내한다. 갱신은 키보드 이동에서만 한다(드래그는 잡음). */}
        <div className={styles.srOnly} aria-live="polite">
          {announcement}
        </div>
      </div>
    )
  }
)
