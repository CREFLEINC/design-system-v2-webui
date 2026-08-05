// check-tokens.mjs 는 순수 함수를 export 하지 않는 실행형 스크립트라, 형제
// check-foundation.test.mjs 와 같은 방식(spawnSync + mkdtempSync 픽스처)으로 검증한다.
// 실트리(리포 루트) 대상 단언은 넣지 않는다 — 픽스처만으로 결정적이어야 하고,
// 실트리 그린 여부는 `npm run lint:tokens` 게이트가 담당한다.
//
// CHECK_TOKENS_ROOT env 로 검사 루트를 픽스처 디렉토리로 오버라이드한다
// (check-tokens.mjs 헤더 주석 참고 — FOUNDATION_REPO 오버라이드와 동일한 패턴).
//
// 커버하는 계약:
//   (a) 정상 참조(module.css/.stories.tsx/비스토리 .tsx/.ts 전체) → exit 0
//   (b) .stories.tsx 의 미정의 참조 → exit 1
//   (c) 비스토리 .tsx 의 미정의 참조 → exit 1 (범위가 스토리에 국한되지 않음을 고정)
//   (d) .ts 의 미정의 참조 → exit 1
//   (e) .tsx 인라인 스타일의 raw px·raw 색상은 위반이 아니다 (px/색상 검사는 CSS 전용)
//   (f) .module.css 의 raw 색상·임의 px → exit 1 (기존 동작 회귀 방어)
//   (g) CSS 주석 안의 미정의 var(--…) 는 무시된다 (stripComments 회귀 방어)
import { describe, it, expect, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-tokens.mjs')

// files 의 키는 POSIX 상대경로(리포 루트 기준)이며 중첩 디렉토리를 지원한다.
function makeFixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'crefle-fixture-check-tokens-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, ...rel.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  return dir
}

function run(fixtureDir) {
  return spawnSync(process.execPath, [SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, CHECK_TOKENS_ROOT: fixtureDir }
  })
}

let fixtureDirs = []
afterEach(() => {
  for (const d of fixtureDirs) rmSync(d, { recursive: true, force: true })
  fixtureDirs = []
})

function fixture(files) {
  const dir = makeFixture(files)
  fixtureDirs.push(dir)
  return dir
}

describe('check-tokens: 토큰 존재성 검사', () => {
  it('(a) 정의된 토큰을 module.css/.stories.tsx/비스토리 .tsx/.ts 전체에서 참조하면 exit 0 이다', () => {
    const dir = fixture({
      'styles/tokens.css': ':root {\n  --fixture-color: #112233;\n  --fixture-radius: 4px;\n}\n',
      // 1px 보더 — 0/1/2px 허용을 이 케이스에 함께 고정한다.
      'src/components/Card.module.css': '.card {\n  border: 1px solid var(--fixture-color);\n  border-radius: var(--fixture-radius);\n}\n',
      'src/components/Card.stories.tsx': "export const style = { color: 'var(--fixture-color)' }\n",
      'src/components/Widget.tsx': "export const style = { borderRadius: 'var(--fixture-radius)' }\n",
      'src/utils/theme.ts': "export const colorRef = 'var(--fixture-color)'\n"
    })

    const result = run(dir)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('token lint OK')
  })

  it('(b) .stories.tsx 의 미정의 참조는 exit 1 이며 파일 경로·줄 번호를 담는다', () => {
    const dir = fixture({
      'styles/tokens.css': ':root {\n  --fixture-color: #112233;\n}\n',
      'src/components/Demo.stories.tsx': "export const style = { font: 'var(--fixture-missing)' }\n"
    })

    const result = run(dir)
    const output = result.stdout + result.stderr

    expect(result.status).toBe(1)
    expect(output).toContain('unknown token: --fixture-missing')
    expect(output).toContain('Demo.stories.tsx:1')
  })

  it('(c) 비스토리 .tsx 의 미정의 참조도 exit 1 이다 (범위가 스토리에 국한되지 않음)', () => {
    const dir = fixture({
      'styles/tokens.css': ':root {\n  --fixture-color: #112233;\n}\n',
      'src/components/Widget.tsx': "export const style = { font: 'var(--fixture-missing)' }\n"
    })

    const result = run(dir)
    const output = result.stdout + result.stderr

    expect(result.status).toBe(1)
    expect(output).toContain('unknown token: --fixture-missing')
    expect(output).toContain('Widget.tsx:1')
  })

  it('(d) .ts 의 미정의 참조도 exit 1 이다', () => {
    const dir = fixture({
      'styles/tokens.css': ':root {\n  --fixture-color: #112233;\n}\n',
      'src/utils/theme.ts': "export const ref = 'var(--fixture-missing)'\n"
    })

    const result = run(dir)
    const output = result.stdout + result.stderr

    expect(result.status).toBe(1)
    expect(output).toContain('unknown token: --fixture-missing')
    expect(output).toContain('theme.ts:1')
  })

  it('(e) .tsx 인라인 스타일의 raw px·raw 색상은 위반이 아니다 (px/색상 검사는 CSS 전용)', () => {
    const dir = fixture({
      'styles/tokens.css': ':root {\n  --fixture-color: #112233;\n}\n',
      // 데모 레이아웃 값(raw px)과 raw 색상 — 스토리에서 정당하게 쓰이는 값이다.
      'src/components/Layout.stories.tsx': "export const style = { padding: '13px', color: '#ff0000' }\n"
    })

    const result = run(dir)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('token lint OK')
  })

  it('(f) .module.css 의 raw 색상 및 임의 px 는 exit 1 이다 (기존 동작 회귀 방어)', () => {
    const dir = fixture({
      'styles/tokens.css': ':root {\n  --fixture-color: #112233;\n}\n',
      'src/components/Card.module.css': '.card {\n  color: #ff0000;\n  padding: 7px;\n}\n'
    })

    const result = run(dir)
    const output = result.stdout + result.stderr

    expect(result.status).toBe(1)
    expect(output).toContain('raw 색상 금지')
    expect(output).toContain('임의 px(7px)')
  })

  it('(g) CSS 주석 안의 미정의 var(--…) 는 무시된다 (stripComments 회귀 방어)', () => {
    const dir = fixture({
      'styles/tokens.css': ':root {\n  --fixture-color: #112233;\n}\n/* legacy: var(--fixture-commented-out) */\n'
    })

    const result = run(dir)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('token lint OK')
  })
})
