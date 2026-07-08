// src/**/*.module.css 에서 토큰 위반(raw 색상, 임의 px)을 찾고,
// styles/**/*.css + src/**/*.module.css 전체에서 정의되지 않은 var(--token) 참조를 찾는다.
// 허용: 0px/1px/2px(보더·링), @media 줄, var(--token) 참조
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
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

walk(STYLES, (p) => p.endsWith('.css'), collectTokens)
walk(SRC, (p) => p.endsWith('.module.css'), collectTokens)

for (const ref of references) {
  if (!definitions.has(ref.name)) errors.push(`unknown token: ${ref.name} (${ref.file}:${ref.line})`)
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log('token lint OK')
