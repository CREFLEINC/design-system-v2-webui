# 폴리레포 정합성 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 파운데이션 미러의 무단 수정을 기계적으로 차단하고, 동기화를 원격 git 기반으로 바꾸며, 웹 DS 문서를 webui repo로 이관하고, 공개 범위·라이선스·병합 차단을 정합화한다.

**Architecture:** `styles/foundation/PIN`(7자 해시)을 `foundation.lock.json`(repo·ref·전체 SHA·파일별 sha256)으로 승격한다. 순수 함수 `verifyMirror(dir)`가 lock과 디스크를 대조하고, 두 개의 얇은 CLI(`sync-foundation.mjs` 갱신, `check-foundation.mjs` 검증)가 그것을 감싼다. tamper 검사는 네트워크를 타지 않으므로 오프라인·CI 어디서든 같은 판정을 내린다. staleness는 `--upstream`에서만 확인하고 절대 실패하지 않는다.

**Tech Stack:** Node ≥20.19 (ESM `.mjs`), `node:crypto` / `node:child_process` / `node:fs`, vitest 4, GitHub Actions, `gh` CLI.

**스펙:** `docs/superpowers/specs/2026-07-09-polyrepo-integrity-design.md`

**시작점:** repo `/Users/rangkim/Documents/Claude/Projects/CREFLE Web Design System`, 브랜치 `main`, HEAD `cde845a`. 파운데이션 repo는 `/Users/rangkim/Documents/Claude/Projects/CREFLE Design System`, HEAD `7ea18c4`.

## Global Constraints

- **Node ≥ 20.19.** 스크립트는 전부 ESM `.mjs`, 런타임 의존성 0 (`node:` 내장 모듈만).
- **주석·출력 메시지는 한국어.** 기존 `scripts/check-tokens.mjs` 관례를 따른다.
- **`styles/foundation/` 안의 `tokens.css`와 `fonts/*.woff2` 내용은 절대 수정하지 않는다.** 파운데이션 원본과 바이트 동일해야 한다. 배너 주입 금지.
- **Task 1~7은 `main` 직행으로 커밋한다.** Task 8(branch protection)을 켜는 순간 직행이 불가능해지므로 반드시 마지막이다.
- 커밋 메시지 트레일러(모든 커밋 공통):
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_011iV62ofjqrgbiTTPqpgycU
  ```
- 게이트: `npm run check` (Task 3 이후 `check:foundation`이 맨 앞에 온다).
- **되돌리기 어려운 단계**: Task 7(공개 범위 전환)은 공개 행위다. Task 6(라이선스)이 끝나지 않았으면 실행하지 않는다.

**스펙의 7단계 → 이 계획의 8태스크 매핑:** 스펙 1단계(lock 스키마 + sync 재작성)를 TDD를 위해 Task 1(순수 로직 + 단위 테스트)과 Task 2(sync CLI)로 쪼갰다. 나머지는 1:1이다. 스펙이 테스트 파일명을 `scripts/check-foundation.test.mjs`로 예시했으나, 실제 테스트 대상이 `foundation-lock.mjs`이므로 `scripts/foundation-lock.test.mjs`로 둔다.

---

### Task 1: 무결성 순수 로직 + 단위 테스트

**Files:**
- Create: `scripts/foundation-lock.mjs`
- Create: `scripts/foundation-lock.test.mjs`
- Modify: `vite.config.ts` (test.include 확장)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `MIRROR_DIR: string` — `<repo>/styles/foundation` 절대 경로
  - `LOCK_NAME: string` — `'foundation.lock.json'`
  - `DEFAULT_REPO: string`, `DEFAULT_REF: string`
  - `sha256(buf: Buffer|string): string` — `'sha256:<hex>'` 형식
  - `hashFile(abs: string): string`
  - `listMirrorFiles(dir: string): string[]` — POSIX 상대 경로, 정렬됨
  - `isAllowed(rel: string): boolean`
  - `verifyMirror(dir: string): { lock: object | null, problems: string[] }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`scripts/foundation-lock.test.mjs`:

```js
// verifyMirror 의 통과 경로 1개와 실패 경로 4개를 임시 디렉토리 픽스처로 검증한다.
import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifyMirror, sha256, LOCK_NAME } from './foundation-lock.mjs'

const TOKENS = ':root { --primary: #C9252C; }\n'
const FONT = Buffer.from('woff2-stub-bytes')

let dir

function setup() {
  dir = mkdtempSync(join(tmpdir(), 'crefle-mirror-'))
  mkdirSync(join(dir, 'fonts'))
  writeFileSync(join(dir, 'tokens.css'), TOKENS)
  writeFileSync(join(dir, 'fonts', 'A.woff2'), FONT)
  writeFileSync(
    join(dir, LOCK_NAME),
    JSON.stringify(
      {
        repo: 'https://example.invalid/repo.git',
        ref: 'main',
        commit: 'a'.repeat(40),
        syncedAt: '2026-07-09T00:00:00Z',
        files: {
          'tokens.css': sha256(TOKENS),
          'fonts/A.woff2': sha256(FONT)
        }
      },
      null,
      2
    )
  )
  return dir
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

describe('verifyMirror', () => {
  it('정상 미러는 문제가 없다', () => {
    setup()
    const { lock, problems } = verifyMirror(dir)
    expect(problems).toEqual([])
    expect(lock.commit).toHaveLength(40)
  })

  it('lock 파일이 없으면 실패한다', () => {
    setup()
    unlinkSync(join(dir, LOCK_NAME))
    const { lock, problems } = verifyMirror(dir)
    expect(lock).toBeNull()
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(LOCK_NAME)
  })

  it('lock 파일이 깨졌으면 실패한다', () => {
    setup()
    writeFileSync(join(dir, LOCK_NAME), '{ not json')
    const { problems } = verifyMirror(dir)
    expect(problems[0]).toContain('파싱')
  })

  it('미러 파일을 수정하면 변조로 잡는다', () => {
    setup()
    appendFileSync(join(dir, 'tokens.css'), '/* 몰래 고침 */\n')
    const { problems } = verifyMirror(dir)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('변조: tokens.css')
  })

  it('lock 에 적힌 파일이 없으면 누락으로 잡는다', () => {
    setup()
    unlinkSync(join(dir, 'fonts', 'A.woff2'))
    const { problems } = verifyMirror(dir)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('누락: fonts/A.woff2')
  })

  it('lock 에 없는 파일을 끼워 넣으면 미등록으로 잡는다', () => {
    setup()
    writeFileSync(join(dir, 'rogue-tokens.css'), ':root{}')
    const { problems } = verifyMirror(dir)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('미등록 파일: rogue-tokens.css')
  })

  it('허용 목록(README, 폰트 라이선스)은 통과시킨다', () => {
    setup()
    writeFileSync(join(dir, 'README.md'), '# 동봉본')
    writeFileSync(join(dir, 'fonts', 'LICENSE-SpoqaHanSansNeo.txt'), 'OFL 1.1')
    writeFileSync(join(dir, 'fonts', 'LICENSE-MaterialSymbols.txt'), 'Apache-2.0')
    const { problems } = verifyMirror(dir)
    expect(problems).toEqual([])
  })
})
```

