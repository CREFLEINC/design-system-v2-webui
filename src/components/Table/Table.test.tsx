import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Table } from './Table'

test('caption·컬럼헤더·행을 렌더한다', () => {
  render(
    <Table
      caption="설비 목록"
      getRowId={(r) => r.id}
      columns={[
        { key: 'name', header: '장비명' },
        { key: 'status', header: '상태' }
      ]}
      rows={[
        { id: 'a', name: '가압기', status: '정상' },
        { id: 'b', name: '냉각기', status: '점검' }
      ]}
    />
  )
  expect(screen.getByRole('table', { name: '설비 목록' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: '장비명' })).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: '가압기' })).toBeInTheDocument()
  expect(screen.getAllByRole('row')).toHaveLength(3) // 헤더 1 + 본문 2
})

test('정렬 클릭이 aria-sort 3-상태를 토글하고 행을 재정렬한다', async () => {
  const user = userEvent.setup()
  const bodyNames = () =>
    screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent)
  render(
    <Table
      getRowId={(r) => r.id}
      columns={[
        { key: 'name', header: '장비명', sortable: true },
        { key: 'temp', header: '온도', align: 'end', sortable: true, render: (r) => `${r.temp}°C` }
      ]}
      rows={[
        { id: 'a', name: '가압기', temp: 40 },
        { id: 'b', name: '냉각기', temp: 12 },
        { id: 'c', name: '펌프', temp: 25 }
      ]}
    />
  )
  const tempHeader = screen.getByRole('columnheader', { name: /온도/ })
  expect(tempHeader).toHaveAttribute('aria-sort', 'none')
  expect(bodyNames()).toEqual(['가압기', '냉각기', '펌프'])

  await user.click(screen.getByRole('button', { name: /온도/ }))
  expect(tempHeader).toHaveAttribute('aria-sort', 'ascending')
  expect(bodyNames()).toEqual(['냉각기', '펌프', '가압기']) // 12,25,40

  await user.click(screen.getByRole('button', { name: /온도/ }))
  expect(tempHeader).toHaveAttribute('aria-sort', 'descending')
  expect(bodyNames()).toEqual(['가압기', '펌프', '냉각기']) // 40,25,12

  await user.click(screen.getByRole('button', { name: /온도/ }))
  expect(tempHeader).toHaveAttribute('aria-sort', 'none')
  expect(bodyNames()).toEqual(['가압기', '냉각기', '펌프']) // 원래 순서 복귀
})

