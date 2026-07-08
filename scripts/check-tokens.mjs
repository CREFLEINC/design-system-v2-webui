// src/**/*.module.css 에서 토큰 위반(raw 색상, 임의 px)을 찾는다.
// 허용: 0px/1px/2px(보더·링), @media 줄, var(--token) 참조
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/
const PX_RE = /\b(\d+(?:\.\d+)?)px\b/g
const PX_ALLOW = new Set(['0', '1', '2'])
const errors = []

function walk(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (p.endsWith('.module.css')) check(p)
  }
}

function check(path) {
  readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
    if (line.trimStart().startsWith('@media')) return
    if (COLOR_RE.test(line)) errors.push(`${path}:${i + 1} raw 색상 금지 → 토큰 사용: ${line.trim()}`)
    for (const m of line.matchAll(PX_RE))
      if (!PX_ALLOW.has(m[1])) errors.push(`${path}:${i + 1} 임의 px(${m[0]}) 금지 → spacing/radius 토큰: ${line.trim()}`)
  })
}

walk(SRC)
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log('token lint OK')
