import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MatrixGrid, type MatrixColumn, type MatrixRow } from './MatrixGrid'
import styles from './MatrixGrid.module.css'

const makeColumns = (n: number): MatrixColumn[] =>
  Array.from({ length: n }, (_, i) => ({ key: `d${i + 1}`, label: `${i + 1}일` }))

test('7열 매트릭스: role=grid + aria-label, columnheader 7개·행 3개(헤더1+본문2)', () => {
  const columns = makeColumns(7)
  const { container } = render(
    <MatrixGrid
      aria-label="주간 설비 상태"
      columns={columns}
      rows={[
        { label: '가압기', cells: columns.map((c) => ({ key: c.key, status: 'success' })) },
        { label: '냉각기', cells: columns.map((c) => ({ key: c.key, status: 'idle' })) }
      ]}
    />
  )
  expect(screen.getByRole('grid', { name: '주간 설비 상태' })).toBeInTheDocument()
  // 좌상단 코너 th(scope 없음)도 암묵적으로 columnheader 역할을 가지므로
  // 열 헤더 개수는 scope="col"로 한정해 정합을 확인한다.
  expect(container.querySelectorAll('thead th[scope="col"]')).toHaveLength(7)
  expect(screen.getAllByRole('row')).toHaveLength(3) // 헤더 1 + 본문 2
})

test('31열 매트릭스: columnheader 31개·행 2개(헤더1+본문1)', () => {
  const columns = makeColumns(31)
  const { container } = render(
    <MatrixGrid
      aria-label="월간 설비 상태"
      columns={columns}
      rows={[{ label: '가압기', cells: columns.map((c) => ({ key: c.key, status: 'success' })) }]}
    />
  )
  expect(screen.getByRole('grid', { name: '월간 설비 상태' })).toBeInTheDocument()
  expect(container.querySelectorAll('thead th[scope="col"]')).toHaveLength(31)
  expect(screen.getAllByRole('row')).toHaveLength(2) // 헤더 1 + 본문 1
})

test('status-only 셀은 data-status+data-tone=solid, status+content 셀은 data-tone=container, status 없는/none 셀은 둘 다 없다', () => {
  const columns = makeColumns(4)
  const { container } = render(
    <MatrixGrid
      columns={columns}
      rows={[
        {
          label: '가압기',
          cells: [
            { key: 'd1', status: 'success' },
            { key: 'd2', status: 'error', content: '85%' },
            { key: 'd3' },
            { key: 'd4', status: 'none' }
          ]
        }
      ]}
    />
  )
  const cells = container.querySelectorAll('tbody td')
  expect(cells[0]).toHaveAttribute('data-status', 'success')
  expect(cells[0]).toHaveAttribute('data-tone', 'solid')
  expect(cells[1]).toHaveAttribute('data-status', 'error')
  expect(cells[1]).toHaveAttribute('data-tone', 'container')
  expect(cells[2]).not.toHaveAttribute('data-status')
  expect(cells[2]).not.toHaveAttribute('data-tone')
  expect(cells[3]).not.toHaveAttribute('data-status')
  expect(cells[3]).not.toHaveAttribute('data-tone')
})

test('renderCell 결과가 기본 렌더를 대체한다', () => {
  const columns = makeColumns(1)
  render(
    <MatrixGrid
      columns={columns}
      rows={[{ label: '가압기', cells: [{ key: 'd1', content: '기본', status: 'success' }] }]}
      renderCell={(cell) => `커스텀:${cell.key}`}
    />
  )
  expect(screen.getByText('커스텀:d1')).toBeInTheDocument()
  expect(screen.queryByText('기본')).not.toBeInTheDocument()
})

test('행 라벨이 th scope="row"로 렌더되고 sticky 클래스를 갖는다', () => {
  render(
    <MatrixGrid
      columns={makeColumns(2)}
      rows={[{ label: '가압기', cells: [{ key: 'd1' }, { key: 'd2' }] }]}
    />
  )
  const rowHeader = screen.getByRole('rowheader', { name: '가압기' })
  expect(rowHeader.tagName).toBe('TH')
  expect(rowHeader).toHaveAttribute('scope', 'row')
  expect(rowHeader.className).toContain(styles.labelCell)
})

