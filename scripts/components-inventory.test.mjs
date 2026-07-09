// 파서는 픽스처 문자열로, 조립은 실제 src/index.ts 로 검증한다.
// 후자가 중요하다 — Chip(유니온 props + 로컬 베이스)과 LineChart(파일을 넘어가는 상속)에서
// 인벤토리가 거짓말을 하지 않는지 확인하는 게 이 스크립트의 존재 이유이기 때문이다.
import { describe, it, expect } from 'vitest'
import { parseIndex, parseModule, resolveInterface, describeProps, buildInventory, renderMarkdown } from './components-inventory.mjs'

const INDEX = `export const VERSION = '1.2.3'
export { cx } from './utils/cx'
export { Button } from './components/Button/Button'
export type { ButtonProps, ButtonVariant } from './components/Button/Button'

// Phase 2 — Tier 1 components
export { Chip } from './components/Chip/Chip'
export type { ChipProps } from './components/Chip/Chip'
`

const CHIP = `import { type HTMLAttributes, type ButtonHTMLAttributes } from 'react'
export type ChipStatus = 'success' | 'error'
interface ChipCommon {
  status?: ChipStatus
  label: string
}
export interface StatusChipProps extends ChipCommon, Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  dot?: boolean
}
export interface FilterChipProps extends ChipCommon, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  selected?: boolean
}
export type ChipProps = StatusChipProps | FilterChipProps
`

// LineChartProps → CartesianSharedProps → ChartBaseProps(다른 파일) → HTMLAttributes(React)
const LINE_CHART = `import { forwardRef } from 'react'
import { DEFAULT_WIDTH, type ChartBaseProps } from './Chart.shared'
export interface CartesianSharedProps extends ChartBaseProps {
  series: unknown[]
}
export interface LineChartProps extends CartesianSharedProps {
  area?: boolean
}
`
const CHART_SHARED = `import { type HTMLAttributes } from 'react'
export interface ChartBaseProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: string
  height?: number
}
`

// 파일 지도를 그대로 ctx 로 쓴다. 상대 경로 import 만 따라간다.
function fakeCtx(files) {
  return {
    load: (abs) => (files[abs] ? parseModule(files[abs], abs) : null),
    resolveImport: (fromAbs, spec) => {
      if (!spec.startsWith('.')) return null
      const name = spec.replace(/^\.\//, '') + '.ts'
      return files[name] ? name : null
    }
  }
}

describe('parseIndex', () => {
  it('버전과 모듈별 value/type export 를 나눈다', () => {
    const { version, modules } = parseIndex(INDEX)
    expect(version).toBe('1.2.3')

    const button = modules.get('./components/Button/Button')
    expect(button.values).toEqual(['Button'])
    expect(button.types).toEqual(['ButtonProps', 'ButtonVariant'])
  })

  it('직전 주석 줄을 섹션으로 삼고, 주석 이전은 Core 로 둔다', () => {
    const { modules } = parseIndex(INDEX)
    expect(modules.get('./components/Button/Button').section).toBe('Core')
    expect(modules.get('./components/Chip/Chip').section).toBe('Phase 2 — Tier 1 components')
  })
})

describe('resolveInterface', () => {
  const ctx = fakeCtx({ 'Chip.tsx': CHIP })

  it('export 되지 않은 같은 파일의 베이스를 병합한다', () => {
    expect(resolveInterface(ctx, 'Chip.tsx', 'StatusChipProps').members).toEqual(['status', 'label', 'dot'])
  })

  it('React 의 HTMLAttributes 베이스는 펼치지 않고 native 로 표시한다', () => {
    const resolved = resolveInterface(ctx, 'Chip.tsx', 'StatusChipProps')
    expect(resolved.native).toBe(true)
    expect(resolved.unresolved).toEqual([])
  })

  it('없는 이름은 null 을 낸다', () => {
    expect(resolveInterface(ctx, 'Chip.tsx', 'NopeProps')).toBeNull()
  })

  it('import 를 따라가 다른 파일의 베이스까지 병합한다', () => {
    const ctx = fakeCtx({ 'LineChart.tsx': LINE_CHART, 'Chart.shared.ts': CHART_SHARED })
    const resolved = resolveInterface(ctx, 'LineChart.tsx', 'LineChartProps')

    expect(resolved.members).toEqual(['title', 'height', 'series', 'area'])
    expect(resolved.native).toBe(true)
    expect(resolved.unresolved).toEqual([])
  })

  it('따라갈 수 없는 베이스는 삼키지 않고 unresolved 로 남긴다', () => {
    const ctx = fakeCtx({ 'LineChart.tsx': LINE_CHART }) // Chart.shared 가 없다
    const resolved = resolveInterface(ctx, 'LineChart.tsx', 'LineChartProps')

    expect(resolved.members).toEqual(['series', 'area'])
    expect(resolved.unresolved).toEqual(['ChartBaseProps'])
    expect(resolved.native).toBe(false)
  })
})

describe('describeProps', () => {
  const ctx = fakeCtx({ 'Chip.tsx': CHIP })

  it('유니온 props 를 각 갈래로 펼친다', () => {
    const props = describeProps(ctx, 'Chip.tsx', 'ChipProps')
    expect(props.kind).toBe('union')
    expect(props.parts.map((p) => p.name)).toEqual(['StatusChipProps', 'FilterChipProps'])
    expect(props.parts[1].members).toEqual(['status', 'label', 'selected'])
  })

  it('props 가 없는 컴포넌트는 null 을 낸다', () => {
    expect(describeProps(ctx, 'Chip.tsx', 'MissingProps')).toBeNull()
  })
})

describe('buildInventory (실제 소스)', () => {
  const inv = buildInventory()
  const find = (name) => inv.entries.find((e) => e.name === name)

  it('Button 의 variant 리터럴을 그대로 뽑는다', () => {
    expect(find('Button').variants.find((v) => v.name === 'ButtonVariant').values).toEqual([
      'filled',
      'tonal',
      'outlined',
      'text'
    ])
  })

  it('Chip 의 props 를 유니온으로 인식한다', () => {
    const chip = find('Chip').exports.find((e) => e.name === 'Chip')
    expect(chip.props.kind).toBe('union')
    expect(chip.props.parts.map((p) => p.name)).toEqual(['StatusChipProps', 'FilterChipProps'])
  })

  it('LineChart 가 파일 밖의 ChartBaseProps 를 상속한 props 를 모두 싣는다', () => {
    const props = find('LineChart').exports[0].props
    expect(props.members).toEqual(expect.arrayContaining(['title', 'caption', 'height', 'showLegend', 'formatValue']))
    expect(props.unresolved).toEqual([])
  })

  it('어떤 컴포넌트도 해석하지 못한 베이스를 남기지 않는다', () => {
    const dangling = inv.entries.flatMap((e) =>
      e.exports.flatMap((x) => [...(x.props?.unresolved || []), ...(x.props?.parts || []).flatMap((p) => p.unresolved)])
    )
    expect(dangling).toEqual([])
  })

  it('훅과 유틸을 컴포넌트와 구분한다', () => {
    expect(find('cx').exports[0].kind).toBe('util')
    expect(find('AppShell').exports.find((e) => e.name === 'useAppShell').kind).toBe('hook')
    expect(inv.counts.components).toBeGreaterThanOrEqual(26)
  })
})

describe('renderMarkdown', () => {
  it('같은 입력에 같은 출력을 낸다 (타임스탬프 없음 — 드리프트 검사의 전제)', () => {
    const inv = buildInventory()
    expect(renderMarkdown(inv)).toBe(renderMarkdown(inv))
  })
})
