// src/**/*.module.css 에서 같은 선언 블록에 width:100% + 가로 padding(≠0) 이 있으면서
// box-sizing:border-box 선언이 없는 규칙을 찾는다. #60 재발 방지 린트 —
// AlertBanner·Toast 가 이 패턴으로 컨테이너를 좌우 padding 만큼 넘쳤다
// (전역 box-sizing 리셋은 쓰지 않는다 — 소비 프로젝트 레이아웃 파급 우려로 컴포넌트 내부
// 선언 방식을 택한 것이 이슈 #60 의 수정 방침이다. 이 린트는 그 관례를 상시 강제한다).
//
// styles/(파운데이션 동봉본)는 검사 대상이 아니다 — upstream 동봉본이라 우리가 고칠 수
// 없는 파일인데, 검사 대상에 넣으면 upstream 이 이 패턴을 들여올 때 sync 가 게이트에
// 막힌다. 컴포넌트 규율(src/)만 강제한다.
//
// CHECK_BOX_SIZING_ROOT: 테스트 전용 오버라이드. 지정하면 그 경로를 리포 루트로 쓴다
// (형제 check-tokens.mjs 의 CHECK_TOKENS_ROOT 오버라이드와 동일한 패턴).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.CHECK_BOX_SIZING_ROOT
  ? resolve(process.env.CHECK_BOX_SIZING_ROOT)
  : join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')

// 리포 CSS는 중첩이 없으므로 "{ ... }" 평면 블록을 순회한다. @media 헤더처럼 본문에
// 중첩 블록을 담은 상위 선택자는 이 정규식으로 그 자체가 블록으로 매치되지 않고(본문에
// '{'가 섞여 있어 매치가 성립하지 않음), 안쪽의 실제 규칙 블록이 별도 매치로 잡힌다.
const BLOCK_RE = /([^{}]+)\{([^{}]*)\}/g
const WIDTH_100_RE = /^width\s*:\s*100%$/
const ZERO_RE = /^0(px|rem|em|%)?$/
const HORIZONTAL_LONGHAND = new Set([
  'padding-left',
  'padding-right',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end'
])
const errors = []

// CSS 주석을 제거하되 줄바꿈은 보존해 줄 번호를 유지한다. (check-tokens.mjs 의 stripComments 와 동일)
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))

function walk(dir, match, cb) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, match, cb)
    else if (match(p)) cb(p)
  }
}

const isZero = (value) => ZERO_RE.test(value.trim())

// shorthand padding 값에서 가로(좌우) 성분만 골라낸다.
// 1값 → [v1] / 2·3값 → [2번째] / 4값 → [2번째, 4번째]
function horizontalFromShorthand(value) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return [parts[0]]
  if (parts.length === 2 || parts.length === 3) return [parts[1]]
  if (parts.length === 4) return [parts[1], parts[3]]
  return []
}

function check(path) {
  const text = stripComments(readFileSync(path, 'utf8'))

  for (const m of text.matchAll(BLOCK_RE)) {
    const prefix = m[1]
    const body = m[2]
    const prefixLines = prefix.split('\n')
    const selector = prefixLines[prefixLines.length - 1].trim()

    if (!selector) continue
    if (selector.startsWith('@')) continue // at-rule 헤더(예: @font-face)
    if (selector === 'from' || selector === 'to' || selector.endsWith('%')) continue // keyframes 스텝

    let hasWidth100 = false
    let hasHorizontalPadding = false
    let hasBorderBox = false

    for (const raw of body.split(';')) {
      const decl = raw.trim()
      if (!decl) continue
      if (WIDTH_100_RE.test(decl)) hasWidth100 = true

      const colonIdx = decl.indexOf(':')
      if (colonIdx === -1) continue
      const prop = decl.slice(0, colonIdx).trim()
      const value = decl.slice(colonIdx + 1).trim()

      if (prop === 'padding') {
        if (horizontalFromShorthand(value).some((v) => !isZero(v))) hasHorizontalPadding = true
      } else if (HORIZONTAL_LONGHAND.has(prop)) {
        if (!isZero(value)) hasHorizontalPadding = true
      } else if (prop === 'box-sizing' && value === 'border-box') {
        hasBorderBox = true
      }
    }

    if (hasWidth100 && hasHorizontalPadding && !hasBorderBox) {
      const lastNewlineInPrefix = prefix.lastIndexOf('\n')
      const selectorStart = m.index + (lastNewlineInPrefix === -1 ? 0 : lastNewlineInPrefix + 1)
      const line = text.slice(0, selectorStart).split('\n').length
      errors.push(`${path}:${line} ${selector} — width:100% + 가로 padding 인데 box-sizing:border-box 없음`)
    }
  }
}

walk(SRC, (p) => p.endsWith('.module.css'), check)

if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log('box-sizing lint OK')