test('highlight 열은 thead·tbody·tfoot 관통 셀 모두에 data-highlight를 부여한다', () => {
  const columns: MatrixColumn[] = [
    { key: 'd1', label: '1일' },
    { key: 'd2', label: '2일', highlight: true },
    { key: 'd3', label: '3일' }
  ]
  const { container } = render(
    <MatrixGrid
      columns={columns}
      rows={[{ label: '가압기', cells: [{ key: 'd1' }, { key: 'd2' }, { key: 'd3' }] }]}
      summaryRow={{
        label: '종합',
        cells: [{ key: 'd1' }, { key: 'd2' }, { key: 'd3' }]
      }}
    />
  )
  const headerCells = container.querySelectorAll('thead th[scope="col"]')
  expect(headerCells[0]).not.toHaveAttribute('data-highlight')
  expect(headerCells[1]).toHaveAttribute('data-highlight', 'true')
  expect(headerCells[2]).not.toHaveAttribute('data-highlight')

  const bodyCells = container.querySelectorAll('tbody td')
  expect(bodyCells[0]).not.toHaveAttribute('data-highlight')
  expect(bodyCells[1]).toHaveAttribute('data-highlight', 'true')
  expect(bodyCells[2]).not.toHaveAttribute('data-highlight')

  const footCells = container.querySelectorAll('tfoot td')
  expect(footCells[0]).not.toHaveAttribute('data-highlight')
  expect(footCells[1]).toHaveAttribute('data-highlight', 'true')
  expect(footCells[2]).not.toHaveAttribute('data-highlight')
})

test('summaryRow가 tfoot로 렌더된다', () => {
  const { container } = render(
    <MatrixGrid
      columns={makeColumns(2)}
      rows={[{ label: '가압기', cells: [{ key: 'd1' }, { key: 'd2' }] }]}
      summaryRow={{
        label: '종합',
        cells: [
          { key: 'd1', content: '정상' },
          { key: 'd2', content: '주의' }
        ]
      }}
    />
  )
  const tfoot = container.querySelector('tfoot')
  expect(tfoot).not.toBeNull()
  expect(tfoot!.textContent).toContain('종합')
  expect(tfoot!.textContent).toContain('정상')
  expect(tfoot!.textContent).toContain('주의')
})

test('groupHeaders span 합이 columns 길이와 일치하면 렌더되고 경고가 없다', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const columns = makeColumns(4)
  render(
    <MatrixGrid
      columns={columns}
      rows={[{ label: '가압기', cells: columns.map((c) => ({ key: c.key })) }]}
      groupHeaders={[
        { label: '1주차', span: 2 },
        { label: '2주차', span: 2 }
      ]}
    />
  )
  expect(screen.getByText('1주차')).toBeInTheDocument()
  expect(screen.getByText('2주차')).toBeInTheDocument()
  expect(warnSpy).not.toHaveBeenCalled()
  warnSpy.mockRestore()
})

test('groupHeaders span 합이 columns 길이와 다르면 console.warn을 호출한다', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const columns = makeColumns(4)
  render(
    <MatrixGrid
      columns={columns}
      rows={[{ label: '가압기', cells: columns.map((c) => ({ key: c.key })) }]}
      groupHeaders={[
        { label: '1주차', span: 2 },
        { label: '2주차', span: 3 } // 합 5 ≠ columns 4
      ]}
    />
  )
  expect(warnSpy).toHaveBeenCalled()
  warnSpy.mockRestore()
})

test('colSpan·rowSpan이 td 속성에 반영되고 기본값(1)은 속성이 생략된다', () => {
  const { container } = render(
    <MatrixGrid
      columns={makeColumns(3)}
      rows={[
        { label: '가압기', cells: [{ key: 'a', colSpan: 2, rowSpan: 2 }, { key: 'c' }] },
        { label: '냉각기', cells: [{ key: 'd' }] }
      ]}
    />
  )
  const bodyRows = container.querySelectorAll('tbody tr')
  const row1Cells = bodyRows[0].querySelectorAll('td')
  expect(row1Cells[0]).toHaveAttribute('colspan', '2')
  expect(row1Cells[0]).toHaveAttribute('rowspan', '2')
  expect(row1Cells[1]).not.toHaveAttribute('colspan')
  expect(row1Cells[1]).not.toHaveAttribute('rowspan')
})

