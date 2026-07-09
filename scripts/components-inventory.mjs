// src/index.ts 와 그 모듈들을 읽어 컴포넌트 인벤토리를 만든다.
//
// 정규식을 쓰지 않는 이유: ChipProps 는 두 인터페이스의 유니온이고, 그 베이스인
// ChipCommon 은 export 되지 않은 로컬 인터페이스다. 구문 트리로 읽어야 거짓말을 하지 않는다.
//
// 타입 체커(Program)는 쓰지 않는다. 대신 상속 절을 만나면 그 파일의 import 를 따라가
// 베이스 인터페이스를 직접 찾는다 — LineChartProps → CartesianSharedProps → ChartBaseProps
// 는 세 단계에 걸쳐 두 파일을 넘어가고, 마지막 파일은 index.ts 가 내보내지도 않는다.
// React 의 HTMLAttributes 처럼 밖에서 온 베이스는 펼치지 않고 '네이티브 속성'으로 표시한다.
import ts from 'typescript'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DOC_PATH = join(ROOT, 'docs', 'COMPONENTS.md')
export const DEFAULT_SECTION = 'Core'

// React 가 주는 DOM 속성 베이스. 펼치지 않고 한 줄로 요약한다.
const NATIVE_RE = /(?:HTML|SVG)\w*Attributes|DOMAttributes|AriaAttributes|HTMLProps|ComponentProps/

const parse = (name, text) =>
  ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

const isComponent = (name) => /^[A-Z]/.test(name)
const isHook = (name) => /^use[A-Z]/.test(name)

// ---- src/index.ts ----

// 반환: { version, modules: Map<모듈경로, { path, section, values, types }> }
// section 은 직전 주석 줄(`// Phase 3 — Tier 2 components`)에서 온다.
export function parseIndex(text) {
  const sf = parse('index.ts', text)
  const modules = new Map()
  let version = null
  let section = DEFAULT_SECTION

  for (const st of sf.statements) {
    for (const c of ts.getLeadingCommentRanges(text, st.getFullStart()) || []) {
      const line = text.slice(c.pos, c.end).replace(/^\/\/\s?/, '').trim()
      if (line) section = line
    }

    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations)
        if (d.name.getText(sf) === 'VERSION' && d.initializer) version = d.initializer.getText(sf).replace(/['"]/g, '')
      continue
    }

    if (!ts.isExportDeclaration(st) || !st.moduleSpecifier || !st.exportClause) continue
    if (!ts.isNamedExports(st.exportClause)) continue

    const path = st.moduleSpecifier.text
    const mod = modules.get(path) || { path, section, values: [], types: [] }
    const names = st.exportClause.elements.map((e) => e.name.text)
    if (st.isTypeOnly) mod.types.push(...names)
    else mod.values.push(...names)
    modules.set(path, mod)
  }

  return { version, modules }
}

// ---- 개별 모듈 ----

// 유니온 타입 별칭을 세 갈래로 구분한다.
//   'filled' | 'tonal'        → literals (variant 후보)
//   StatusChipProps | Filter… → refs     (props 유니온)
//   그 외                      → other
function describeAlias(node, sf) {
  if (ts.isUnionTypeNode(node)) {
    const parts = node.types
    if (parts.every((t) => ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)))
      return { kind: 'literals', values: parts.map((t) => t.literal.text) }
    if (parts.every((t) => ts.isTypeReferenceNode(t)))
      return { kind: 'refs', refs: parts.map((t) => t.typeName.getText(sf)) }
  }
  return { kind: 'other', text: node.getText(sf) }
}

// 반환: { interfaces, aliases, imports: Map<이름, 모듈지정자> }
export function parseModule(text, fileName = 'module.tsx') {
  const sf = parse(fileName, text)
  const interfaces = new Map()
  const aliases = new Map()
  const imports = new Map()

  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      const bindings = st.importClause?.namedBindings
      if (bindings && ts.isNamedImports(bindings))
        for (const el of bindings.elements) imports.set(el.name.text, st.moduleSpecifier.text)
    } else if (ts.isInterfaceDeclaration(st)) {
      interfaces.set(st.name.text, {
        members: st.members.map((m) => m.name?.getText(sf)).filter(Boolean),
        // name 은 로컬 조회용 식별자, text 는 네이티브 판정용 전체 표기
        // (`Omit<HTMLAttributes<HTMLSpanElement>, 'children'>` 의 name 은 'Omit' 이다)
        heritage: (st.heritageClauses || []).flatMap((h) =>
          h.types.map((t) => ({ name: t.expression.getText(sf), text: t.getText(sf) }))
        )
      })
    } else if (ts.isTypeAliasDeclaration(st)) {
      aliases.set(st.name.text, describeAlias(st.type, sf))
    }
  }

  return { interfaces, aliases, imports }
}