- [ ] **Step 2: vitest가 이 파일을 집도록 include를 넓힌다**

`vite.config.ts`의 `test` 블록을 다음으로 교체한다:

```ts
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs']
  }
```

- [ ] **Step 3: 테스트가 실패하는지 확인한다**

Run: `npx vitest run scripts/foundation-lock.test.mjs`
Expected: FAIL — `Failed to load url ./foundation-lock.mjs` (모듈이 아직 없다)

- [ ] **Step 4: 최소 구현을 쓴다**

`scripts/foundation-lock.mjs`:

```js
// 파운데이션 미러(styles/foundation/)의 무결성 계약.
// sync-foundation.mjs 가 lock 을 쓰고, check-foundation.mjs 가 lock 을 검증한다.
// 여기에는 순수 로직만 둔다 — 네트워크도 프로세스도 없다.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const MIRROR_DIR = join(ROOT, 'styles', 'foundation')
export const LOCK_NAME = 'foundation.lock.json'
export const DEFAULT_REPO = 'https://github.com/CREFLEINC/design-system-v2.git'
export const DEFAULT_REF = 'main'

// lock 의 files 에 등재되지 않아도 미러 디렉토리에 존재해도 되는 파일들.
// 파운데이션에서 동기화된 것이 아니라 이 repo 가 소유하는 파일이다.
const ALLOW = [/^foundation\.lock\.json$/, /^README\.md$/, /^fonts\/LICENSE-[^/]+\.txt$/]
export const isAllowed = (rel) => ALLOW.some((re) => re.test(rel))

export const sha256 = (data) => 'sha256:' + createHash('sha256').update(data).digest('hex')
export const hashFile = (abs) => sha256(readFileSync(abs))

// 미러 디렉토리의 모든 파일을 POSIX 상대 경로로 정렬해 나열한다.
export function listMirrorFiles(dir) {
  const out = []
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else out.push(relative(dir, p).split(sep).join('/'))
    }
  }
  if (existsSync(dir)) walk(dir)
  return out
}

// lock 과 디스크를 대조한다. 문제가 없으면 problems 는 빈 배열.
export function verifyMirror(dir) {
  const problems = []
  const lockPath = join(dir, LOCK_NAME)

  if (!existsSync(lockPath)) {
    problems.push(`${LOCK_NAME} 이(가) 없습니다. npm run sync-foundation 을 실행하세요.`)
    return { lock: null, problems }
  }

  let lock
  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  } catch (e) {
    problems.push(`${LOCK_NAME} 파싱 실패: ${e.message}`)
    return { lock: null, problems }
  }
  if (!lock.files || typeof lock.files !== 'object') {
    problems.push(`${LOCK_NAME} 에 files 필드가 없습니다.`)
    return { lock: null, problems }
  }

  // 1) lock 에 적힌 파일은 존재해야 하고 해시가 일치해야 한다.
  for (const [rel, expected] of Object.entries(lock.files)) {
    const abs = join(dir, ...rel.split('/'))
    if (!existsSync(abs)) {
      problems.push(`누락: ${rel}`)
      continue
    }
    const actual = hashFile(abs)
    if (actual !== expected) problems.push(`변조: ${rel}\n      기대 ${expected}\n      실제 ${actual}`)
  }

  // 2) lock 에 없는 파일은 허용 목록에 있어야 한다. (몰래 끼워 넣기 방지)
  for (const rel of listMirrorFiles(dir))
    if (!(rel in lock.files) && !isAllowed(rel)) problems.push(`미등록 파일: ${rel}`)

  return { lock, problems }
}
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `npx vitest run scripts/foundation-lock.test.mjs`
Expected: PASS — 7 passed

- [ ] **Step 6: 전체 테스트가 깨지지 않았는지 확인한다**

Run: `npm test`
Expected: PASS — 211 passed (기존 204 + 신규 7)

- [ ] **Step 7: 커밋**

```bash
git add scripts/foundation-lock.mjs scripts/foundation-lock.test.mjs vite.config.ts
git commit -F - <<'EOF'
feat: foundation mirror integrity — verifyMirror 순수 로직 + 단위 테스트

lock 과 디스크를 대조하는 verifyMirror(dir) 를 도입한다. 실패 조건 4가지
(lock 없음 / 파싱 실패 / 해시 불일치 / 미등록 파일)를 임시 디렉토리 픽스처로 검증한다.
vitest include 를 scripts/**/*.test.mjs 까지 넓혔다.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011iV62ofjqrgbiTTPqpgycU
EOF
```

---

### Task 2: sync-foundation 재작성 (원격 git 기반)

**Files:**
- Create: `scripts/sync-foundation.mjs`
- Create: `styles/foundation/README.md`
- Create: `styles/foundation/foundation.lock.json` (스크립트 실행 결과)
- Delete: `scripts/sync-foundation.sh`, `styles/foundation/PIN`
- Modify: `package.json` (`sync-foundation` 스크립트 경로)

**Interfaces:**
- Consumes: Task 1의 `MIRROR_DIR`, `LOCK_NAME`, `DEFAULT_REPO`, `DEFAULT_REF`, `sha256`, `hashFile`
- Produces: `styles/foundation/foundation.lock.json` — Task 3의 검사 대상

**환경변수 계약:**
- `FOUNDATION_REPO` (기본 `DEFAULT_REPO`), `FOUNDATION_REF` (기본 `DEFAULT_REF`)
- `FOUNDATION_DIR` — 설정된 경우에만 로컬 체크아웃 사용
- `--allow-dirty` — 로컬 체크아웃이 dirty해도 진행 (lock에 `dirty: true` 기록)

- [ ] **Step 1: 구현을 쓴다**

`scripts/sync-foundation.mjs`:

```js
#!/usr/bin/env node
// 파운데이션(design-system-v2)의 tokens.css 와 폰트를 styles/foundation/ 으로 동기화하고
// foundation.lock.json 을 재생성한다.
//
//   npm run sync-foundation                              원격 main 에서
//   FOUNDATION_REF=v1.0.0 npm run sync-foundation        특정 태그/커밋/브랜치
//   FOUNDATION_DIR=../foundation npm run sync-foundation 로컬 체크아웃에서 (동시 작업용)
//
// 미러 파일의 내용은 절대 수정하지 않는다 (배너 주입 금지).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MIRROR_DIR, LOCK_NAME, DEFAULT_REPO, DEFAULT_REF, sha256, listMirrorFiles, isAllowed } from './foundation-lock.mjs'