test('rowSpan 이월 후 다음 행의 highlight 열 판정이 어긋나지 않는다 (점유 매트릭스 회귀 방지)', () => {
  const columns: MatrixColumn[] = [
    { key: 'd1', label: '1일' },
    { key: 'd2', label: '2일', highlight: true },
    { key: 'd3', label: '3일' }
  ]
  const { container } = render(
    <MatrixGrid
      columns={columns}
      rows={[
        {
          label: '가압기',
          cells: [{ key: 'a', rowSpan: 2 }, { key: 'b' }, { key: 'c' }]
        },
        {
          // a의 rowSpan 이월로 col0이 점유되어, 이 행의 첫 셀(d)은
          // col1(highlight 열)로 밀려 배치되어야 한다.
          label: '냉각기',
          cells: [{ key: 'd' }, { key: 'e' }]
        }
      ]}
    />
  )
  const bodyRows = container.querySelectorAll('tbody tr')
  expect(bodyRows).toHaveLength(2)

  const row1Cells = bodyRows[0].querySelectorAll('td')
  expect(row1Cells[1]).toHaveAttribute('data-highlight', 'true') // b → col1(highlight)

  const row2Cells = bodyRows[1].querySelectorAll('td')
  expect(row2Cells).toHaveLength(2) // a의 이월만큼 실제 셀은 d, e 뿐
  expect(row2Cells[0]).toHaveAttribute('data-highlight', 'true') // d → 이월 건너뛰어 col1(highlight)
  expect(row2Cells[1]).not.toHaveAttribute('data-highlight') // e → col2
})

test('onCellClick: 클릭 시 (row, col, cell) 인자로 호출되고, 셀은 tabIndex=0 + Enter/Space로 활성화된다', async () => {
  const user = userEvent.setup()
  const onCellClick = vi.fn()
  const columns = makeColumns(1)
  const row: MatrixRow = { label: '가압기', cells: [{ key: 'd1', content: '85%' }] }
  render(<MatrixGrid columns={columns} rows={[row]} onCellClick={onCellClick} />)

  const cell = screen.getByText('85%').closest('td') as HTMLTableCellElement
  expect(cell).toHaveAttribute('tabindex', '0')

  await user.click(cell)
  expect(onCellClick).toHaveBeenLastCalledWith(row, columns[0], row.cells[0])

  cell.focus()
  await user.keyboard('{Enter}')
  expect(onCellClick).toHaveBeenCalledTimes(2)

  await user.keyboard(' ')
  expect(onCellClick).toHaveBeenCalledTimes(3)
})

test('onCellClick 미제공 시 셀에 tabIndex가 없다', () => {
  render(
    <MatrixGrid
      columns={makeColumns(1)}
      rows={[{ label: '가압기', cells: [{ key: 'd1', content: '85%' }] }]}
    />
  )
  const cell = screen.getByText('85%').closest('td')
  expect(cell).not.toHaveAttribute('tabindex')
})

test('cell.ariaLabel이 반영되고, status-only 셀은 행·열 라벨과 상태명을 조합한 자동 aria-label을 갖는다', () => {
  const columns = makeColumns(2)
  const { container } = render(
    <MatrixGrid
      columns={columns}
      rows={[
        {
          label: '가압기',
          cells: [
            { key: 'd1', status: 'error', ariaLabel: '7월 6일 · 냉각수 · 이상' },
            { key: 'd2', status: 'warning' }
          ]
        }
      ]}
    />
  )
  const cells = container.querySelectorAll('tbody td')
  expect(cells[0]).toHaveAttribute('aria-label', '7월 6일 · 냉각수 · 이상')
  expect(cells[1]).toHaveAttribute('aria-label', `가압기 · ${columns[1].label} · 주의`)
})
