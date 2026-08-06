// check-box-sizing.mjs 는 순수 함수를 export 하지 않는 실행형 스크립트라, 형제
// check-tokens.test.mjs 와 같은 방식(spawnSync + mkdtempSync 픽스처)으로 검증한다.
// 실트리(리포 루트) 대상 단언은 넣지 않는다 — 픽스처만으로 결정적이어야 하고,
// 실트리 그린 여부는 `npm run lint:box-sizing` 게이트가 담당한다.
//
// CHECK_BOX_SIZING_ROOT env 로 검사 루트를 픽스처 디렉토리로 오버라이드한다
// (check-box-sizing.mjs 헤더 주석 참고 — CHECK_TOKENS_ROOT 오버라이드와 동일한 패턴).
//
// 커버하는 계약:
//   (a) width:100% + 가로 padding + box-sizing:border-box 같은 블록 → exit 0
//   (b) width:100% + 가로 padding, box-sizing 없음 → exit 1, 출력에 파일 경로·선택자 포함
//   (c) width:100% + 세로 전용 padding(`padding: var(--x) 0`) → exit 0 (오탐 방지)
//   (d) width:100%만 / padding만 → exit 0
//   (e) width:100%와 padding이 서로 다른 블록 → exit 0 (같은 블록만 검사)
//   (f) 주석 안의 위반 조합 → exit 0 (stripComments 회귀 방어)
//   (g) @media 블록 안의 위반 → exit 1
//   (h) 4값 쇼트핸드 `padding: 0 var(--s) 0 0` → exit 1 / 롱핸드 `padding-left: var(--s)` → exit 1
//   (i) `box-sizing: content-box` 명시 + width:100% + 가로 padding → exit 1
import { describe, it, expect, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-box-sizing.mjs')

// files 의 키는 POSIX 상대경로(리포 루트 기준)이며 중첩 디렉토리를 지원한다.
function makeFixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'crefle-fixture-check-box-sizing-'))
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
    env: { ...process.env, CHECK_BOX_SIZING_ROOT: fixtureDir }
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

describe('check-box-sizing: width:100% + 가로 padding + box-sizing 누락 검사', () => {
  it('(a) width:100% + 가로 padding + box-sizing:border-box 같은 블록이면 exit 0 이다', () => {
    const dir = fixture({
      'src/components/Foo/Foo.module.css':
        '.root {\n  box-sizing: border-box;\n  width: 100%;\n  padding: var(--space-3) var(--space-4);\n}\n'
    })

    const result = run(dir)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('box-sizing lint OK')
  })

  it('(b) width:100% + 가로 padding인데 box-sizing이 없으면 exit 1이며 파일 경로·선택자를 담는다', () => {
    const dir = fixture({
      'src/components/Foo/Foo.module.css':
        '.root {\n  width: 100%;\n  padding: var(--space-3) var(--space-4);\n}\n'
    })

    const result = run(dir)
    const output = result.stdout + result.stderr

    expect(result.status).toBe(1)
    expect(output).toContain('Foo.module.css:1')
    expect(output).toContain('.root')
    expect(output).toContain('box-sizing:border-box 없음')
  })

  it('(c) width:100% + 세로 전용 padding(padding: var(--x) 0)은 exit 0 이다 (오탐 방지)', () => {
    const dir = fixture({
      'src/components/Foo/Foo.module.css':
        '.root {\n  width: 100%;\n  padding: var(--space-3) 0;\n}\n'
    })

    const result = run(dir)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('box-sizing lint OK')
  })

  it('(d) width:100%만 있거나 padding만 있으면 exit 0 이다', () => {
    const dir = fixture({
      'src/components/Foo/Foo.module.css': '.root {\n  width: 100%;\n}\n',
      'src/components/Bar/Bar.module.css': '.root {\n  padding: var(--space-3) var(--space-4);\n}\n'
    })

    const result = run(dir)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('box-sizing lint OK')
  })

  it('(e) width:100%와 padding이 서로 다른 블록이면 exit 0 이다 (같은 블록만 검사)', () => {
    const dir = fixture({
      'src/components/Foo/Foo.module.css':
        '.wrap {\n  width: 100%;\n}\n\n.inner {\n  padding: var(--space-3) var(--space-4);\n}\n'
    })

    const result = run(dir)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('box-sizing lint OK')
  })

  it('(f) 주석 안의 위반 조합은 exit 0 이다 (stripComments 회귀 방어)', () => {
    const dir = fixture({
      'src/components/Foo/Foo.module.css':
        '/* .root { width: 100%; padding: var(--space-3) var(--space-4); } */\n.root {\n  color: red;\n}\n'
    })

    const result = run(dir)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('box-sizing lint OK')
  })

  it('(g) @media 블록 안의 위반은 exit 1 이다', () => {
    const dir = fixture({
      'src/components/Foo/Foo.module.css':
        '@media (max-width: 600px) {\n  .root {\n    width: 100%;\n    padding: var(--space-3) var(--space-4);\n  }\n}\n'
    })

    const result = run(dir)
    const output = result.stdout + result.stderr

    expect(result.status).toBe(1)
    expect(output).toContain('.root')
  })

  it('(h) 4값 쇼트핸드 padding: 0 var(--s) 0 0 은 exit 1 이다', () => {
    const dir = fixture({
      'src/components/Foo/Foo.module.css':
        '.root {\n  width: 100%;\n  padding: 0 var(--s) 0 0;\n}\n'
    })

    const result = run(dir)

    expect(result.status).toBe(1)
  })

  it('(h) 롱핸드 padding-left: var(--s) 는 exit 1 이다', () => {
    const dir = fixture({
      'src/components/Foo/Foo.module.css':
        '.root {\n  width: 100%;\n  padding-left: var(--s);\n}\n'
    })

    const result = run(dir)

    expect(result.status).toBe(1)
  })

  it('(i) box-sizing: content-box 명시는 통과시키지 않는다 (우회 구멍 방지) → exit 1', () => {
    const dir = fixture({
      'src/components/Foo/Foo.module.css':
        '.root {\n  box-sizing: content-box;\n  width: 100%;\n  padding: var(--space-3) var(--space-4);\n}\n'
    })

    const result = run(dir)

    expect(result.status).toBe(1)
  })
})