const allowDirty = process.argv.includes('--allow-dirty')
const repo = process.env.FOUNDATION_REPO || DEFAULT_REPO
const ref = process.env.FOUNDATION_REF || DEFAULT_REF
const localDir = process.env.FOUNDATION_DIR

const FONT_DIR_IN_SOURCE = 'ds-bundle/fonts'

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', ...opts })
const gitBuf = (args) => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 })

function die(msg) {
  console.error('✗ ' + msg)
  process.exit(1)
}

// 소스에서 { commit, dirty, read(path) -> Buffer, listFonts() -> string[] } 를 만든다.
function openLocalSource(dir) {
  if (!existsSync(join(dir, 'tokens.css'))) die(`FOUNDATION_DIR 에 tokens.css 가 없습니다: ${dir}`)
  const status = git(['-C', dir, 'status', '--porcelain', '--', 'tokens.css', FONT_DIR_IN_SOURCE]).trim()
  const dirty = status.length > 0
  if (dirty && !allowDirty)
    die(
      `FOUNDATION_DIR 의 working tree 가 dirty 합니다. 커밋하거나 --allow-dirty 를 쓰세요.\n${status}`
    )
  const commit = git(['-C', dir, 'rev-parse', 'HEAD']).trim()
  return {
    commit,
    dirty,
    read: (p) => readFileSync(join(dir, ...p.split('/'))),
    listFonts: () =>
      git(['-C', dir, 'ls-files', '--', `${FONT_DIR_IN_SOURCE}/*.woff2`])
        .trim()
        .split('\n')
        .filter(Boolean)
  }
}

function openRemoteSource(tmp) {
  // working tree 를 만들지 않는다. fetch 후 `git show` 로 blob 만 꺼낸다.
  // 이 방식은 브랜치·태그·전체 SHA 를 모두 지원한다.
  git(['init', '--quiet', tmp])
  git(['-C', tmp, 'remote', 'add', 'origin', repo])
  try {
    git(['-C', tmp, 'fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', ref], {
      stdio: ['ignore', 'ignore', 'pipe']
    })
  } catch (e) {
    die(`파운데이션을 가져오지 못했습니다 (repo=${repo}, ref=${ref}).\n${String(e.stderr || e.message).trim()}`)
  }
  const commit = git(['-C', tmp, 'rev-parse', 'FETCH_HEAD']).trim()
  return {
    commit,
    dirty: false,
    read: (p) => gitBuf(['-C', tmp, 'show', `FETCH_HEAD:${p}`]),
    listFonts: () =>
      git(['-C', tmp, 'ls-tree', '--name-only', 'FETCH_HEAD', `${FONT_DIR_IN_SOURCE}/`])
        .trim()
        .split('\n')
        .filter((p) => p.endsWith('.woff2'))
  }
}

let tmp
try {
  const src = localDir ? openLocalSource(localDir) : openRemoteSource((tmp = mkdtempSync(join(tmpdir(), 'crefle-foundation-'))))
  console.log(`파운데이션 소스: ${localDir ? localDir : `${repo} @ ${ref}`}  (${src.commit.slice(0, 7)}${src.dirty ? ', dirty' : ''})`)

  const before = new Map(
    listMirrorFiles(MIRROR_DIR)
      .filter((rel) => !isAllowed(rel))
      .map((rel) => [rel, sha256(readFileSync(join(MIRROR_DIR, ...rel.split('/'))))])
  )

  // 새 내용을 모은다.
  const next = new Map()
  next.set('tokens.css', src.read('tokens.css'))
  for (const p of src.listFonts()) next.set(`fonts/${p.split('/').pop()}`, src.read(p))

  // 디스크에 쓴다.
  mkdirSync(join(MIRROR_DIR, 'fonts'), { recursive: true })
  for (const [rel, buf] of next) writeFileSync(join(MIRROR_DIR, ...rel.split('/')), buf)

  // 더 이상 존재하지 않는 미러 파일은 지운다.
  for (const rel of before.keys()) if (!next.has(rel)) unlinkSync(join(MIRROR_DIR, ...rel.split('/')))

  // lock 을 쓴다.
  const files = {}
  for (const rel of [...next.keys()].sort()) files[rel] = sha256(next.get(rel))
  const lock = {
    repo,
    ref,
    commit: src.commit,
    syncedAt: new Date().toISOString(),
    ...(src.dirty ? { dirty: true } : {}),
    files
  }
  writeFileSync(join(MIRROR_DIR, LOCK_NAME), JSON.stringify(lock, null, 2) + '\n')

  // 옛 PIN 파일 제거.
  const pin = join(MIRROR_DIR, 'PIN')
  if (existsSync(pin)) unlinkSync(pin)

  // 요약.
  const added = [...next.keys()].filter((r) => !before.has(r))
  const changed = [...next.keys()].filter((r) => before.has(r) && before.get(r) !== files[r])
  const removed = [...before.keys()].filter((r) => !next.has(r))
  const fmt = (label, list) => (list.length ? `  ${label}: ${list.join(', ')}` : null)
  const lines = [fmt('추가', added), fmt('변경', changed), fmt('삭제', removed)].filter(Boolean)
  console.log(`✓ 동기화 완료 (${next.size}개 파일)`)
  console.log(lines.length ? lines.join('\n') : '  변경 없음 — 미러가 이미 최신입니다.')
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true })
}
```

- [ ] **Step 2: `styles/foundation/README.md` 를 쓴다**

```markdown
# 이 디렉토리는 동봉본입니다 — 직접 수정하지 마세요