test('Enter 키로 정렬이 토글되고 onSortChange가 다음 상태를 전달한다', async () => {
  const user = userEvent.setup()
  const onSortChange = vi.fn()
  render(
    <Table
      getRowId={(r) => r.id}
      onSortChange={onSortChange}
      columns={[{ key: 'name', header: '장비명', sortable: true }]}
      rows={[{ id: 'a', name: '가압기' }]}
    />
  )
  await user.tab() // 정렬 버튼으로 포커스
  expect(screen.getByRole('button', { name: /장비명/ })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', direction: 'ascending' })
  expect(screen.getByRole('columnheader', { name: /장비명/ })).toHaveAttribute('aria-sort', 'ascending')
})

test('정렬 불가 열은 버튼·aria-sort가 없다', () => {
  render(
    <Table
      getRowId={(r) => r.id}
      columns={[{ key: 'status', header: '상태' }]}
      rows={[{ id: 'a', status: '정상' }]}
    />
  )
  const header = screen.getByRole('columnheader', { name: '상태' })
  expect(header).not.toHaveAttribute('aria-sort')
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

test('전체 선택 체크박스가 indeterminate/checked를 파생하고 토글을 방출한다', async () => {
  const user = userEvent.setup()
  const onSelectionChange = vi.fn()
  const rows = [
    { id: 'a', name: '가압기' },
    { id: 'b', name: '냉각기' }
  ]
  const { rerender } = render(
    <Table
      selectable
      selectedIds={['a']}
      onSelectionChange={onSelectionChange}
      getRowId={(r) => r.id}
      columns={[{ key: 'name', header: '장비명' }]}
      rows={rows}
    />
  )
  const selectAll = screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement
  expect(selectAll.indeterminate).toBe(true) // 2개 중 1개

  await user.click(selectAll) // 부분 → 전체 선택
  expect(onSelectionChange).toHaveBeenLastCalledWith(['a', 'b'])

  rerender(
    <Table
      selectable
      selectedIds={['a', 'b']}
      onSelectionChange={onSelectionChange}
      getRowId={(r) => r.id}
      columns={[{ key: 'name', header: '장비명' }]}
      rows={rows}
    />
  )
  expect(selectAll.indeterminate).toBe(false)
  expect(selectAll.checked).toBe(true)
  await user.click(selectAll) // 전체 → 해제
  expect(onSelectionChange).toHaveBeenLastCalledWith([])
})

test('행 선택 체크박스가 controlled 상태를 반영하고 id를 방출한다', async () => {
  const user = userEvent.setup()
  const onSelectionChange = vi.fn()
  render(
    <Table
      selectable
      selectedIds={['a']}
      onSelectionChange={onSelectionChange}
      getRowId={(r) => r.id}
      columns={[{ key: 'name', header: '장비명' }]}
      rows={[
        { id: 'a', name: '가압기' },
        { id: 'b', name: '냉각기' }
      ]}
    />
  )
  const rowChecks = screen.getAllByRole('checkbox', { name: '행 선택' }) as HTMLInputElement[]
  expect(rowChecks[0].checked).toBe(true) // a 선택됨
  expect(rowChecks[1].checked).toBe(false)
  await user.click(rowChecks[1]) // b 추가
  expect(onSelectionChange).toHaveBeenCalledWith(['a', 'b'])
})

test('align=end 열의 셀은 data-align=end를 갖는다', () => {
  render(
    <Table
      getRowId={(r) => r.id}
      columns={[{ key: 'temp', header: '온도', align: 'end', render: (r) => `${r.temp}°C` }]}
      rows={[{ id: 'a', temp: 40 }]}
    />
  )
  const cell = screen.getByRole('cell', { name: '40°C' })
  expect(cell).toHaveAttribute('data-align', 'end')
})

test('rows가 비면 empty 노드를 렌더한다', () => {
  render(
    <Table
      getRowId={(r) => r.id}
      columns={[{ key: 'name', header: '장비명' }]}
      rows={[] as { id: string; name: string }[]}
      empty={<span>표시할 이벤트가 없습니다</span>}
    />
  )
  expect(screen.getByText('표시할 이벤트가 없습니다')).toBeInTheDocument()
  expect(screen.queryAllByRole('cell').every((c) => c.textContent !== '가압기')).toBe(true)
})

test('summaryRows가 tfoot에 다중 요약 행(소계·총계)을 렌더한다', () => {
  const { container } = render(
    <Table
      getRowId={(r) => r.id}
      columns={[
        { key: 'name', header: '장비명' },
        { key: 'temp', header: '온도', align: 'end' },
        { key: 'pressure', header: '압력', align: 'end' },
        { key: 'status', header: '상태' }
      ]}
      rows={[
        { id: 'a', name: '가압기', temp: 40, pressure: 5, status: '정상' },
        { id: 'b', name: '냉각기', temp: 12, pressure: 3, status: '점검' }
      ]}
      summaryRows={[
        [
          { key: 'subtotal-label', content: '소계', colSpan: 2 },
          { key: 'subtotal-temp', content: '52', align: 'end' },
          { key: 'subtotal-pressure', content: '8', align: 'end' }
        ],
        [
          { key: 'total-label', content: '총계', colSpan: 2 },
          { key: 'total-temp', content: '52', align: 'end' },
          { key: 'total-pressure', content: '8', align: 'end' }
        ]
      ]}
    />
  )
  const tfoot = container.querySelector('tfoot')
  expect(tfoot).not.toBeNull()
  const tfootRows = tfoot!.querySelectorAll('tr')
  expect(tfootRows).toHaveLength(2)
  expect(tfootRows[0].textContent).toContain('소계')
  expect(tfootRows[1].textContent).toContain('총계')
})

test('요약 셀 colSpan이 DOM colspan에 반영되고 headers가 병합된 열들의 th id를 참조한다', () => {
  render(
    <Table
      getRowId={(r) => r.id}
      columns={[
        { key: 'name', header: '장비명' },
        { key: 'temp', header: '온도', align: 'end' },
        { key: 'pressure', header: '압력', align: 'end' },
        { key: 'status', header: '상태' }
      ]}
      rows={[{ id: 'a', name: '가압기', temp: 40, pressure: 5, status: '정상' }]}
      summaryRows={[
        [
          { key: 'label', content: '합계', colSpan: 3 },
          { key: 'value', content: '-' }
        ]
      ]}
    />
  )
  const headers = screen.getAllByRole('columnheader')
  const expectedHeaderIds = headers.slice(0, 3).map((h) => h.id).join(' ')
  const summaryCell = screen.getByRole('cell', { name: '합계' })
  expect(summaryCell).toHaveAttribute('colspan', '3')
  expect(summaryCell).toHaveAttribute('headers', expectedHeaderIds)
})

test('정렬 토글은 본문 순서만 바꾸고 tfoot 요약 행은 내용·개수·위치가 불변이다', async () => {
  const user = userEvent.setup()
  render(
    <Table
      getRowId={(r) => r.id}
      columns={[
        { key: 'name', header: '장비명', sortable: true },
        { key: 'temp', header: '온도', align: 'end', sortable: true, render: (r) => `${r.temp}°C` }
      ]}
      rows={[
        { id: 'a', name: '가압기', temp: 40 },
        { id: 'b', name: '냉각기', temp: 12 },
        { id: 'c', name: '펌프', temp: 25 }
      ]}
      summaryRows={[
        [
          { key: 'label', content: '합계' },
          { key: 'value', content: '77°C', align: 'end' }
        ]
      ]}
    />
  )
  const bodyNames = () =>
    screen.getAllByRole('row').slice(1, -1).map((r) => r.querySelector('td')?.textContent)
  const expectFooterUnchanged = () => {
    const allRows = screen.getAllByRole('row')
    expect(allRows).toHaveLength(5) // 헤더1 + 본문3 + 요약1
    const footerRow = allRows[allRows.length - 1]
    expect(footerRow.textContent).toContain('합계')
    expect(footerRow.textContent).toContain('77°C')
  }

  expect(bodyNames()).toEqual(['가압기', '냉각기', '펌프'])
  expectFooterUnchanged()

  await user.click(screen.getByRole('button', { name: /온도/ })) // asc
  expect(bodyNames()).toEqual(['냉각기', '펌프', '가압기']) // 12,25,40
  expectFooterUnchanged()

  await user.click(screen.getByRole('button', { name: /온도/ })) // desc
  expect(bodyNames()).toEqual(['가압기', '펌프', '냉각기']) // 40,25,12
  expectFooterUnchanged()
})

test('selectable + summaryRows에서 tfoot에는 체크박스가 없고 전체 선택은 본문 행 id만 방출한다', async () => {
  const user = userEvent.setup()
  const onSelectionChange = vi.fn()
  const { container } = render(
    <Table
      selectable
      selectedIds={[]}
      onSelectionChange={onSelectionChange}
      getRowId={(r) => r.id}
      columns={[
        { key: 'name', header: '장비명' },
        { key: 'temp', header: '온도', align: 'end' },
        { key: 'pressure', header: '압력', align: 'end' },
        { key: 'status', header: '상태' }
      ]}
      rows={[
        { id: 'a', name: '가압기', temp: 40, pressure: 5, status: '정상' },
        { id: 'b', name: '냉각기', temp: 12, pressure: 3, status: '점검' }
      ]}
      summaryRows={[
        [
          { key: 'label', content: '합계', colSpan: 3 },
          { key: 'value', content: '-' }
        ]
      ]}
    />
  )
  const tfoot = container.querySelector('tfoot')!
  expect(tfoot.querySelectorAll('input[type="checkbox"], [role="checkbox"]')).toHaveLength(0)

  const footerCells = tfoot.querySelectorAll('td')
  // 선행 빈 선택 셀(1) + 요약 셀 2개(label: colSpan 3, value: colSpan 없음) = 3
  // colSpan으로 열을 병합해도 <td> 개수 자체는 늘지 않음을 함께 확인한다
  expect(footerCells).toHaveLength(3)
  expect(footerCells[0]).toBeEmptyDOMElement()

  await user.click(screen.getByRole('checkbox', { name: '전체 선택' }))
  expect(onSelectionChange).toHaveBeenLastCalledWith(['a', 'b'])
})

test('요약 셀의 align·emphasis가 data-align·data-emphasis로 반영된다', () => {
  const { container } = render(
    <Table
      getRowId={(r) => r.id}
      columns={[
        { key: 'name', header: '장비명' },
        { key: 'temp', header: '온도', align: 'end' }
      ]}
      rows={[{ id: 'a', name: '가압기', temp: 40 }]}
      summaryRows={[
        [
          { key: 'label', content: '합계' },
          { key: 'value', content: '160', align: 'end', emphasis: true }
        ]
      ]}
    />
  )
  const tfoot = container.querySelector('tfoot')!
  const footerCells = tfoot.querySelectorAll('td')
  const valueCell = footerCells[footerCells.length - 1]
  expect(valueCell.textContent).toBe('160')
  expect(valueCell).toHaveAttribute('data-align', 'end')
  expect(valueCell).toHaveAttribute('data-emphasis', 'true')
})

test('groupBy 지정 시 그룹 헤더를 th[scope=rowgroup] 전폭 셀로 렌더하고 role=row를 유지한다', () => {
  const { container } = render(
    <Table
      getRowId={(r) => r.id}
      groupBy={(r) => r.status}
      columns={[
        { key: 'name', header: '장비명' },
        { key: 'status', header: '상태' }
      ]}
      rows={[
        { id: 'a', name: '가압기', status: '정상' },
        { id: 'b', name: '냉각기', status: '정상' },
        { id: 'c', name: '펌프', status: '점검' }
      ]}
    />
  )
  const groupHeaderCells = container.querySelectorAll('tr[data-group-header] th')
  expect(groupHeaderCells).toHaveLength(2) // 정상, 점검
  expect(groupHeaderCells[0]).toHaveAttribute('scope', 'rowgroup')
  expect(groupHeaderCells[0]).toHaveAttribute('colspan', '2') // 열 2개 전폭
  expect(groupHeaderCells[0].textContent).toBe('정상') // 기본 렌더 = key 텍스트
  expect(groupHeaderCells[1].textContent).toBe('점검')
  // 그룹 헤더 행도 role=row 유지: 헤더1 + 그룹헤더2 + 데이터3 = 6
  expect(screen.getAllByRole('row')).toHaveLength(6)
})

test('그룹 순서는 첫 등장 순이고 비연속 동일 키를 하나의 그룹으로 클러스터링한다', () => {
  const { container } = render(
    <Table
      getRowId={(r) => r.id}
      groupBy={(r) => r.group}
      columns={[{ key: 'name', header: '이름' }]}
      rows={[
        { id: '1', name: '첫', group: 'A' },
        { id: '2', name: '둘', group: 'B' },
        { id: '3', name: '셋', group: 'A' } // 비연속 A
      ]}
    />
  )
  const headers = container.querySelectorAll('tr[data-group-header] th')
  expect(headers).toHaveLength(2) // A, B — 3번 행이 A로 병합되어 그룹은 2개
  expect(headers[0].textContent).toBe('A') // 첫 등장 순
  expect(headers[1].textContent).toBe('B')
  const bodies = container.querySelectorAll('tbody')
  expect(bodies).toHaveLength(2) // 그룹 수 = tbody 수
  const firstBodyRows = bodies[0].querySelectorAll('tr:not([data-group-header])')
  expect(firstBodyRows).toHaveLength(2) // A 그룹: id 1, 3
  expect(firstBodyRows[0].textContent).toContain('첫')
  expect(firstBodyRows[1].textContent).toContain('셋')
})

test('정렬 토글 시 그룹 경계는 유지되고 재정렬은 그룹 내부에서만 일어난다', async () => {
  const user = userEvent.setup()
  const { container } = render(
    <Table
      getRowId={(r) => r.id}
      groupBy={(r) => r.status}
      columns={[
        { key: 'name', header: '장비명' },
        { key: 'temp', header: '온도', align: 'end', sortable: true, render: (r) => `${r.temp}°C` }
      ]}
      rows={[
        { id: 'a', name: '가압기', status: '정상', temp: 40 },
        { id: 'b', name: '냉각기', status: '정상', temp: 12 },
        { id: 'c', name: '펌프', status: '점검', temp: 25 },
        { id: 'd', name: '밸브', status: '점검', temp: 5 }
      ]}
    />
  )
  const groupKeys = () =>
    [...container.querySelectorAll('tr[data-group-header] th')].map((th) => th.textContent)
  const namesByBody = () =>
    [...container.querySelectorAll('tbody')].map((b) =>
      [...b.querySelectorAll('tr:not([data-group-header]) td:first-child')].map((td) => td.textContent)
    )
  expect(groupKeys()).toEqual(['정상', '점검'])
  expect(namesByBody()).toEqual([['가압기', '냉각기'], ['펌프', '밸브']])

  await user.click(screen.getByRole('button', { name: /온도/ })) // asc
  expect(groupKeys()).toEqual(['정상', '점검']) // 그룹 순서·개수 불변
  expect(namesByBody()).toEqual([['냉각기', '가압기'], ['밸브', '펌프']]) // 그룹 내부만 정렬(12<40, 5<25)

  await user.click(screen.getByRole('button', { name: /온도/ })) // desc
  expect(namesByBody()).toEqual([['가압기', '냉각기'], ['펌프', '밸브']]) // 40>12, 25>5

  await user.click(screen.getByRole('button', { name: /온도/ })) // none
  expect(groupKeys()).toEqual(['정상', '점검'])
  expect(namesByBody()).toEqual([['가압기', '냉각기'], ['펌프', '밸브']]) // 원순서 복귀
})

test('selectable + groupBy에서 그룹 헤더는 선택 열 포함 전폭이고 체크박스가 없으며 전체 선택은 데이터 행 id만 방출한다', async () => {
  const user = userEvent.setup()
  const onSelectionChange = vi.fn()
  const { container } = render(
    <Table
      selectable
      selectedIds={[]}
      onSelectionChange={onSelectionChange}
      getRowId={(r) => r.id}
      groupBy={(r) => r.status}
      columns={[
        { key: 'name', header: '장비명' },
        { key: 'status', header: '상태' }
      ]}
      rows={[
        { id: 'a', name: '가압기', status: '정상' },
        { id: 'b', name: '냉각기', status: '점검' }
      ]}
    />
  )
  const headerCells = container.querySelectorAll('tr[data-group-header] th')
  expect(headerCells).toHaveLength(2)
  // colSpan = columns.length(2) + 선택 열(1) = 3
  expect(headerCells[0]).toHaveAttribute('colspan', '3')
  // 그룹 헤더 행에는 체크박스가 없다
  container.querySelectorAll('tr[data-group-header]').forEach((tr) => {
    expect(tr.querySelectorAll('input[type="checkbox"], [role="checkbox"]')).toHaveLength(0)
  })
  await user.click(screen.getByRole('checkbox', { name: '전체 선택' }))
  expect(onSelectionChange).toHaveBeenLastCalledWith(['a', 'b']) // 데이터 행 id만
})

test('zebra 패리티는 그룹마다 리셋되고 그룹 헤더 행에는 parity 속성이 없다', () => {
  const { container } = render(
    <Table
      getRowId={(r) => r.id}
      groupBy={(r) => r.group}
      columns={[{ key: 'name', header: '이름' }]}
      rows={[
        { id: '1', name: 'a', group: 'G1' },
        { id: '2', name: 'b', group: 'G1' },
        { id: '3', name: 'c', group: 'G1' },
        { id: '4', name: 'd', group: 'G2' },
        { id: '5', name: 'e', group: 'G2' }
      ]}
    />
  )
  const bodies = container.querySelectorAll('tbody')
  const g1 = bodies[0].querySelectorAll('tr:not([data-group-header])')
  expect(g1[0]).toHaveAttribute('data-parity', 'odd')
  expect(g1[1]).toHaveAttribute('data-parity', 'even') // 2번째 데이터 행
  expect(g1[2]).toHaveAttribute('data-parity', 'odd')
  const g2 = bodies[1].querySelectorAll('tr:not([data-group-header])')
  expect(g2[0]).toHaveAttribute('data-parity', 'odd') // 그룹 리셋 — 두 번째 그룹 1행도 odd
  expect(g2[1]).toHaveAttribute('data-parity', 'even')
  // 그룹 헤더 행은 parity 속성이 없다
  container.querySelectorAll('tr[data-group-header]').forEach((tr) => {
    expect(tr.hasAttribute('data-parity')).toBe(false)
  })
})

test('groupBy + summaryRows 동시 사용 시 tfoot 요약과 tbody 그룹 헤더가 공존한다', async () => {
  const user = userEvent.setup()
  const { container } = render(
    <Table
      getRowId={(r) => r.id}
      groupBy={(r) => r.status}
      columns={[
        { key: 'name', header: '장비명' },
        { key: 'temp', header: '온도', align: 'end', sortable: true, render: (r) => `${r.temp}°C` }
      ]}
      rows={[
        { id: 'a', name: '가압기', status: '정상', temp: 40 },
        { id: 'b', name: '냉각기', status: '정상', temp: 12 },
        { id: 'c', name: '펌프', status: '점검', temp: 25 }
      ]}
      summaryRows={[
        [
          { key: 'label', content: '합계' },
          { key: 'value', content: '77°C', align: 'end' }
        ]
      ]}
    />
  )
  const footerState = () => {
    const tfoot = container.querySelector('tfoot')!
    return {
      rowCount: tfoot.querySelectorAll('tr').length,
      hasLabel: tfoot.textContent?.includes('합계'),
      hasValue: tfoot.textContent?.includes('77°C'),
      groupHeaders: tfoot.querySelectorAll('[data-group-header]').length
    }
  }
  expect(footerState()).toEqual({ rowCount: 1, hasLabel: true, hasValue: true, groupHeaders: 0 })
  // 그룹 헤더는 tbody 안에만 존재
  expect(container.querySelectorAll('tbody tr[data-group-header]')).toHaveLength(2)

  await user.click(screen.getByRole('button', { name: /온도/ })) // 정렬해도 양쪽 불변
  expect(footerState()).toEqual({ rowCount: 1, hasLabel: true, hasValue: true, groupHeaders: 0 })
  expect(container.querySelectorAll('tbody tr[data-group-header]')).toHaveLength(2)
})

test('renderGroupHeader에 groupKey와 렌더 순서의 groupRows가 전달된다', () => {
  const { container } = render(
    <Table
      getRowId={(r) => r.id}
      groupBy={(r) => r.status}
      renderGroupHeader={(key, groupRows) => `${key} (${groupRows.length})`}
      columns={[{ key: 'name', header: '장비명' }]}
      rows={[
        { id: 'a', name: '가압기', status: '정상' },
        { id: 'b', name: '냉각기', status: '정상' },
        { id: 'c', name: '펌프', status: '점검' }
      ]}
    />
  )
  const headers = container.querySelectorAll('tr[data-group-header] th')
  expect(headers[0].textContent).toBe('정상 (2)')
  expect(headers[1].textContent).toBe('점검 (1)')
})
