import { useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImageMarkerBoard, type ImageMarker, type ImageMarkerBoardImage } from './ImageMarkerBoard'

const helpText = { marginTop: 8, font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' } as const

/** 격자 + 방 몇 개 + 제목 텍스트를 담은 단순 도면 SVG. hex 색은 스토리 내부 문자열이라 token lint 대상이 아니다. */
function planImage(w: number, h: number, title: string): ImageMarkerBoardImage {
  const cols = 6
  const rows = 4
  const cellW = w / cols
  const cellH = h / rows
  const gridLines = [
    ...Array.from({ length: cols + 1 }, (_, i) => `<line x1="${i * cellW}" y1="0" x2="${i * cellW}" y2="${h}" />`),
    ...Array.from({ length: rows + 1 }, (_, i) => `<line x1="0" y1="${i * cellH}" x2="${w}" y2="${i * cellH}" />`)
  ].join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#f5f2ec" />
    <g stroke="#c9c2b4" stroke-width="1">${gridLines}</g>
    <rect x="${cellW * 0.5}" y="${cellH * 0.5}" width="${cellW * 2}" height="${cellH * 1.5}" fill="#e3ddce" stroke="#8a8270" stroke-width="2" />
    <rect x="${cellW * 3.2}" y="${cellH * 1.8}" width="${cellW * 2.2}" height="${cellH * 1.8}" fill="#e3ddce" stroke="#8a8270" stroke-width="2" />
    <text x="${w / 2}" y="${cellH * 0.35}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(h * 0.035)}" fill="#4a463c">${title}</text>
  </svg>`
  return { src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, alt: title }
}

const WIDE = planImage(1600, 900, '1층 도면 (16:9)')
const TALL = planImage(900, 1200, '창고 도면 (3:4)')

const meta = {
  title: 'Components/ImageMarkerBoard',
  component: ImageMarkerBoard,
  args: {
    image: WIDE,
    markers: []
  }
} satisfies Meta<typeof ImageMarkerBoard>
export default meta
type Story = StoryObj<typeof meta>

const PLAYGROUND_MARKERS: ImageMarker[] = [
  { id: 'a', x: 0.25, y: 0.3, label: '현장 A', selected: true },
  { id: 'b', x: 0.5, y: 0.5, label: '현장 B' },
  { id: 'c', x: 0.75, y: 0.7, label: '현장 C' }
]

export const Playground: Story = {
  args: {
    markers: PLAYGROUND_MARKERS,
    onPlace: () => {},
    onSelect: () => {},
    onMove: () => {}
  }
}

/** useState 데모 — 빈 자리 클릭으로 추가, 클릭으로 단일 선택, 드래그/화살표로 이동. 밖으로 나오는 값이 0~1임을 목록으로 시연한다. */
function InteractiveDemo() {
  const [markers, setMarkers] = useState<ImageMarker[]>(PLAYGROUND_MARKERS)
  const nextId = useRef(4)

  const handlePlace = (point: { x: number; y: number }) => {
    setMarkers((prev) => [
      ...prev,
      { id: `m${nextId.current++}`, x: point.x, y: point.y, label: `표식 ${nextId.current - 1}` }
    ])
  }

  const handleSelect = (id: string) => {
    setMarkers((prev) => prev.map((m) => ({ ...m, selected: m.id === id })))
  }

  const handleMove = (id: string, point: { x: number; y: number }) => {
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, x: point.x, y: point.y } : m)))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', width: 480 }}>
      <p style={helpText}>빈 자리를 누르면 놓고, 표식을 끌거나 화살표로 옮깁니다.</p>
      <ImageMarkerBoard
        image={WIDE}
        markers={markers}
        onPlace={handlePlace}
        onSelect={handleSelect}
        onMove={handleMove}
      />
      <ul style={helpText}>
        {markers.map((m) => (
          <li key={m.id}>
            {m.id} · {m.x.toFixed(3)} · {m.y.toFixed(3)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />
}

/** 놓기·옮기기는 막히지만 고르기는 살아 있다(R5) — 클릭이 선택으로 반영되는 것을 시연한다. */
function ReadOnlyDemo() {
  const [markers, setMarkers] = useState<ImageMarker[]>(PLAYGROUND_MARKERS)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', width: 480 }}>
      <p style={helpText}>읽기 전용 — 표식을 눌러 선택할 수는 있지만 놓거나 옮길 수는 없습니다.</p>
      <ImageMarkerBoard
        image={WIDE}
        markers={markers}
        readOnly
        onPlace={() => {}}
        onSelect={(id) => setMarkers((prev) => prev.map((m) => ({ ...m, selected: m.id === id })))}
        onMove={() => {}}
      />
    </div>
  )
}

export const ReadOnly: Story = {
  render: () => <ReadOnlyDemo />
}

export const Empty: Story = {
  args: {
    image: undefined,
    markers: [],
    emptyContent: '도면 이미지를 업로드하면 표식을 놓을 수 있습니다'
  }
}

/** 버튼으로 이미지를 교체해도 마커는 같은 상대 위치에 남는다(R10·R2) — 좌표는 비율이지 픽셀이 아니다. */
function ImageSwapDemo() {
  const [image, setImage] = useState<ImageMarkerBoardImage>(WIDE)
  const markers = PLAYGROUND_MARKERS
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', width: 480 }}>
      <button type="button" onClick={() => setImage((prev) => (prev === WIDE ? TALL : WIDE))}>
        {image === WIDE ? '창고 도면(3:4)으로 교체' : '1층 도면(16:9)으로 교체'}
      </button>
      <ImageMarkerBoard image={image} markers={markers} onSelect={() => {}} />
    </div>
  )
}

export const ImageSwap: Story = {
  render: () => <ImageSwapDemo />
}

/** "표식 추가" 버튼이 (0.5, 0.5)에 마커를 놓고 그 버튼을 포커스한다 — 키보드만으로 배치 + 이동하는 소비자 패턴 시범. */
function KeyboardOnlyDemo() {
  const [markers, setMarkers] = useState<ImageMarker[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  const handleAdd = () => {
    const id = `k${nextId.current++}`
    setMarkers((prev) => [...prev, { id, x: 0.5, y: 0.5, label: `표식 ${id}` }])
    requestAnimationFrame(() => {
      const buttons = rootRef.current?.querySelectorAll('button')
      const last = buttons?.[buttons.length - 1]
      last?.focus()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', width: 480 }}>
      <p style={helpText}>Tab으로 표식 사이를 이동하고 화살표로 5%씩 옮깁니다.</p>
      <button type="button" onClick={handleAdd}>
        표식 추가
      </button>
      <ImageMarkerBoard
        ref={rootRef}
        image={WIDE}
        markers={markers}
        step={0.05}
        onSelect={() => {}}
        onMove={(id, point) => setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, x: point.x, y: point.y } : m)))}
      />
    </div>
  )
}

export const KeyboardOnly: Story = {
  render: () => <KeyboardOnlyDemo />
}

function MatrixTheme({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div data-theme={theme} style={{ background: 'var(--surface)', padding: 24, display: 'grid', gap: 16 }}>
      <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-variant)' }}>
        {theme === 'light' ? '라이트' : '다크'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <ImageMarkerBoard
          image={WIDE}
          markers={[{ id: 'a', x: 0.5, y: 0.5, label: '기본' }]}
          onSelect={() => {}}
          aria-label="기본"
        />
        <ImageMarkerBoard
          image={WIDE}
          markers={[{ id: 'a', x: 0.5, y: 0.5, label: '선택됨', selected: true }]}
          onSelect={() => {}}
          aria-label="선택 포함"
        />
        <ImageMarkerBoard
          image={WIDE}
          markers={[{ id: 'a', x: 0.5, y: 0.5, label: '읽기 전용' }]}
          readOnly
          onSelect={() => {}}
          aria-label="읽기 전용"
        />
        <ImageMarkerBoard markers={[]} emptyContent="도면 없음" aria-label="빈 상태" />
      </div>
    </div>
  )
}

/** 라이트/다크 × (기본 / 선택 포함 / readOnly / 빈 상태) */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <MatrixTheme theme="light" />
      <MatrixTheme theme="dark" />
    </div>
  )
}