// ---- 상속 해석 ----

// ctx = { load(abs) → parseModule 결과 | null, resolveImport(fromAbs, spec) → abs | null }
// 반환: { members, native, unresolved } — 못 찾은 베이스는 unresolved 에 남겨 렌더에서 드러낸다.
export function resolveInterface(ctx, abs, name, seen = new Set()) {
  const key = `${abs}#${name}`
  if (seen.has(key)) return { members: [], native: false, unresolved: [] }
  seen.add(key)

  const mod = ctx.load(abs)
  if (!mod) return null

  const iface = mod.interfaces.get(name)
  if (!iface) {
    // 이 파일에 없다면 import 를 따라간다 (ChartBaseProps → ./Chart.shared)
    const spec = mod.imports.get(name)
    const next = spec && ctx.resolveImport(abs, spec)
    return next ? resolveInterface(ctx, next, name, seen) : null
  }

  const members = []
  const unresolved = []
  let native = false

  for (const base of iface.heritage) {
    if (NATIVE_RE.test(base.text)) {
      native = true
      continue
    }
    const resolved = resolveInterface(ctx, abs, base.name, seen)
    if (resolved) {
      members.push(...resolved.members)
      unresolved.push(...resolved.unresolved)
      native ||= resolved.native
    } else {
      unresolved.push(base.text)
    }
  }
  members.push(...iface.members)

  return { members: [...new Set(members)], native, unresolved: [...new Set(unresolved)] }
}

// 컴포넌트 하나의 props 를 설명한다. 없으면 null.
export function describeProps(ctx, abs, propsName) {
  const iface = resolveInterface(ctx, abs, propsName)
  if (iface) return { kind: 'interface', name: propsName, ...iface }

  const alias = ctx.load(abs)?.aliases.get(propsName)
  if (!alias) return null

  if (alias.kind === 'refs') {
    const parts = alias.refs.map((ref) => ({
      name: ref,
      ...(resolveInterface(ctx, abs, ref) || { members: [], native: false, unresolved: [] })
    }))
    return { kind: 'union', name: propsName, parts }
  }

  return {
    kind: 'alias',
    name: propsName,
    text: alias.kind === 'literals' ? alias.values.map((v) => `'${v}'`).join(' | ') : alias.text
  }
}

// ---- 조립 ----

const CANDIDATES = ['.tsx', '.ts', '/index.tsx', '/index.ts']

export function createFsContext(root) {
  const cache = new Map()
  return {
    load(abs) {
      if (!cache.has(abs)) cache.set(abs, existsSync(abs) ? parseModule(readFileSync(abs, 'utf8'), basename(abs)) : null)
      return cache.get(abs)
    },
    resolveImport(fromAbs, spec) {
      if (!spec.startsWith('.')) return null // 'react' 등 외부 패키지
      const base = join(dirname(fromAbs), spec)
      return CANDIDATES.map((ext) => base + ext).find(existsSync) || null
    },
    resolveModule(modulePath) {
      const base = join(root, 'src', modulePath)
      const abs = CANDIDATES.map((ext) => base + ext).find(existsSync)
      if (!abs) throw new Error(`모듈 소스를 찾을 수 없습니다: ${modulePath}`)
      return abs
    }
  }
}

