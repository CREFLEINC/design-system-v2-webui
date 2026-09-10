import type { Meta, StoryObj } from '@storybook/react-vite'
import { QrCode } from './QrCode'

const helpText = { marginTop: 8, font: 'var(--type-body-sm)', color: 'var(--on-surface-muted)' } as const

// value·size·alt 는 검증 도구가 그대로 참조하는 계약이다 — 바꾸지 않는다.
const meta = {
  title: 'Components/QrCode',
  component: QrCode,
  args: {
    value: 'https://crefle.com/issues/88',
    size: 256,
    alt: '이슈 88 링크 QR 코드'
  }
} satisfies Meta<typeof QrCode>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {([96, 128, 192, 256] as const).map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <QrCode value="https://crefle.com/issues/88" size={size} alt={`${size}px 크기 QR 코드`} />
          <p style={helpText}>{size}px</p>
        </div>
      ))}
    </div>
  )
}

export const Values: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <QrCode value="0123456789012345" size={192} alt="숫자만 담은 QR 코드" />
        <p style={helpText}>숫자만</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <QrCode value="https://crefle.com/설비/라인-3?id=42&이름=크레플" size={192} alt="한글이 섞인 URL QR 코드" />
        <p style={helpText}>한글 URL</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <QrCode
          value={'Lorem ipsum dolor sit amet, '.repeat(18).slice(0, 300)}
          size={192}
          alt="300자 텍스트 QR 코드"
        />
        <p style={helpText}>300자 텍스트</p>
      </div>
    </div>
  )
}

export const OnDarkSurface: Story = {
  render: () => (
    <div data-theme="dark" style={{ background: 'var(--surface)', padding: 24 }}>
      <QrCode value="https://crefle.com/issues/88" size={192} alt="다크 표면 위 QR 코드" />
    </div>
  )
}

function MatrixBlock({ theme }: { theme: 'light' | 'dark' }) {
  const values = ['https://crefle.com/issues/88', '0123456789012345'] as const
  const sizes = [96, 128, 192] as const
  return (
    <div data-theme={theme} style={{ background: 'var(--surface)', padding: 16, display: 'grid', gap: 20 }}>
      <div style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-variant)' }}>
        {theme === 'light' ? '라이트' : '다크'}
      </div>
      {values.map((value) => (
        <div key={value} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {sizes.map((size) => (
            <QrCode key={size} value={value} size={size} alt={`${size}px ${value} QR 코드`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <MatrixBlock theme="light" />
      <MatrixBlock theme="dark" />
    </div>
  )
}
