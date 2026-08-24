// node: 빌트인은 이 프로젝트에 @types/node가 없어 타입 선언이 없다(vitest 런타임에서는 정상 동작)
// @ts-expect-error - no @types/node in this project
import { readFileSync } from 'node:fs'
// @ts-expect-error - no @types/node in this project
import { fileURLToPath } from 'node:url'
// @ts-expect-error - no @types/node in this project
import path from 'node:path'
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card, CardHeader, CardBody, CardFooter } from './Card'
import styles from './Card.module.css'

test('비-interactive Card는 button이 아니라 컨테이너로 렌더한다', () => {
  render(<Card>본문</Card>)
  expect(screen.getByText('본문')).toBeInTheDocument()
  expect(screen.queryByRole('button')).toBeNull()
})

test('surface/elevation/bordered 클래스가 적용된다', () => {
  render(<Card surface="high" elevation={3} bordered data-testid="c">카드</Card>)
  const el = screen.getByTestId('c')
  expect(el.className).toContain(styles.high)
  expect(el.className).toContain(styles.elev3)
  expect(el.className).toContain(styles.bordered)
})

test('interactive면 role=button으로 렌더되고 클릭을 전달한다', async () => {
  const onClick = vi.fn()
  render(<Card interactive onClick={onClick}>클릭</Card>)
  const el = screen.getByRole('button', { name: '클릭' })
  expect(el.tagName).toBe('DIV')
  await userEvent.click(el)
  expect(onClick).toHaveBeenCalledOnce()
})

test('interactive 카드는 탭 포커스 + 키보드(Enter/Space)로 활성화된다', async () => {
  const onClick = vi.fn()
  render(<Card interactive onClick={onClick}>확인</Card>)
  await userEvent.tab()
  expect(screen.getByRole('button', { name: '확인' })).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  await userEvent.keyboard(' ')
  expect(onClick).toHaveBeenCalledTimes(2)
})

test('interactive + disabled면 클릭이 차단된다', async () => {
  const onClick = vi.fn()
  render(<Card interactive disabled onClick={onClick}>비활성</Card>)
  const el = screen.getByRole('button')
  // role="button" div이므로 네이티브 disabled 대신 aria-disabled로 상태를 표현한다
  expect(el).toHaveAttribute('aria-disabled', 'true')
  expect(el).toHaveAttribute('tabindex', '-1')
  await userEvent.click(el)
  expect(onClick).not.toHaveBeenCalled()
})

test('ref를 루트에 전달하고 rest를 spread한다', () => {
  const ref = { current: null as HTMLElement | null }
  render(<Card ref={ref} aria-label="요약 카드">x</Card>)
  expect(ref.current).not.toBeNull()
  expect(ref.current).toHaveAttribute('aria-label', '요약 카드')
})

test('Header/Body/Footer 서브컴포넌트가 각 클래스와 children을 렌더한다', () => {
  render(
    <Card>
      <CardHeader>제목</CardHeader>
      <CardBody>본문</CardBody>
      <CardFooter>
        <button>확인</button>
      </CardFooter>
    </Card>
  )
  expect(screen.getByText('제목').className).toContain(styles.header)
  expect(screen.getByText('본문').className).toContain(styles.body)
  // 비-interactive Card(div) 안에 실제 button을 중첩하는 정상 케이스
  const footerBtn = screen.getByRole('button', { name: '확인' })
  expect(footerBtn.parentElement?.className).toContain(styles.footer)
})

test('#77 회귀: --_elev에 배정되는 모든 값이 box-shadow 목록 항으로 유효하다 (none 금지)', () => {
  // jsdom은 CSS 캐스케이드/var() 해석을 지원하지 않아 computed box-shadow를 직접
  // 단언할 수 없다(브라우저 실측은 회귀 스토리 FocusRingBordered가 담당). 대신 소스
  // 원문을 읽어 --_elev에 배정되는 모든 값이 최종적으로 `none`으로 해석되지 않음을 정적으로 검사한다.
  // 주의: `new URL('./x.css', import.meta.url)` 리터럴 패턴은 Vite의 import-analysis가
  // 정적으로 가로채 dev-server 자산 URL(http://localhost:...)로 치환해 버려 이 환경에서는
  // readFileSync에 쓸 수 없다(ERR_INVALID_URL_SCHEME 실측). fileURLToPath로 우회한다.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const cardCss = readFileSync(path.join(here, 'Card.module.css'), 'utf-8')
  const webTokensCss = readFileSync(path.join(here, '../../../styles/web-tokens.css'), 'utf-8')
  const themesCss = readFileSync(path.join(here, '../../../styles/themes.css'), 'utf-8')

  const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

  const assignments = [...stripComments(cardCss).matchAll(/--_elev:\s*([^;}]+)/g)].map((m) => m[1].trim())
  // 정규식이 헛돌면 테스트가 공허해지므로 추출 자체도 단언한다 (기본값 + elev1~5 + hover = 최소 7개)
  expect(assignments.length).toBeGreaterThanOrEqual(7)

  const findTokenDefinitions = (token: string): string[] => {
    const pattern = new RegExp(`${token}:\\s*([^;}]+);`, 'g')
    const values: string[] = []
    for (const css of [webTokensCss, themesCss]) {
      for (const m of stripComments(css).matchAll(pattern)) {
        values.push(m[1].trim())
      }
    }
    return values
  }

  for (const assignment of assignments) {
    const varMatch = assignment.match(/^var\((--elevation-\d+)\)$/)
    if (varMatch) {
      const token = varMatch[1]
      const defs = findTokenDefinitions(token)
      // 라이트+다크 정의를 모두 검사 대상으로 삼는다 — 정의가 하나도 없으면 실패
      expect(defs.length).toBeGreaterThan(0)
      for (const def of defs) {
        expect(def).not.toBe('none')
      }
    } else {
      expect(assignment).not.toBe('none')
    }
  }
})