export function buildInventory(root = ROOT) {
  const ctx = createFsContext(root)
  const { version, modules } = parseIndex(readFileSync(join(root, 'src', 'index.ts'), 'utf8'))
  const entries = []

  for (const { path, section, values, types } of modules.values()) {
    const abs = ctx.resolveModule(path)
    const name = basename(abs).replace(/\.tsx?$/, '')

    const exports = values.map((value) => ({
      name: value,
      kind: isHook(value) ? 'hook' : isComponent(value) ? 'component' : 'util',
      props: describeProps(ctx, abs, `${value}Props`)
    }))

    // props 로 이미 쓰인 타입은 빼고, 문자열 리터럴 유니온만 variant 로 본다.
    const mod = ctx.load(abs)
    const usedAsProps = new Set(
      exports.flatMap((e) => (e.props ? [e.props.name, ...(e.props.parts || []).map((p) => p.name)] : []))
    )
    const variants = types
      .filter((t) => !usedAsProps.has(t) && mod.aliases.get(t)?.kind === 'literals')
      .map((t) => ({ name: t, values: mod.aliases.get(t).values }))
    const variantNames = new Set(variants.map((v) => v.name))

    entries.push({
      name,
      section,
      source: relative(root, abs),
      hasStory: existsSync(join(dirname(abs), `${name}.stories.tsx`)),
      exports,
      variants,
      otherTypes: types.filter((t) => !usedAsProps.has(t) && !variantNames.has(t))
    })
  }

  const all = entries.flatMap((e) => e.exports)
  return {
    version,
    entries,
    counts: {
      modules: entries.filter((e) => e.exports.some((x) => x.kind === 'component')).length,
      components: all.filter((e) => e.kind === 'component').length,
      hooks: all.filter((e) => e.kind === 'hook').length,
      utils: all.filter((e) => e.kind === 'util').length
    }
  }
}

// ---- 렌더 ----

const code = (s) => '`' + s + '`'

function suffix({ native, unresolved }) {
  const notes = []
  if (native) notes.push('+ 네이티브 HTML 속성')
  if (unresolved?.length) notes.push(`+ ${unresolved.map(code).join(', ')} 상속`)
  return notes.length ? ` _(${notes.join(', ')})_` : ''
}

function renderProps(props) {
  if (!props) return []
  if (props.kind === 'alias') return [`- props ${code(props.name)}: ${code(props.text)}`]

  if (props.kind === 'union') {
    const lines = [`- props ${code(props.name)} = ${props.parts.map((p) => code(p.name)).join(' | ')}`]
    for (const part of props.parts) lines.push(`  - ${code(part.name)}: ${part.members.join(', ') || '없음'}${suffix(part)}`)
    return lines
  }

  return [`- props ${code(props.name)}: ${props.members.join(', ') || '없음'}${suffix(props)}`]
}

export function renderMarkdown(inv) {
  const { version, entries, counts } = inv
  const out = [
    '# 컴포넌트 인벤토리',
    '',
    '<!-- 이 파일은 scripts/gen-components.mjs 가 생성합니다. 직접 수정하지 마세요. -->',
    '<!-- 갱신: npm run docs:components -->',
    '',
    `\`@crefle/web-ui\` v${version} — 모듈 ${counts.modules}개에서 컴포넌트 ${counts.components}개 · 훅 ${counts.hooks} · 유틸 ${counts.utils}`,
    '',
    '와이어프레임을 이 목록과 대조하는 방법, 없는 것을 어디에 어떻게 요청하는지는',
    '[컴포넌트 요청 가이드](./component-requests.md)를 보세요.',
    '',
    '- 모듈 하나가 여러 컴포넌트를 내보내기도 합니다 (`Card` → `Card`, `CardHeader`, `CardBody`, `CardFooter`).',
    '- 네이티브 HTML 속성(`onClick`, `aria-*`, `className` 등)은 생략했습니다. 아래 props 는 각 컴포넌트가 **직접 정의한** 것입니다.',
    ''
  ]

  let section = null
  for (const entry of entries) {
    if (entry.section !== section) {
      section = entry.section
      out.push(`## ${section}`, '')
    }

    out.push(`### ${entry.name}`, '')
    out.push(`${code(entry.source)}${entry.hasStory ? ' · 스토리 ✓' : ''}`, '')

    for (const e of entry.exports) {
      const label = e.kind === 'hook' ? ' _(훅)_' : e.kind === 'util' ? ' _(유틸)_' : ''
      out.push(`**${e.name}**${label}`)
      out.push(...renderProps(e.props))
      out.push('')
    }

    for (const v of entry.variants) out.push(`- ${code(v.name)}: ${v.values.map((x) => code(x)).join(' ')}`)
    if (entry.otherTypes.length) out.push(`- 기타 타입: ${entry.otherTypes.map(code).join(', ')}`)
    if (entry.variants.length || entry.otherTypes.length) out.push('')
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}