`tokens.css` 와 `fonts/*.woff2` 는 파운데이션 repo
[`CREFLEINC/design-system-v2`](https://github.com/CREFLEINC/design-system-v2) 에서
복사된 파일입니다. 원본과 **바이트 동일**해야 합니다.

여기 있는 파일을 고치면 `npm run check` 와 CI 가 실패합니다.
토큰을 바꾸려면 파운데이션 repo 에서 고친 뒤 아래를 실행하세요.

```bash
npm run sync-foundation
```

## 파일

| 파일 | 설명 |
|---|---|
| `foundation.lock.json` | 출처 repo·ref·커밋 SHA 와 파일별 sha256. 무결성 검사의 기준 |
| `tokens.css` | 파운데이션 Stage 1 토큰 (동봉본) |
| `fonts/*.woff2` | Spoqa Han Sans Neo 5종 + Material Symbols Rounded (동봉본) |
| `fonts/LICENSE-*.txt` | 위 폰트들의 원 라이선스 전문 |
| `README.md` | 이 파일 |

## 명령

| 명령 | 하는 일 | 네트워크 |
|---|---|---|
| `npm run check:foundation` | 미러가 lock 과 일치하는지 검사. 불일치 시 실패 | 불필요 |
| `npm run check:foundation:upstream` | 파운데이션이 앞서 있는지 확인. **경고만 하고 절대 실패하지 않음** | 필요 |
| `npm run sync-foundation` | 파운데이션에서 다시 받아 lock 갱신 | 필요 |

## 환경변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `FOUNDATION_REPO` | `https://github.com/CREFLEINC/design-system-v2.git` | 소스 repo |
| `FOUNDATION_REF` | `main` | 브랜치·태그·전체 SHA |
| `FOUNDATION_DIR` | (없음) | 로컬 체크아웃에서 동기화 (동시 작업용) |

## 참고

파운데이션 repo 는 **private** 입니다. `sync-foundation` 은 `gh` CLI 의 credential helper
(또는 SSH 키)로 인증합니다. 접근 권한이 없으면 동기화할 수 없습니다.

반면 `check:foundation` 은 이 repo 안의 lock 파일만 보므로 **누구나, 오프라인에서도** 실행할 수 있고
CI 도 파운데이션에 접근하지 않습니다.
```

- [ ] **Step 3: `package.json` 의 sync 스크립트를 갈아끼운다**

`"sync-foundation": "bash scripts/sync-foundation.sh"` 를 다음으로 교체:

```json
    "sync-foundation": "node scripts/sync-foundation.mjs",
```

- [ ] **Step 4: 옛 파일을 지우고 스크립트를 실행한다**

```bash
git rm -q scripts/sync-foundation.sh
npm run sync-foundation
```

Expected 출력:
```
파운데이션 소스: https://github.com/CREFLEINC/design-system-v2.git @ main  (7ea18c4)
✓ 동기화 완료 (7개 파일)
  변경 없음 — 미러가 이미 최신입니다.
```

- [ ] **Step 5: 미러 내용이 바이트 단위로 안 바뀌었는지 확인한다**

Run: `git status --short styles/foundation`
Expected: `PIN` 삭제와 `foundation.lock.json` 추가만 보인다. `tokens.css` 나 `fonts/*.woff2` 가 modified로 뜨면 스크립트가 내용을 건드린 것이므로 **중단하고 원인을 찾는다.**

```
 D styles/foundation/PIN
?? styles/foundation/README.md
?? styles/foundation/foundation.lock.json
```

- [ ] **Step 6: lock 이 스펙대로 생겼는지 확인한다**

Run: `node -e "const l=require('./styles/foundation/foundation.lock.json'); console.log(l.commit.length, l.ref, Object.keys(l.files).length)"`
Expected: `40 main 7`

- [ ] **Step 7: 커밋**

```bash
git add -A scripts styles/foundation package.json
git commit -F - <<'EOF'
feat: sync-foundation 을 원격 git 기반 node 스크립트로 재작성

로컬 경로($HOME/Documents/...) 기본값을 제거하고 FOUNDATION_REPO/REF 로 원격에서 받는다.
FOUNDATION_DIR 은 오버라이드로만 남으며, dirty 체크아웃은 --allow-dirty 없이는 거부한다.

PIN(7자 해시)을 foundation.lock.json(repo·ref·전체 SHA·파일별 sha256)으로 대체.
미러 파일 내용은 수정하지 않는다 — DO-NOT-EDIT 안내는 README.md 에 둔다.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011iV62ofjqrgbiTTPqpgycU
EOF
```

---

### Task 3: 검사기 CLI + 게이트 배선

**Files:**
- Create: `scripts/check-foundation.mjs`
- Modify: `package.json` (scripts, engines)

**Interfaces:**
- Consumes: Task 1의 `verifyMirror`, `MIRROR_DIR`, `sha256`, `DEFAULT_REPO`, `DEFAULT_REF`; Task 2가 만든 `foundation.lock.json`
- Produces: `npm run check:foundation` (exit 1 on tamper), `npm run check:foundation:upstream` (항상 exit 0)

- [ ] **Step 1: 검사기를 쓴다**

`scripts/check-foundation.mjs`:

```js
#!/usr/bin/env node
// 파운데이션 미러의 무결성을 검사한다.
//
//   node scripts/check-foundation.mjs              tamper 검사 (오프라인). 불일치 시 exit 1
//   node scripts/check-foundation.mjs --upstream   + staleness 확인. 절대 실패하지 않는다
//
// CI 는 파운데이션 repo 에 접근하지 않는다. lock 파일과 디스크만 대조한다.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MIRROR_DIR, DEFAULT_REPO, DEFAULT_REF, verifyMirror, sha256 } from './foundation-lock.mjs'

const FIX = `
styles/foundation/ 는 파운데이션 repo(CREFLEINC/design-system-v2)의 동봉본입니다.
직접 수정하지 마세요. 파운데이션에서 고친 뒤 아래를 실행하세요:

    npm run sync-foundation
`

const { lock, problems } = verifyMirror(MIRROR_DIR)

if (problems.length) {
  console.error('✗ 파운데이션 미러 무결성 검사 실패\n')
  for (const p of problems) console.error('  - ' + p)
  console.error(FIX)
  process.exit(1)
}

if (lock.dirty) console.warn('⚠ 이 lock 은 dirty 한 로컬 체크아웃에서 생성되었습니다 (--allow-dirty).')
console.log(`✓ 파운데이션 미러 무결성 OK — ${Object.keys(lock.files).length}개 파일 @ ${lock.commit.slice(0, 7)}`)

if (!process.argv.includes('--upstream')) process.exit(0)

// ---- staleness: 경고 전용. 네트워크·인증 실패도 통과시킨다. ----
const repo = process.env.FOUNDATION_REPO || lock.repo || DEFAULT_REPO
const ref = process.env.FOUNDATION_REF || lock.ref || DEFAULT_REF
const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

let tmp
try {
  const remote = git(['ls-remote', repo, ref]).trim().split(/\s+/)[0]
  if (!remote) {
    console.warn(`⚠ 원격 ref '${ref}' 를 찾을 수 없습니다. 업스트림 확인을 건너뜁니다.`)
    process.exit(0)
  }
  if (remote === lock.commit) {
    console.log('✓ 파운데이션 최신 커밋과 동일합니다.')
    process.exit(0)
  }

  tmp = mkdtempSync(join(tmpdir(), 'crefle-upstream-'))
  git(['init', '--quiet', tmp])
  git(['-C', tmp, 'remote', 'add', 'origin', repo])
  git(['-C', tmp, 'fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', ref])
  const upstreamTokens = execFileSync('git', ['-C', tmp, 'show', 'FETCH_HEAD:tokens.css'], { maxBuffer: 16 * 1024 * 1024 })

  const short = (s) => s.slice(0, 7)
  if (sha256(upstreamTokens) === lock.files['tokens.css'])
    console.log(`ℹ 파운데이션이 앞서 있으나(${short(lock.commit)} → ${short(remote)}) tokens.css 는 동일합니다 (문서 변경뿐).`)
  else
    console.warn(
      `⚠ 파운데이션의 tokens.css 가 변경되었습니다 (${short(lock.commit)} → ${short(remote)}).\n` +
        '  npm run sync-foundation 실행을 검토하세요.'
    )
} catch (e) {
  console.warn(`⚠ 업스트림 확인을 건너뜁니다 (네트워크/인증 실패): ${String(e.message).split('\n')[0]}`)
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true })
}
process.exit(0)
```

- [ ] **Step 2: 검사기가 통과하는지 확인한다**

Run: `node scripts/check-foundation.mjs`
Expected: `✓ 파운데이션 미러 무결성 OK — 7개 파일 @ 7ea18c4` / exit 0

- [ ] **Step 3: `--upstream` 이 실패하지 않는지 확인한다**

Run: `node scripts/check-foundation.mjs --upstream; echo "exit=$?"`
Expected: `✓ 파운데이션 최신 커밋과 동일합니다.` 와 `exit=0`
(네트워크가 없으면 `⚠ 업스트림 확인을 건너뜁니다` 와 `exit=0`)

- [ ] **Step 4: 실증 리허설 — 일부러 오염시킨다**

```bash
printf '\n/* 몰래 고침 */\n' >> styles/foundation/tokens.css
node scripts/check-foundation.mjs; echo "exit=$?"
```
Expected:
```
✗ 파운데이션 미러 무결성 검사 실패

  - 변조: tokens.css
      기대 sha256:…
      실제 sha256:…

styles/foundation/ 는 파운데이션 repo(CREFLEINC/design-system-v2)의 동봉본입니다.
…
exit=1
```

- [ ] **Step 5: 되돌리고 다시 통과하는지 확인한다**

```bash
git checkout -- styles/foundation/tokens.css
node scripts/check-foundation.mjs; echo "exit=$?"
```
Expected: `✓ … OK` 와 `exit=0`

- [ ] **Step 6: `package.json` 에 스크립트와 engines 를 배선한다**

`scripts` 블록을 다음으로 교체:

```json
  "scripts": {
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint:tokens": "node scripts/check-tokens.mjs",
    "check:foundation": "node scripts/check-foundation.mjs",
    "check:foundation:upstream": "node scripts/check-foundation.mjs --upstream",
    "sync-foundation": "node scripts/sync-foundation.mjs",
    "shoot": "bash scripts/shoot.sh",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "check": "npm run check:foundation && npm run typecheck && npm test && npm run lint:tokens && npm run build && npm run build-storybook"
  },
```

그리고 `"peerDependencies"` 바로 앞에 다음을 추가:

```json
  "engines": {
    "node": ">=20.19"
  },
```

- [ ] **Step 7: 전체 게이트를 돌린다**

Run: `npm run check`
Expected: 첫 줄이 `✓ 파운데이션 미러 무결성 OK`, 마지막이 `Storybook build completed successfully`. 전체 exit 0.

- [ ] **Step 8: 커밋**

```bash
git add scripts/check-foundation.mjs package.json
git commit -F - <<'EOF'
feat: check-foundation 검사기 + npm 게이트 배선

tamper 는 오프라인 에러(exit 1), staleness 는 --upstream 경고(항상 exit 0)로 분리한다.
check:foundation 을 npm run check 의 맨 앞에 두어 5분짜리 storybook 빌드 전에 즉시 죽게 한다.
engines.node >= 20.19 명시.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011iV62ofjqrgbiTTPqpgycU
EOF
```

---

### Task 4: CI 워크플로우

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Task 3의 `npm run check`
- Produces: `check` 라는 이름의 status check — Task 8의 required status check 대상

- [ ] **Step 1: 워크플로우를 쓴다**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  # 잡 이름 'check' 가 그대로 status check 컨텍스트 이름이 된다 (branch protection 이 이 이름을 참조).
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      # 파운데이션 repo 에 접근하지 않는다. lock 파일과 디스크만 대조한다.
      - run: npm run check
```

- [ ] **Step 2: 커밋하고 push 한다**

```bash
git add .github/workflows/ci.yml
git commit -F - <<'EOF'
ci: GitHub Actions 게이트 (npm run check)

파운데이션 repo 에 접근하지 않으므로 자격증명이 필요 없다.
잡 이름 'check' 는 branch protection 의 required status check 컨텍스트가 된다.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011iV62ofjqrgbiTTPqpgycU
EOF
git push origin main
```

> **SSH 주의:** 이 머신의 `~/.ssh/id_ed25519` 는 패스프레이즈가 걸려 있고 ssh-agent 가 비어 있어
> 비대화형 셸에서 SSH push 가 실패한다. 먼저 `ssh-add --apple-use-keychain ~/.ssh/id_ed25519` 를
> 한 번 실행하거나, 다음처럼 HTTPS 로 우회한다(`gh` credential helper 가 인증):
> ```bash
> git -c url."https://github.com/".insteadOf="git@github.com:" push origin main
> ```

- [ ] **Step 3: 첫 run 이 green 인지 확인한다**

```bash
gh run watch --exit-status
```
Expected: `✓ main CI · <run-id>` / exit 0

빨간색이면 로그를 읽고 고친 뒤 다시 push한다. 흔한 원인은 Node 24에서의 `npm ci` 실패(`engines` 불일치)다.

---

### Task 5: 웹 DS 문서 29개 이관

**Files (webui repo):**
- Create: `docs/superpowers/specs/2026-07-08-web-frontend-ds-design.md`
- Create: `docs/superpowers/specs/phase2-components/*.md` (11)
- Create: `docs/superpowers/specs/phase3-components/*.md` (10)
- Create: `docs/superpowers/specs/phase4-components/*.md` (3)
- Create: `docs/superpowers/plans/2026-07-08-web-ds-phase{1,2,3,4}.md` (4)
- Delete: `docs/2026-07-08-web-frontend-ds-design.md` (루트 중복본, 바이트 동일 확인됨)
- Modify: `README.md` (스펙 경로 링크)

**Files (파운데이션 repo `/Users/rangkim/Documents/Claude/Projects/CREFLE Design System`):**
- Delete: `docs/superpowers/specs/**`, `docs/superpowers/plans/**` (29개 전부)
- Create: `docs/README.md`

**Interfaces:** 없음 (문서 전용)

- [ ] **Step 1: 복사한다**

```bash
FND="/Users/rangkim/Documents/Claude/Projects/CREFLE Design System"
mkdir -p docs/superpowers/specs docs/superpowers/plans
cp -R "$FND/docs/superpowers/specs/." docs/superpowers/specs/
cp -R "$FND/docs/superpowers/plans/." docs/superpowers/plans/
```

- [ ] **Step 2: 29개가 바이트 동일하게 옮겨졌는지 확인한다**

```bash
FND="/Users/rangkim/Documents/Claude/Projects/CREFLE Design System"
diff -r "$FND/docs/superpowers/specs" docs/superpowers/specs \
  --exclude=2026-07-09-polyrepo-integrity-design.md
diff -r "$FND/docs/superpowers/plans" docs/superpowers/plans \
  --exclude=2026-07-09-polyrepo-integrity.md
echo "diff exit=$?"
```
Expected: 출력 없음, `diff exit=0`

- [ ] **Step 3: 루트 중복본을 지우고 README 링크를 고친다**

```bash
git rm -q docs/2026-07-08-web-frontend-ds-design.md
```

`README.md` 의 다음 줄을

```
- 스펙: `docs/2026-07-08-web-frontend-ds-design.md`
```

다음으로 바꾼다:

```
- 스펙: `docs/superpowers/specs/2026-07-08-web-frontend-ds-design.md`
- 컴포넌트 상세 스펙: `docs/superpowers/specs/phase{2,3,4}-components/`
- 구현 플랜: `docs/superpowers/plans/`
```

- [ ] **Step 4: 게이트를 돌리고 커밋한다**

Run: `npm run check`
Expected: exit 0 (문서 변경이라 영향 없음)

```bash
git add -A docs README.md
git commit -F - <<'EOF'
docs: 웹 DS 문서 29개를 파운데이션 repo 에서 이관

Moved from CREFLEINC/design-system-v2@7ea18c4

컴포넌트 스펙 25종(phase2/3/4-components + 전체 설계)과 구현 플랜 4종을 옮긴다.
webui 만 클론한 사람이 설계 의도를 볼 수 있어야 한다. 루트의 중복본
docs/2026-07-08-web-frontend-ds-design.md 는 파운데이션본과 바이트 동일하여 삭제.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011iV62ofjqrgbiTTPqpgycU
EOF
git push origin main
```

- [ ] **Step 5: 파운데이션 repo 에서 원본을 지우고 포인터를 남긴다**

```bash
cd "/Users/rangkim/Documents/Claude/Projects/CREFLE Design System"
git rm -r -q docs/superpowers
mkdir -p docs
```

`docs/README.md`:

```markdown
# 문서

웹 프론트엔드 디자인 시스템(`@crefle/web-ui`)의 스펙과 구현 플랜은
**[`CREFLEINC/design-system-v2-webui`](https://github.com/CREFLEINC/design-system-v2-webui)**
의 `docs/superpowers/` 로 이관되었습니다 (2026-07-09, 출처 커밋 `7ea18c4`).

| 옮겨간 것 | 새 위치 |
|---|---|
| 웹 DS 전체 설계 (컴포넌트 25종 3티어) | `docs/superpowers/specs/2026-07-08-web-frontend-ds-design.md` |
| 컴포넌트 상세 스펙 24종 | `docs/superpowers/specs/phase{2,3,4}-components/` |
| Phase 1~4 구현 플랜 | `docs/superpowers/plans/` |

원본 히스토리는 이 repo 에 그대로 남아 있습니다: `git log -- docs/superpowers`

이 디렉토리는 앞으로 **파운데이션 자신의** 스펙이 들어올 자리입니다.
```

- [ ] **Step 6: 파운데이션 repo 를 커밋·push 한다**

```bash
git add -A docs
git commit -F - <<'EOF'
docs: 웹 DS 문서를 design-system-v2-webui 로 이관

스펙 25종과 플랜 4종은 소비 repo 로 옮겼다. 여기엔 포인터만 남긴다.
docs/ 는 앞으로 파운데이션 자신의 스펙 자리다.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011iV62ofjqrgbiTTPqpgycU
EOF
git push origin main
cd -
```

(SSH 가 막히면 Task 4 Step 2의 HTTPS 우회를 쓴다.)

---

### Task 6: 라이선스 — public 전환의 선행 조건

**Files:**
- Create: `LICENSE`
- Create: `styles/foundation/fonts/LICENSE-SpoqaHanSansNeo.txt`
- Create: `styles/foundation/fonts/LICENSE-MaterialSymbols.txt`
- Modify: `package.json` (`license` 필드)

**Interfaces:**
- Consumes: Task 1의 허용 목록 정규식 `^fonts/LICENSE-[^/]+\.txt$` — 이 파일들이 미등록 파일로 잡히지 않는 이유

- [ ] **Step 1: 폰트 라이선스 전문을 받는다**

```bash
curl -fsSL https://raw.githubusercontent.com/spoqa/spoqa-han-sans/master/LICENSE \
  -o styles/foundation/fonts/LICENSE-SpoqaHanSansNeo.txt
curl -fsSL https://raw.githubusercontent.com/google/material-design-icons/master/LICENSE \
  -o styles/foundation/fonts/LICENSE-MaterialSymbols.txt
```

- [ ] **Step 2: 받은 파일이 맞는 라이선스인지 확인한다**

```bash
grep -q 'SIL Open Font License, Version 1.1' styles/foundation/fonts/LICENSE-SpoqaHanSansNeo.txt && echo "OFL OK"
grep -q 'Reserved Font Name Spoqa Han Sans Neo' styles/foundation/fonts/LICENSE-SpoqaHanSansNeo.txt && echo "Neo 저작권 고지 OK"
grep -q 'Apache License' styles/foundation/fonts/LICENSE-MaterialSymbols.txt && echo "Apache OK"
```
Expected: 세 줄 모두 출력. 하나라도 없으면 URL 이 바뀐 것이므로 **중단하고 원본을 다시 찾는다.**

- [ ] **Step 3: 미등록 파일로 잡히지 않는지 확인한다**

Run: `node scripts/check-foundation.mjs`
Expected: `✓ 파운데이션 미러 무결성 OK — 7개 파일 @ …` / exit 0
(라이선스 2개는 허용 목록에 걸려 files 카운트에 들어가지 않는다)

- [ ] **Step 4: 코드 라이선스를 쓴다**

`LICENSE`:

```
Copyright (c) 2026 CREFLE Inc. (크레플 주식회사)
All rights reserved.

This software and its source code are proprietary and confidential.

Permission is NOT granted to use, copy, modify, merge, publish, distribute,
sublicense, or sell copies of this software, in whole or in part, except with
the prior written permission of CREFLE Inc.

The source is published for reference and transparency only.

---

THIRD-PARTY ASSETS

This repository bundles font files that are licensed separately. Their license
texts are included alongside the fonts:

  Spoqa Han Sans Neo (Thin/Light/Regular/Medium/Bold)
    SIL Open Font License 1.1
    styles/foundation/fonts/LICENSE-SpoqaHanSansNeo.txt

  Material Symbols Rounded
    Apache License 2.0
    styles/foundation/fonts/LICENSE-MaterialSymbols.txt

The "All rights reserved" statement above does not apply to these fonts.

---

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

- [ ] **Step 5: `package.json` 에 license 필드를 추가한다**

`"private": true,` 바로 다음 줄에 삽입:

```json
  "license": "UNLICENSED",
```

(`"private": true` 는 npm 퍼블리시 방지 플래그다. repo 공개 범위와 무관하므로 유지한다.)

- [ ] **Step 6: 게이트를 돌리고 커밋·push 한다**

Run: `npm run check`
Expected: exit 0

```bash
git add LICENSE package.json styles/foundation/fonts/LICENSE-SpoqaHanSansNeo.txt styles/foundation/fonts/LICENSE-MaterialSymbols.txt
git commit -F - <<'EOF'
chore: 라이선스 정리 — public 전환 선행 조건

코드는 독점(All rights reserved), package.json 에 license: UNLICENSED.
번들된 폰트 6종의 원 라이선스 전문을 동봉한다 — Spoqa Han Sans Neo 는 SIL OFL 1.1,
Material Symbols 는 Apache-2.0 이며 둘 다 재배포 시 전문 포함을 요구한다.
지금까지 고지가 전혀 없었다.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011iV62ofjqrgbiTTPqpgycU
EOF
git push origin main
```

---

### Task 7: 공개 범위 전환 ⚠️ 되돌리기 어려움

**Files:** 없음 (GitHub 설정)

**선행 조건 (하나라도 실패하면 실행하지 않는다):**

- [ ] **Step 1: 라이선스가 전부 자리에 있는지 확인한다**

```bash
test -f LICENSE && echo "LICENSE OK"
test -f styles/foundation/fonts/LICENSE-SpoqaHanSansNeo.txt && echo "OFL OK"
test -f styles/foundation/fonts/LICENSE-MaterialSymbols.txt && echo "Apache OK"
node -e "const p=require('./package.json'); if(p.license!=='UNLICENSED') { console.error('license 필드 없음'); process.exit(1) } console.log('license 필드 OK')"
```
Expected: 네 줄 모두 출력. 하나라도 없으면 Task 6으로 돌아간다.

- [ ] **Step 2: push 되지 않은 커밋이 없는지 확인한다**

```bash
git status --short
git log --oneline origin/main..HEAD
```
Expected: 둘 다 빈 출력

- [ ] **Step 3: 파운데이션을 private 으로 돌린다**

```bash
gh repo edit CREFLEINC/design-system-v2 --visibility private --accept-visibility-change-consequences
gh repo view CREFLEINC/design-system-v2 --json visibility
```
Expected: `{"visibility":"PRIVATE"}`

- [ ] **Step 4: webui 를 public 으로 연다**

> 이 명령은 **공개 행위**다. 브랜드 토큰 전체, 컴포넌트 스펙 29개, OnMyFactory 대시보드 데모가
> 인터넷에 공개된다. 되돌려도 클론·색인된 사본은 남는다. 스펙 §4에서 명시적으로 수용한 결과다.

```bash
gh repo edit CREFLEINC/design-system-v2-webui --visibility public --accept-visibility-change-consequences
gh repo view CREFLEINC/design-system-v2-webui --json visibility,licenseInfo
```
Expected: `{"visibility":"PUBLIC","licenseInfo":null}`
(GitHub 은 `UNLICENSED` 를 알려진 라이선스로 인식하지 않으므로 `licenseInfo: null` 이 정상이다)

- [ ] **Step 5: 익명 클론으로 CI 가 여전히 green 인지 확인한다**

파운데이션이 private 이 된 뒤에도 webui 단독 빌드가 되는지가 핵심이다.

```bash
TMP=$(mktemp -d)
git -c credential.helper= clone --quiet https://github.com/CREFLEINC/design-system-v2-webui.git "$TMP/anon"
cd "$TMP/anon" && npm ci --silent && npm run check
cd - && rm -rf "$TMP"
```
Expected: `✓ 파운데이션 미러 무결성 OK` 로 시작해 전체 exit 0

- [ ] **Step 6: 파운데이션 동기화가 여전히 되는지 확인한다 (인증 경로)**

```bash
npm run sync-foundation
git status --short styles/foundation
```
Expected: `✓ 동기화 완료 (7개 파일)` + `변경 없음`, git status 빈 출력
(실패하면 `gh auth status` 로 인증을 확인한다. private repo 접근 권한이 필요하다.)

---

### Task 8: branch protection ⚠️ 이후 main 직행 불가

**Files:** 없음 (GitHub 설정)

**Interfaces:**
- Consumes: Task 4가 만든 status check 컨텍스트 이름 `check`

- [ ] **Step 1: protection 을 건다**

```bash
gh api -X PUT repos/CREFLEINC/design-system-v2-webui/branches/main/protection \
  -H "Accept: application/vnd.github+json" --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["check"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null
}
JSON
```

`strict: true` 는 병합 전에 브랜치가 `main` 최신이어야 함을 뜻한다. `required_approving_review_count: 0`
은 승인은 요구하지 않되 **PR 자체는 필수**로 만든다 (1인 개발이라 자기 PR 을 승인할 수 없다).
`enforce_admins: false` 로 관리자의 긴급 우회를 남겨둔다.

- [ ] **Step 2: 설정이 걸렸는지 확인한다**

```bash
gh api repos/CREFLEINC/design-system-v2-webui/branches/main/protection \
  --jq '{checks: .required_status_checks.contexts, pr_required: (.required_pull_request_reviews != null), admins: .enforce_admins.enabled}'
```
Expected: `{"checks":["check"],"pr_required":true,"admins":false}`

- [ ] **Step 3: main 직접 push 가 거부되는지 확인한다**

```bash
git commit --allow-empty -m "test: protection 확인용 빈 커밋"
git push origin main; echo "exit=$?"
```
Expected: `! [remote rejected] main -> main (protected branch hook declined)` / `exit=1`

- [ ] **Step 4: 빈 커밋을 되돌린다**

```bash
git reset --hard origin/main
git log --oneline -1
```
Expected: HEAD 가 Task 6의 라이선스 커밋

- [ ] **Step 5: 오염된 브랜치의 PR 이 병합 불가인지 확인한다**

```bash
git switch -c test/tamper-blocked
printf '\n/* 몰래 고침 */\n' >> styles/foundation/tokens.css
git commit -am "test: 미러 오염 — CI 가 잡아야 한다"
git push -u origin test/tamper-blocked
gh pr create --title "test: tamper must be blocked" --body "미러 오염이 병합을 막는지 확인용. 확인 후 닫는다." --base main
gh pr checks --watch; echo "checks exit=$?"
```
Expected: `check` 가 **fail**, `checks exit=1`. GitHub UI 에서 병합 버튼이 잠긴다.

- [ ] **Step 6: 확인용 PR 과 브랜치를 정리한다**

```bash
gh pr close test/tamper-blocked --delete-branch
git switch main
git branch -D test/tamper-blocked
git status --short
```
Expected: 빈 출력. 이후 모든 변경은 브랜치 → PR → CI green → 병합이다.

---

## Self-Review

**스펙 커버리지**

| 스펙 요구 | 구현 태스크 |
|---|---|
| §1 lock 스키마 (repo·ref·40자 commit·syncedAt·files) | Task 2 Step 1 |
| §1 `verifyMirror` 실패 4조건 | Task 1 Step 4 + 테스트 |
| §1 허용 목록 (lock, README, `fonts/LICENSE-*.txt`) | Task 1 `ALLOW` 정규식 |
| §1 미러 파일 무수정 (배너 주입 금지) | Task 2 Step 5 검증 |
| §1 `--upstream` 은 절대 실패하지 않음 | Task 3 Step 1 + Step 3 |
| §1 dirty lock 경고 | Task 3 Step 1 (`lock.dirty`) |
| §2 `FOUNDATION_{REPO,REF,DIR}` + `--allow-dirty` | Task 2 Step 1 |
| §2 원격 sparse/blobless 획득 | Task 2 `openRemoteSource` |
| §2 로컬 dirty 거부 | Task 2 `openLocalSource` |
| §2 `PIN` / `sync-foundation.sh` 삭제 | Task 2 Step 4 |
| §3 문서 29개 이관 + 루트 중복본 삭제 + README 링크 | Task 5 |
| §3 파운데이션 `docs/README.md` 포인터 | Task 5 Step 5 |
| §4 공개 범위 전환 | Task 7 |
| §4 코드 + 폰트 라이선스 | Task 6 |
| §4 private 파운데이션의 sync 인증 | Task 7 Step 6 |
| §5 CI (파운데이션 미접근) | Task 4 |
| §5 npm scripts 순서 (`check:foundation` 선두) | Task 3 Step 6 |
| §5 branch protection | Task 8 |
| §6 단위 테스트 5경로 | Task 1 (7개 케이스) |
| §6 실증 리허설 | Task 3 Step 4~5 |
| §6 이관 무결성 대조 | Task 5 Step 2 |
| §6 클린 클론 | Task 7 Step 5 |
| §6 CI 첫 run | Task 4 Step 3 |
| §6 병합 차단 확인 | Task 8 Step 3, 5 |
| §6 라이선스 존재 확인 | Task 7 Step 1 |

빠진 요구 없음.

**플레이스홀더 스캔:** 없음. 모든 코드 스텝에 실제 코드가 들어 있고, 모든 명령에 기대 출력이 붙어 있다.

**타입·이름 일관성:** `verifyMirror` 는 Task 1에서 `{ lock, problems }` 를 반환하도록 정의했고, Task 3의 CLI 가 그 형태로 구조분해한다. `sha256` 은 `'sha256:<hex>'` 접두사를 붙여 반환하며 lock 의 `files` 값과 테스트가 같은 형식을 쓴다. `MIRROR_DIR`·`LOCK_NAME`·`DEFAULT_REPO`·`DEFAULT_REF` 는 Task 1에서 export 되어 Task 2·3이 그대로 import 한다. Task 4가 만드는 잡 이름 `check` 는 Task 8의 `contexts: ["check"]` 와 일치한다. Task 6이 추가하는 `fonts/LICENSE-*.txt` 는 Task 1의 `ALLOW` 정규식과 일치한다.

**검증한 외부 사실:** 라이선스 URL 두 개 모두 HTTP 200이며 각각 `SIL Open Font License, Version 1.1` / `Apache License` 문자열을 포함한다. `CREFLEINC` org 는 Free 플랜이라 private repo 에 protection 을 걸 수 없다(API 403) — Task 7이 Task 8보다 앞서야 하는 이유다.

## 빌드 순서

Task 1 → 2 → 3 은 엄격한 순서 의존이다(순수 로직 → lock 생성 → 검사). Task 4·5 는 3 이후 어느 순서든 무방하다. Task 6 → 7 → 8 은 다시 엄격한 순서 의존이다(라이선스 없이 공개 금지, Free 플랜에서는 public 이어야 protection 이 켜짐). 병렬화 여지는 4와 5뿐이며, 둘 다 짧아 순차 실행해도 손해가 없다.
