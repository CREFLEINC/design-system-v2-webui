// src/**/*.module.css 에서 토큰 위반(raw 색상, 임의 px)을 찾고,
// styles/**/*.css + src/**/*.module.css 전체에서 정의되지 않은 var(--token) 참조를 찾는다.
// 허용: 0px/1px/2px(보더·링), @media 줄, var(--token) 참조
//
// 토큰 존재성(미정의 참조) 검사는 src/**/*.ts + src/**/*.tsx 전체(스토리 포함)로도
// 확대 적용된다 — ts/tsx는 참조(REF_RE)만 수집하고 정의(DEFINE_RE)는 수집하지 않는다
// (문자열 키·프로즈가 정의로 오수집되는 것을 막기 위해). ts/tsx는 주석을 스트립하지
// 않고 원문 그대로 검사한다 — JS 주석 제거는 문자열·URL(`//`) 오파싱 위험이 있고,
// 주석·예시 코드 속 토큰 표기도 실제 토큰을 요구하는 편이 오참조 전파를 막는다는
// 이 검사의 목적에 부합한다. raw 색상·임의 px 검사는 여전히 .module.css 전용이다
// (스토리의 데모 레이아웃 값은 정당하므로 ts/tsx로 확대하지 않는다).
// 한계: tsx 스타일 객체의 문자열 키로 선언되는 로컬 커스텀 프로퍼티(예: '--series-color')는
// 정의 집합에 들어가지 않는다 — 같은 이름이 CSS에도 정의돼 있어야 참조가 통과한다.
//
// CHECK_TOKENS_ROOT: 테스트 전용 오버라이드. 지정하면 그 경로를 리포 루트로 쓴다
// (형제 check-foundation.mjs 의 FOUNDATION_REPO 오버라이드와 동일한 패턴).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.CHECK_TOKENS_ROOT
  ? resolve(process.env.CHECK_TOKENS_ROOT)
  : join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const STYLES = join(ROOT, 'styles')
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/
const PX_RE = /\b(\d+(?:\.\d+)?)px\b/g
const PX_ALLOW = new Set(['0', '1', '2'])
const DEFINE_RE = /(--[a-zA-Z0-9-]+)\s*:/g
const REF_RE = /var\(\s*(--[a-zA-Z0-9-]+)/g
const errors = []

// CSS 주석을 제거하되 줄바꿈은 보존해 줄 번호를 유지한다. (주석 안의 설명용 px/hex는 위반이 아니다)
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))

function walk(dir, match, cb) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, match, cb)
    else if (match(p)) cb(p)
  }
}

function check(path) {
  stripComments(readFileSync(path, 'utf8')).split('\n').forEach((line, i) => {
    if (line.trimStart().startsWith('@media')) return
    if (COLOR_RE.test(line)) errors.push(`${path}:${i + 1} raw 색상 금지 → 토큰 사용: ${line.trim()}`)
    for (const m of line.matchAll(PX_RE))
      if (!PX_ALLOW.has(m[1])) errors.push(`${path}:${i + 1} 임의 px(${m[0]}) 금지 → spacing/radius 토큰: ${line.trim()}`)
  })
}

walk(SRC, (p) => p.endsWith('.module.css'), check)

// -------- 토큰 존재성 검사 --------
// CSS 주석을 제거한 뒤 정의(DEFINE_RE)와 참조(REF_RE)를 수집한다.
const definitions = new Set()
const references = [] // { name, file, line }

function collectTokens(path) {
  const raw = readFileSync(path, 'utf8')
  const text = stripComments(raw)
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    for (const m of line.matchAll(DEFINE_RE)) definitions.add(m[1])
    for (const m of line.matchAll(REF_RE)) references.push({ name: m[1], file: path, line: i + 1 })
  })
}

// ts/tsx는 참조(REF_RE)만 수집한다 — 문자열 키·프로즈가 DEFINE_RE 로 정의에 오수집되지
// 않도록 별도 함수를 쓴다. 주석은 스트립하지 않는다(헤더 주석 참고 — 원문 그대로 검사).
function collectRefs(path) {
  readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(REF_RE)) references.push({ name: m[1], file: path, line: i + 1 })
  })
}

walk(STYLES, (p) => p.endsWith('.css'), collectTokens)
walk(SRC, (p) => p.endsWith('.module.css'), collectTokens)
walk(SRC, (p) => p.endsWith('.ts') || p.endsWith('.tsx'), collectRefs)

for (const ref of references) {
  if (!definitions.has(ref.name)) errors.push(`unknown token: ${ref.name} (${ref.file}:${ref.line})`)
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log('token lint OK')
