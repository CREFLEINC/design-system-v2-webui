# CREFLE Web DS — Phase 1 구현 계획 (스캐폴드 + 토큰 + 테마 + 패턴 확립)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@crefle/web-ui` repo를 생성하고 토큰·테마 시스템과 컴포넌트 패턴(Icon·ThemeProvider·Button)을 확립해, Phase 2+에서 24종 컴포넌트를 병렬 생산할 수 있는 기반을 완성한다.

**Architecture:** 순수 CSS 커스텀 프로퍼티 + CSS Modules + React/TS. `styles/`는 React 없이 완결된 CSS 시스템(파운데이션 복사본 + 웹 토큰 + 테마), `src/`는 그 위의 React 구현체. 테마는 `[data-theme]` 요소 스코프 변수 스왑.

**Tech Stack:** TypeScript(strict), React 19(peer), Vite 6 라이브러리 모드, vite-plugin-dts, Vitest 3 + Testing Library, Storybook 9(react-vite), 헤드리스 Chrome 렌더 검증

**전체 페이즈 로드맵** (이 문서는 Phase 1만):
- Phase 1(이 계획): 스캐폴드 + styles + Icon/ThemeProvider/Button + 품질 도구
- Phase 2: Tier 1 나머지 11종 / Phase 3: Tier 2 10종 / Phase 4: Tier 3 + 데모 대시보드 / Phase 5: Claude Design "CREFLE Web UI" 동기화
- 스펙: 파운데이션 repo `docs/superpowers/specs/2026-07-08-web-frontend-ds-design.md`

## Global Constraints

- 새 repo 경로: `/Users/rangkim/Documents/Claude/Projects/CREFLE Web Design System` (이하 `$WEB`)
- 파운데이션 repo: `/Users/rangkim/Documents/Claude/Projects/CREFLE Design System` (이하 `$FDN`)
- 패키지명 `@crefle/web-ui`, version `0.1.0`, `"private": true`, `"type": "module"`
- **런타임 의존성 0**: dependencies 비움. react/react-dom은 peerDependencies(`^18.0.0 || ^19.0.0`)
- **컴포넌트 CSS(.module.css)에 raw 색상(hex/rgb/hsl)·임의 px 금지** — 토큰만 참조. 예외: 0px/1px/2px(보더), `@media` 줄. `npm run lint:tokens`가 강제
- 파운데이션 토큰 이름은 tokens.css 원문 그대로 사용: `--primary`, `--primary-hover`, `--primary-press`, `--primary-container`, `--on-primary`, `--surface`, `--surface-container-low/-container/-container-high`, `--on-surface`, `--on-surface-variant`, `--on-surface-muted`, `--outline-variant`, `--semantic-success/error/warning/info/idle`, `--state-hover/focus/press`, `--state-disabled-fill`, `--state-disabled-text`, `--brand-red`, `--brand-charcoal`, `--brand-charcoal-deep`, `--font-sans`, `--font-mono`
- 순수 #FFF/#000 금지(웜 뉴트럴 유지), 레드 단일 액센트, 그림자 최대 2레이어
- 컴포넌트 파일 세트: `<Name>.tsx` + `<Name>.module.css` + `<Name>.stories.tsx` + `<Name>.test.tsx` (`src/components/<Name>/`)
- 커밋: 태스크마다. 메시지 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 트레일러
- git author: `git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit ...`
- 스토리 카피는 한국어 (예: "버튼", "비활성")

---

### Task 1: Repo 스캐폴드 + 빌드/테스트 스모크

**Files:**
- Create: `$WEB/package.json`, `$WEB/tsconfig.json`, `$WEB/vite.config.ts`, `$WEB/.gitignore`, `$WEB/src/index.ts`, `$WEB/src/test/setup.ts`, `$WEB/src/index.test.ts`, `$WEB/README.md`

**Interfaces:**
- Produces: npm 스크립트 `build`/`test`, 패키지 export 맵(`.`, `./css`, `./styles/*`), `src/index.ts`(라이브러리 진입점 — 이후 태스크들이 여기에 export 추가)

- [ ] **Step 1: 디렉토리 + git 초기화**

```bash
mkdir -p "/Users/rangkim/Documents/Claude/Projects/CREFLE Web Design System"
cd "/Users/rangkim/Documents/Claude/Projects/CREFLE Web Design System"
git init -b main
```

- [ ] **Step 2: 파일 작성**

`package.json`:
```json
{
  "name": "@crefle/web-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "sideEffects": ["*.css"],
  "files": ["dist", "styles"],
  "types": "./dist/index.d.ts",
  "module": "./dist/index.js",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./css": "./dist/web-ui.css",
    "./styles/*": "./styles/*"
  },
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint:tokens": "node scripts/check-tokens.mjs",
    "sync-foundation": "bash scripts/sync-foundation.sh",
    "shoot": "bash scripts/shoot.sh"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [react(), dts({ include: ['src'], exclude: ['**/*.test.*', '**/*.stories.*', 'src/test'] })],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'web-ui'
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime']
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}']
  }
})
```

`.gitignore`:
```
node_modules/
dist/
storybook-static/
shots/
.DS_Store
```

`src/index.ts`:
```ts
export const VERSION = '0.1.0'
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// vitest globals가 꺼져 있으면 RTL 자동 cleanup이 동작하지 않는다 — 수동 등록
afterEach(() => cleanup())

// jsdom에는 matchMedia가 없다 — ThemeProvider의 system 감지용 스텁
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false
    })
  })
}
```

`src/index.test.ts`:
```ts
import { expect, test } from 'vitest'
import { VERSION } from './index'

test('패키지 진입점이 로드된다', () => {
  expect(VERSION).toBe('0.1.0')
})
```

`README.md` (아래 ~~~ 안의 내용 그대로 — 내부 ``` 펜스 포함):
~~~markdown
# @crefle/web-ui

CREFLE 웹 프론트엔드 디자인 시스템 — 파운데이션(Stage 1) 위의 첫 분야별 확장.

```ts
import '@crefle/web-ui/styles/index.css' // 토큰 + 폰트 + 테마
import '@crefle/web-ui/css'              // 컴포넌트 스타일
import { Button } from '@crefle/web-ui'
```

- 테마: `<html data-theme="light|dark">` — `ThemeProvider` 사용
- 스펙: `docs/2026-07-08-web-frontend-ds-design.md`
~~~

- [ ] **Step 3: 의존성 설치**

```bash
npm i -D react react-dom @types/react @types/react-dom typescript vite @vitejs/plugin-react vite-plugin-dts vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
Expected: 에러 없이 설치 완료 (peer 경고는 무시 가능)

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test`
Expected: `1 passed` (index.test.ts)

- [ ] **Step 5: 빌드 실행 → 산출물 확인**

Run: `npm run build && ls dist/`
Expected: `dist/index.js`, `dist/index.d.ts` 존재 (CSS는 아직 없음 — 정상)

- [ ] **Step 6: Commit**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "chore: scaffold @crefle/web-ui (vite lib + vitest)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 파운데이션 복사 스크립트 + fonts.css

**Files:**
- Create: `$WEB/scripts/sync-foundation.sh`, `$WEB/styles/fonts.css`
- Create(스크립트 실행 산출): `$WEB/styles/foundation/tokens.css`, `$WEB/styles/foundation/fonts/*.woff2`(6개), `$WEB/styles/foundation/PIN`

**Interfaces:**
- Consumes: `$FDN/tokens.css`, `$FDN/ds-bundle/fonts/*.woff2`
- Produces: `styles/foundation/tokens.css`(파운데이션 토큰 — 수정 금지, 재복사로만 갱신), `styles/fonts.css`(@font-face 6종)

- [ ] **Step 1: sync 스크립트 작성**

`scripts/sync-foundation.sh`:
```bash
#!/usr/bin/env bash
# 파운데이션 DS의 토큰·폰트를 복사하고 커밋 해시를 PIN에 기록한다.
set -euo pipefail
SRC="${FOUNDATION_DIR:-$HOME/Documents/Claude/Projects/CREFLE Design System}"
DST="$(cd "$(dirname "$0")/.." && pwd)/styles/foundation"
mkdir -p "$DST/fonts"
cp "$SRC/tokens.css" "$DST/tokens.css"
cp "$SRC"/ds-bundle/fonts/*.woff2 "$DST/fonts/"
(git -C "$SRC" rev-parse --short HEAD 2>/dev/null || echo unknown) > "$DST/PIN"
echo "foundation synced @ $(cat "$DST/PIN")"
```

- [ ] **Step 2: 실행 → 산출 확인**

Run: `chmod +x scripts/sync-foundation.sh && npm run sync-foundation && ls styles/foundation styles/foundation/fonts && cat styles/foundation/PIN`
Expected: `tokens.css`, `PIN`, fonts 6개(`SpoqaHanSansNeo-{Thin,Light,Regular,Medium,Bold}.woff2`, `MaterialSymbolsRounded.woff2`). PIN에 파운데이션 커밋 해시(예: `4182db3`)

- [ ] **Step 3: fonts.css 작성** (파운데이션 ds-bundle/styles.css의 @font-face를 경로만 바꿔 이식)

`styles/fonts.css`:
```css
/* 폰트 패밀리 토큰 — 파운데이션 ds-bundle/styles.css와 동일 값
   (tokens.css에는 없고 styles.css에 있어서 여기서 정의해야 한다) */
:root {
  --font-sans: 'Spoqa Han Sans Neo', system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

/* Spoqa Han Sans Neo — 파운데이션 번들 폰트 */
@font-face {
  font-family: 'Spoqa Han Sans Neo';
  font-weight: 100;
  font-style: normal;
  font-display: swap;
  src: url('./foundation/fonts/SpoqaHanSansNeo-Thin.woff2') format('woff2');
}
@font-face {
  font-family: 'Spoqa Han Sans Neo';
  font-weight: 300;
  font-style: normal;
  font-display: swap;
  src: url('./foundation/fonts/SpoqaHanSansNeo-Light.woff2') format('woff2');
}
@font-face {
  font-family: 'Spoqa Han Sans Neo';
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  src: url('./foundation/fonts/SpoqaHanSansNeo-Regular.woff2') format('woff2');
}
@font-face {
  font-family: 'Spoqa Han Sans Neo';
  font-weight: 500;
  font-style: normal;
  font-display: swap;
  src: url('./foundation/fonts/SpoqaHanSansNeo-Medium.woff2') format('woff2');
}
@font-face {
  font-family: 'Spoqa Han Sans Neo';
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  src: url('./foundation/fonts/SpoqaHanSansNeo-Bold.woff2') format('woff2');
}
/* Material Symbols Rounded — opsz24/wght400/FILL0 정적 인스턴스 */
@font-face {
  font-family: 'Material Symbols Rounded';
  font-weight: 400;
  font-style: normal;
  font-display: block;
  src: url('./foundation/fonts/MaterialSymbolsRounded.woff2') format('woff2');
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: foundation sync script + bundled fonts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: web-tokens.css (신규 형태 토큰)

**Files:**
- Create: `$WEB/styles/web-tokens.css`

**Interfaces:**
- Produces: 아래 토큰 전부 — 이후 모든 컴포넌트 CSS가 참조. 이름 변경 금지.

- [ ] **Step 1: web-tokens.css 작성** (전체 내용)

```css
/* ============================================================================
   CREFLE Web DS — 형태 토큰 (Stage 2 승격 후보)
   파운데이션 tokens.css 위에 얹는 웹 전용 레이어.
   여러 분야에서 공통임이 입증되면 파운데이션으로 승격한다.
   ============================================================================ */
:root {
  /* -------- Type scale — M3 구조, Spoqa Han Sans Neo --------
     사용: font: var(--type-…); letter-spacing: var(--type-…-tracking); */
  --type-display-lg: 700 45px/52px var(--font-sans);
  --type-display-lg-tracking: -0.02em;
  --type-display-sm: 700 36px/44px var(--font-sans);
  --type-display-sm-tracking: -0.02em;
  --type-headline-lg: 700 28px/36px var(--font-sans);
  --type-headline-lg-tracking: -0.02em;
  --type-headline-sm: 700 24px/32px var(--font-sans);
  --type-headline-sm-tracking: -0.02em;
  --type-title-lg: 500 20px/28px var(--font-sans);
  --type-title-lg-tracking: -0.02em;
  --type-title-sm: 500 16px/24px var(--font-sans);
  --type-title-sm-tracking: -0.01em;
  --type-body-lg: 400 16px/24px var(--font-sans);
  --type-body-lg-tracking: 0;
  --type-body-sm: 400 14px/20px var(--font-sans);
  --type-body-sm-tracking: 0;
  --type-label-lg: 500 14px/20px var(--font-sans);
  --type-label-lg-tracking: 0;
  --type-label-sm: 500 12px/16px var(--font-sans);
  --type-label-sm-tracking: 0.01em;

  /* -------- Spacing — 4px 기반 -------- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
  --space-9: 48px;
  --space-10: 64px;
  --space-11: 80px;
  --space-12: 96px;

  /* -------- Control heights — 폼 컨트롤 공통 높이 (Button/TextField/Select…) -------- */
  --control-height-sm: 32px;
  --control-height-md: 40px;
  --control-height-lg: 48px;

  /* -------- Radius -------- */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 999px;

  /* -------- Elevation — 절제된 최대 2레이어 (라이트 기준) -------- */
  --elevation-0: none;
  --elevation-1: 0 1px 2px rgba(31, 33, 37, 0.06), 0 1px 3px rgba(31, 33, 37, 0.10);
  --elevation-2: 0 2px 6px rgba(31, 33, 37, 0.10), 0 1px 2px rgba(31, 33, 37, 0.06);
  --elevation-3: 0 6px 16px rgba(31, 33, 37, 0.12);
  --elevation-4: 0 10px 24px rgba(31, 33, 37, 0.14);
  --elevation-5: 0 16px 32px rgba(31, 33, 37, 0.16);

  /* -------- Motion -------- */
  --motion-fast: 100ms;
  --motion-base: 200ms;
  --motion-slow: 300ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.3, 0, 0, 1);

  /* -------- Color 보강 — 파운데이션 Stage 2 승격 후보 -------- */
  --on-primary-container: #7D161B; /* = --brand-red-deep. tonal 표면 위 텍스트 (light 8.1:1) */

  /* -------- State layers 보강 (파운데이션 --state-*는 레드 기준) -------- */
  --state-hover-neutral: rgba(27, 27, 31, 0.08);
  --state-press-neutral: rgba(27, 27, 31, 0.12);
  --state-hover-on-primary: rgba(255, 255, 255, 0.08);
  --state-press-on-primary: rgba(255, 255, 255, 0.12);
  --focus-ring: 0 0 0 2px var(--surface), 0 0 0 4px var(--primary);

  /* -------- Chart — 레드 1번 + 차콜 명도 변주 (무지개 금지) -------- */
  --chart-1: var(--primary);
  --chart-2: #3E4146;
  --chart-3: #63666D;
  --chart-4: #8A8D94;
  --chart-5: #B4B6BC;
  --chart-grid: var(--outline-variant);
}
```

- [ ] **Step 2: 문법 검증** (브라우저 파스 오류 없는지 — Task 4의 토큰 시트에서 최종 시각 확인)

Run: `node -e "const s=require('fs').readFileSync('styles/web-tokens.css','utf8'); const o=(s.match(/{/g)||[]).length, c=(s.match(/}/g)||[]).length; if(o!==c) throw new Error('brace mismatch'); console.log('ok', o, 'blocks balanced')"`
Expected: `ok … blocks balanced`

- [ ] **Step 3: Commit**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: web form tokens (type scale, spacing, radius, elevation, motion, chart)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: themes.css + index.css + 토큰 시트 시각 검증

**Files:**
- Create: `$WEB/styles/themes.css`, `$WEB/styles/index.css`, `$WEB/docs/token-sheet.html`

**Interfaces:**
- Consumes: foundation/tokens.css의 시맨틱 변수 전부, web-tokens.css
- Produces: `styles/index.css`(소비자 단일 진입점), `[data-theme='dark']` 요소 스코프 오버라이드(중첩 요소에도 적용 가능 — 토큰 시트가 이 성질 사용)

- [ ] **Step 1: themes.css 작성** (전체 내용 — 다크 값은 OnMyFactory 검증 팔레트 기반)

```css
/* ============================================================================
   CREFLE Web DS — 테마
   :root(파운데이션) = 라이트 기본값. 여기는 다크 오버라이드만 정의한다.
   [data-theme='dark']는 요소 스코프 — <html>뿐 아니라 임의 컨테이너에도 적용 가능.
   시맨틱 컬러(--semantic-*)는 라이트/다크 고정(파운데이션 규칙).
   ============================================================================ */
:root {
  color-scheme: light;
}

[data-theme='dark'] {
  color-scheme: dark;

  /* Surfaces — OnMyFactory 다크 검증 값 계열. 순수 검정 금지 */
  --surface: #1B1D21;
  --surface-container-low: #22252A;
  --surface-container: #2A2D33;
  --surface-container-high: #33363B;

  --on-surface: #F4F3F7;
  --on-surface-variant: #C4C6CC;
  --on-surface-muted: #8A8D94;
  --outline-variant: #43464D;

  /* Primary — 레드 단일 액센트 유지. hover는 다크에서 밝게 */
  --primary-hover: #D8434A;
  --primary-press: #A81E24;
  --primary-container: #46262A;
  --on-primary-container: #F4DDDE; /* = --brand-red-soft. 다크 tonal 텍스트 (10.3:1, WCAG AAA) */

  /* State layers — 뉴트럴을 밝은 색 기준으로 반전 */
  --state-hover: rgba(216, 67, 74, 0.10);
  --state-focus: rgba(216, 67, 74, 0.14);
  --state-press: rgba(216, 67, 74, 0.14);
  --state-disabled-fill: rgba(244, 243, 247, 0.12);
  --state-disabled-text: rgba(244, 243, 247, 0.38);
  --state-hover-neutral: rgba(244, 243, 247, 0.08);
  --state-press-neutral: rgba(244, 243, 247, 0.12);

  /* Elevation — 다크는 그림자 약화 + 표면 사다리로 위계 표현 */
  --elevation-1: 0 1px 2px rgba(0, 0, 0, 0.35);
  --elevation-2: 0 2px 6px rgba(0, 0, 0, 0.40);
  --elevation-3: 0 6px 16px rgba(0, 0, 0, 0.45);
  --elevation-4: 0 10px 24px rgba(0, 0, 0, 0.50);
  --elevation-5: 0 16px 32px rgba(0, 0, 0, 0.55);

  /* Chart — 명도 반전 사다리 */
  --chart-2: #E2E3E7;
  --chart-3: #B9BBC1;
  --chart-4: #8A8D94;
  --chart-5: #5C6067;
}
```

- [ ] **Step 2: index.css 작성**

```css
/* @crefle/web-ui 스타일 진입점 — 이 한 파일만 import하면 된다 */
@import './foundation/tokens.css';
@import './fonts.css';
@import './web-tokens.css';
@import './themes.css';

body {
  margin: 0;
  background: var(--surface);
  color: var(--on-surface);
  font: var(--type-body-lg);
  letter-spacing: var(--type-body-lg-tracking);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: 토큰 시트 작성** — 라이트/다크 나란히 시각 검증용

`docs/token-sheet.html`:
```html
<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="../styles/index.css">
<style>
  body { display: grid; grid-template-columns: 1fr 1fr; margin: 0 }
  .panel { padding: var(--space-6); background: var(--surface); color: var(--on-surface) }
  .sw { display: flex; align-items: center; gap: var(--space-2); margin: var(--space-1) 0; font: var(--type-body-sm) }
  .sw i { width: 28px; height: 28px; border-radius: var(--radius-sm); border: 1px solid var(--outline-variant) }
  .card { background: var(--surface-container-low); border: 1px solid var(--outline-variant);
          border-radius: var(--radius-md); padding: var(--space-4); margin: var(--space-2) 0 }
  h1 { font: var(--type-headline-sm); letter-spacing: var(--type-headline-sm-tracking) }
  h2 { font: var(--type-title-sm); letter-spacing: var(--type-title-sm-tracking); color: var(--on-surface-variant) }
</style></head><body>
<script>
  const TOKENS = ['--primary','--primary-container','--surface','--surface-container-low','--surface-container',
    '--surface-container-high','--on-surface','--on-surface-variant','--on-surface-muted','--outline-variant',
    '--semantic-success','--semantic-error','--semantic-warning','--semantic-info','--semantic-idle',
    '--chart-1','--chart-2','--chart-3','--chart-4','--chart-5'];
  for (const theme of ['light','dark']) {
    const p = document.createElement('div');
    p.className = 'panel'; p.dataset.theme = theme;
    p.innerHTML = `<h1>CREFLE Web DS — ${theme}</h1>
      <div class="card"><h2>Elevation 1~3 card / type scale</h2>
        <div style="font:var(--type-display-sm);letter-spacing:var(--type-display-sm-tracking)">디스플레이</div>
        <div style="font:var(--type-title-lg);letter-spacing:var(--type-title-lg-tracking)">타이틀 · 스마트 팩토리</div>
        <div style="font:var(--type-body-sm)">본문 — AI Agent 자동화 관리</div>
        <div style="font:var(--type-label-sm);letter-spacing:var(--type-label-sm-tracking);color:var(--on-surface-muted)">LABEL</div>
      </div>` +
      TOKENS.map(t => `<div class="sw"><i style="background:var(${t})"></i>${t}</div>`).join('');
    document.body.appendChild(p);
  }
</script></body></html>
```

- [ ] **Step 4: 렌더 → 시각 검증** (Chrome 헤드리스, 파운데이션 shoot.sh와 동일 패턴)

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --force-device-scale-factor=2 --window-size=1100,1300 --virtual-time-budget=4000 \
  --screenshot=/tmp/token-sheet.png "file://$(pwd)/docs/token-sheet.html" 2>/dev/null
```
Expected: 스크린샷을 Read로 열어 확인 — 좌 라이트(웜 화이트 #FBF8FD)/우 다크(#1B1D21), Spoqa 폰트 적용, 스와치 20종 모두 채색(빈 칸 = 토큰 미정의 버그), 다크 패널에서 primary-container·outline·chart 사다리가 어둡게 반전되었는지

- [ ] **Step 5: Commit**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: light/dark themes + styles entry + token sheet

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 토큰 준수 lint (check-tokens.mjs)

**Files:**
- Create: `$WEB/scripts/check-tokens.mjs`

**Interfaces:**
- Produces: `npm run lint:tokens` — `src/**/*.module.css`에서 raw 색상·임의 px 검출 시 exit 1

- [ ] **Step 1: 스크립트 작성**

```js
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
```

- [ ] **Step 2: 위반 픽스처로 실패 확인**

```bash
mkdir -p src/components/_lintcheck
printf '.x { color: #ff0000; padding: 13px }\n' > src/components/_lintcheck/T.module.css
npm run lint:tokens; echo "exit=$?"
```
Expected: raw 색상 1건 + 임의 px 1건 출력, `exit=1`

- [ ] **Step 3: 픽스처 제거 → 통과 확인**

```bash
rm -r src/components/_lintcheck && npm run lint:tokens
```
Expected: `token lint OK`, exit 0

- [ ] **Step 4: Commit**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: token compliance lint for component CSS

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: cx 유틸 + ThemeProvider / useTheme

**Files:**
- Create: `$WEB/src/utils/cx.ts`, `$WEB/src/utils/cx.test.ts`, `$WEB/src/theme/ThemeProvider.tsx`, `$WEB/src/theme/ThemeProvider.test.tsx`
- Modify: `$WEB/src/index.ts`

**Interfaces:**
- Produces:
  - `cx(...parts: Array<string | false | null | undefined>): string`
  - `type Theme = 'light' | 'dark'`
  - `ThemeProvider({ defaultTheme?: Theme | 'system', children }): JSX` — `<html>`에 `data-theme` 설정
  - `useTheme(): { theme: Theme; setTheme: (t: Theme) => void }` — Provider 밖에서 호출 시 throw

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/cx.test.ts`:
```ts
import { expect, test } from 'vitest'
import { cx } from './cx'

test('truthy 클래스만 이어붙인다', () => {
  expect(cx('a', false, 'b', null, undefined, 'c')).toBe('a b c')
})
```

`src/theme/ThemeProvider.test.tsx`:
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeProvider'

function Toggle() {
  const { theme, setTheme } = useTheme()
  return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme}</button>
}

test('defaultTheme이 <html data-theme>에 반영된다', () => {
  render(<ThemeProvider defaultTheme="dark"><div>x</div></ThemeProvider>)
  expect(document.documentElement.dataset.theme).toBe('dark')
})

test('setTheme으로 테마가 전환된다', async () => {
  render(<ThemeProvider defaultTheme="light"><Toggle /></ThemeProvider>)
  await userEvent.click(screen.getByRole('button', { name: 'light' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(screen.getByRole('button', { name: 'dark' })).toBeInTheDocument()
})

test('system은 matchMedia로 해석된다 (jsdom 스텁 = light)', () => {
  render(<ThemeProvider defaultTheme="system"><div>x</div></ThemeProvider>)
  expect(document.documentElement.dataset.theme).toBe('light')
})

test('Provider 밖 useTheme은 throw', () => {
  expect(() => render(<Toggle />)).toThrow(/ThemeProvider/)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `cx`/`ThemeProvider` 모듈 없음

- [ ] **Step 3: 구현**

`src/utils/cx.ts`:
```ts
/** truthy한 클래스명만 공백으로 이어붙인다 (외부 의존성 없는 clsx 대체) */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
```

`src/theme/ThemeProvider.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemTheme(): Theme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return 'light'
}

export interface ThemeProviderProps {
  defaultTheme?: Theme | 'system'
  children: ReactNode
}

export function ThemeProvider({ defaultTheme = 'system', children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() =>
    defaultTheme === 'system' ? systemTheme() : defaultTheme
  )
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme은 <ThemeProvider> 안에서만 사용할 수 있습니다')
  return ctx
}
```

`src/index.ts` (전체 교체):
```ts
export const VERSION = '0.1.0'
export { cx } from './utils/cx'
export { ThemeProvider, useTheme } from './theme/ThemeProvider'
export type { Theme, ThemeProviderProps } from './theme/ThemeProvider'
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: 전부 PASS (cx 1 + ThemeProvider 4 + index 1)

- [ ] **Step 5: Commit**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: cx util + ThemeProvider/useTheme

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Icon 컴포넌트

**Files:**
- Create: `$WEB/src/components/Icon/Icon.tsx`, `Icon.module.css`, `Icon.test.tsx` (stories는 Task 8에서 Storybook과 함께)
- Modify: `$WEB/src/index.ts`

**Interfaces:**
- Consumes: `cx`
- Produces: `Icon({ name: string; size?: 20 | 24 | 40 | 48; label?: string } & HTMLAttributes<HTMLSpanElement>)` — Material Symbols Rounded 리가처. `label` 없으면 `aria-hidden`, 있으면 `role="img"` + `aria-label`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/Icon/Icon.test.tsx`:
```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Icon } from './Icon'

test('장식용(기본)은 aria-hidden', () => {
  const { container } = render(<Icon name="factory" />)
  const el = container.querySelector('span')!
  expect(el).toHaveAttribute('aria-hidden', 'true')
  expect(el).toHaveTextContent('factory')
})

test('label이 있으면 img 롤 + aria-label', () => {
  render(<Icon name="warning" label="경고" />)
  const el = screen.getByRole('img', { name: '경고' })
  expect(el).not.toHaveAttribute('aria-hidden')
})

test('size가 fontSize로 반영된다', () => {
  const { container } = render(<Icon name="factory" size={40} />)
  expect(container.querySelector('span')!.style.fontSize).toBe('40px')
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — Icon 모듈 없음

- [ ] **Step 3: 구현**

`src/components/Icon/Icon.module.css`:
```css
.icon {
  font-family: 'Material Symbols Rounded';
  font-weight: normal;
  font-style: normal;
  line-height: 1;
  display: inline-block;
  vertical-align: middle;
  letter-spacing: normal;
  text-transform: none;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  user-select: none;
  font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}
```

`src/components/Icon/Icon.tsx`:
```tsx
import type { HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'
import styles from './Icon.module.css'

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  /** Material Symbols 아이콘 이름 (리가처) — 예: 'factory', 'smart_toy' */
  name: string
  size?: 20 | 24 | 40 | 48
  /** 의미 전달용 라벨. 없으면 장식용(aria-hidden) */
  label?: string
}

export function Icon({ name, size = 24, label, className, style, ...rest }: IconProps) {
  return (
    <span
      className={cx(styles.icon, className)}
      style={{ fontSize: size, ...style }}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      {...rest}
    >
      {name}
    </span>
  )
}
```

`src/index.ts`에 추가:
```ts
export { Icon } from './components/Icon/Icon'
export type { IconProps } from './components/Icon/Icon'
```

- [ ] **Step 4: 통과 확인 + 토큰 lint**

Run: `npm test && npm run lint:tokens`
Expected: 전부 PASS + `token lint OK`

- [ ] **Step 5: Commit**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: Icon (Material Symbols Rounded wrapper)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Storybook 설치 + 테마 툴바 + Icon 스토리

**Files:**
- Create: `$WEB/.storybook/main.ts`, `$WEB/.storybook/preview.ts`, `$WEB/src/components/Icon/Icon.stories.tsx`
- Modify: `$WEB/package.json` (storybook 스크립트 — init이 추가)

**Interfaces:**
- Produces: `npm run storybook`(dev) / `npm run build-storybook`(정적 빌드 — Task 10 렌더 검증이 사용), 툴바 theme 토글(globals.theme → `<html data-theme>`)

- [ ] **Step 1: Storybook 설치**

```bash
npx storybook@latest init --yes
```
Expected: `.storybook/` 생성, package.json에 `storybook`/`build-storybook` 스크립트 추가. react-vite 프레임워크 자동 감지

- [ ] **Step 2: 예제 제거 + 설정 교체**

```bash
rm -rf src/stories
```

`.storybook/main.ts` (전체 교체):
```ts
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: []
}
export default config
```
(init이 넣은 addon이 있으면 addons 배열은 유지해도 무방 — stories 글롭만 반드시 위와 같게)

`.storybook/preview.ts` (전체 교체):
```ts
import type { Preview } from '@storybook/react'
import '../styles/index.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: '라이트/다크 테마',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true }
    }
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.theme = context.globals.theme as string
      return Story()
    }
  ]
}
export default preview
```

- [ ] **Step 3: Icon 스토리 작성**

`src/components/Icon/Icon.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Icon } from './Icon'

const meta = {
  title: 'Foundation/Icon',
  component: Icon,
  args: { name: 'factory', size: 24 }
} satisfies Meta<typeof Icon>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Gallery: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {['factory', 'smart_toy', 'monitoring', 'warning', 'settings', 'search'].map((n) => (
        <Icon key={n} name={n} size={40} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: 정적 빌드로 검증**

Run: `npm run build-storybook`
Expected: `storybook-static/` 생성, 빌드 에러 없음

- [ ] **Step 5: Commit**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: storybook with theme toolbar + Icon stories

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Button (패턴 확립 컴포넌트)

**Files:**
- Create: `$WEB/src/components/Button/Button.tsx`, `Button.module.css`, `Button.test.tsx`, `Button.stories.tsx`
- Modify: `$WEB/src/index.ts`

**Interfaces:**
- Consumes: `cx`, web-tokens/테마 토큰
- Produces:
  - `type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text'`, `type ButtonSize = 'sm' | 'md' | 'lg'`
  - `Button({ variant?, size?, loading?, leadingIcon?, trailingIcon? } & ButtonHTMLAttributes<HTMLButtonElement>)`, `forwardRef<HTMLButtonElement>`
  - 이 4파일 구조·state layer 패턴·스토리 Matrix 패턴이 Phase 2+ 전 컴포넌트의 표준

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/Button/Button.test.tsx`:
```tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'
import styles from './Button.module.css'

test('children을 렌더하고 클릭을 전달한다', async () => {
  const onClick = vi.fn()
  render(<Button onClick={onClick}>저장</Button>)
  await userEvent.click(screen.getByRole('button', { name: '저장' }))
  expect(onClick).toHaveBeenCalledOnce()
})

test('variant/size 클래스가 적용된다 (기본 filled/md)', () => {
  render(<Button variant="outlined" size="lg">버튼</Button>)
  const el = screen.getByRole('button')
  expect(el.className).toContain(styles.outlined)
  expect(el.className).toContain(styles.lg)
})

test('disabled면 클릭이 차단된다', async () => {
  const onClick = vi.fn()
  render(<Button disabled onClick={onClick}>버튼</Button>)
  await userEvent.click(screen.getByRole('button'))
  expect(onClick).not.toHaveBeenCalled()
})

test('loading이면 aria-busy + 비활성 + 스피너', () => {
  render(<Button loading>버튼</Button>)
  const el = screen.getByRole('button')
  expect(el).toHaveAttribute('aria-busy', 'true')
  expect(el).toBeDisabled()
  expect(el.querySelector(`.${styles.spinner}`)).not.toBeNull()
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — Button 모듈 없음

- [ ] **Step 3: 구현**

`src/components/Button/Button.module.css`:
```css
.button {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 0;
  border-radius: var(--radius-full);
  font: var(--type-label-lg);
  letter-spacing: var(--type-label-lg-tracking);
  cursor: pointer;
  outline: none;
  transition: box-shadow var(--motion-fast) var(--ease-standard);
}

/* 상태 레이어 — 배경을 건드리지 않고 오버레이만 얹는다 (M3 규칙) */
.button::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  transition: background var(--motion-fast) var(--ease-standard);
  pointer-events: none;
}

.button:focus-visible {
  box-shadow: var(--focus-ring);
}

/* -------- sizes -------- */
.sm { height: var(--control-height-sm); padding: 0 var(--space-3); font: var(--type-label-sm); letter-spacing: var(--type-label-sm-tracking) }
.md { height: var(--control-height-md); padding: 0 var(--space-4) }
.lg { height: var(--control-height-lg); padding: 0 var(--space-5) }

/* -------- variants -------- */
.filled { background: var(--primary); color: var(--on-primary) }
.filled:hover::before { background: var(--state-hover-on-primary) }
.filled:active::before { background: var(--state-press-on-primary) }

.tonal { background: var(--primary-container); color: var(--on-primary-container) }
.tonal:hover::before { background: var(--state-hover) }
.tonal:active::before { background: var(--state-press) }

.outlined { background: transparent; color: var(--primary); box-shadow: inset 0 0 0 1px var(--outline-variant) }
.outlined:hover::before { background: var(--state-hover) }
.outlined:active::before { background: var(--state-press) }
.outlined:focus-visible { box-shadow: inset 0 0 0 1px var(--outline-variant), var(--focus-ring) }

.text { background: transparent; color: var(--primary) }
.text:hover::before { background: var(--state-hover) }
.text:active::before { background: var(--state-press) }

/* -------- disabled / loading -------- */
.button:disabled {
  cursor: default;
  color: var(--state-disabled-text);
}
.filled:disabled, .tonal:disabled { background: var(--state-disabled-fill) }
.outlined:disabled { box-shadow: inset 0 0 0 1px var(--state-disabled-fill) }
.button:disabled::before { background: transparent }

.spinner {
  width: 1em;
  height: 1em;
  border-radius: var(--radius-full);
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }
```

`src/components/Button/Button.tsx`:
```tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './Button.module.css'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** true면 스피너 표시 + 비활성 (aria-busy) */
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'filled', size = 'md', loading = false, leadingIcon, trailingIcon,
    disabled, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cx(styles.button, styles[variant], styles[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : leadingIcon}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  )
})
```

`src/index.ts`에 추가:
```ts
export { Button } from './components/Button/Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button/Button'
```

- [ ] **Step 4: 통과 확인 + 토큰 lint + 빌드**

Run: `npm test && npm run lint:tokens && npm run build && ls dist/`
Expected: 전부 PASS / `token lint OK` / `dist/web-ui.css` 생성 확인 (CSS Modules가 번들에 포함)

- [ ] **Step 5: 스토리 작성**

`src/components/Button/Button.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { Icon } from '../Icon/Icon'

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: '버튼', variant: 'filled', size: 'md' }
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['filled', 'tonal', 'outlined', 'text'] as const).map((v) => (
        <div key={v} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <Button key={s} variant={v} size={s}>버튼</Button>
          ))}
          <Button variant={v} leadingIcon={<Icon name="add" size={20} />}>추가</Button>
          <Button variant={v} disabled>비활성</Button>
          <Button variant={v} loading>로딩</Button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Storybook 빌드 확인 → Commit**

```bash
npm run build-storybook
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: Button — pattern-setting component (4-file set, state layers)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: 렌더 검증 하네스 (shoot.sh) + Button 시각 검증

**Files:**
- Create: `$WEB/scripts/shoot.sh`

**Interfaces:**
- Produces: `npm run shoot -- <story-id> [light|dark] [WxH]` → `shots/<story-id>-<theme>.png`. Phase 2+ 모든 컴포넌트의 시각 검증 표준

- [ ] **Step 1: shoot.sh 작성**

```bash
#!/usr/bin/env bash
# Storybook 정적 빌드의 스토리를 헤드리스 Chrome으로 스크린샷 (라이트/다크)
# 사용: npm run shoot -- components-button--matrix dark 1200x800
set -euo pipefail
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STORY="${1:?usage: shoot.sh <story-id> [light|dark] [WxH]}"
THEME="${2:-light}"
SIZE="${3:-1200x800}"
OUT="$ROOT/shots/${STORY//\//-}-$THEME.png"
mkdir -p "$ROOT/shots"
[ -d "$ROOT/storybook-static" ] || { echo "run npm run build-storybook first" >&2; exit 1; }
URL="file://$ROOT/storybook-static/iframe.html?id=$STORY&globals=theme:$THEME"
# 참고: Storybook 정적 빌드는 ES 모듈로 번들되며, Chromium은 file:// 출처에서
# 모듈 스크립트 로드를 CORS 정책으로 차단한다. 로컬 정적 렌더에 한해 플래그로 우회.
"$CHROME" --headless=new --disable-web-security --allow-file-access-from-files \
  --force-device-scale-factor=2 --window-size="${SIZE/x/,}" \
  --virtual-time-budget=4000 --screenshot="$OUT" "$URL" 2>/dev/null
echo "$OUT"
```

- [ ] **Step 2: Button Matrix 라이트/다크 촬영**

```bash
chmod +x scripts/shoot.sh
npm run build-storybook
npm run shoot -- components-button--matrix light
npm run shoot -- components-button--matrix dark
```
Expected: `shots/components-button--matrix-light.png`, `…-dark.png` 생성

- [ ] **Step 3: 시각 검사** — 두 PNG를 Read로 열어 확인:
  - 라이트: 웜 화이트 배경, filled=레드/흰 텍스트, tonal=소프트 레드 배경/딥 레드 텍스트, outlined/text=레드 텍스트, 비활성=회색, 로딩 스피너 보임
  - 다크: #1B1D21 배경, 레드 액센트 유지, 비활성/보더가 어둡게 반전, 대비 충분
  - Spoqa 폰트 적용(시스템 폰트 폴백이면 폰트 경로 버그)
  - 문제 발견 시 수정 → 재촬영 → 통과할 때까지

- [ ] **Step 4: Commit**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: headless-chrome render harness + Button visual verification

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: 스펙 복사 + 최종 게이트

**Files:**
- Create: `$WEB/docs/2026-07-08-web-frontend-ds-design.md` (스펙 복사본)

**Interfaces:**
- Consumes: 지금까지의 전부
- Produces: Phase 1 완료 상태 — Phase 2 계획의 출발점

- [ ] **Step 1: 스펙 복사**

```bash
cp "/Users/rangkim/Documents/Claude/Projects/CREFLE Design System/docs/superpowers/specs/2026-07-08-web-frontend-ds-design.md" docs/
```

- [ ] **Step 2: 전체 게이트 일괄 실행**

Run: `npm test && npm run lint:tokens && npm run build && npm run build-storybook`
Expected: 모두 성공 (테스트 12개 내외 전부 PASS)

- [ ] **Step 3: Commit + 태그**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "docs: import design spec; phase 1 complete

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git tag phase1
```

---

## Phase 1 실행 후 최종 리뷰 반영 (commit f4443d3)

전 태스크 완료 후 전체 브랜치 최종 리뷰(With fixes)에서 나온 배치 수정 — 재실행 시 이 상태가 기준:
- **--primary-text 토큰**: 다크에서 레드 텍스트 3.04:1 → #E8878B(6.8:1). web-tokens `:root`는 `var(--primary)`, 다크 오버라이드는 themes.css. Button outlined/text가 사용
- **Button `type="button"` 기본값** (+테스트 1) — form 우발 제출 방지. 테스트 총 14개
- **typecheck 게이트**: `tsc --noEmit` 스크립트 + tsconfig include에 `.storybook` + 통합 `check` 스크립트
- **토큰 존재성 lint**: check-tokens.mjs가 미정의 `var(--…)` 참조도 검출 (주석 제거 후 정의/참조 대조)
- **스토리 import 소스**: `@storybook/react` → `@storybook/react-vite` (직접 의존성)
- **shoot.sh**: `--disable-web-security` 제거(불필요 입증), `--run-all-compositor-stages-before-draw` 추가(스크린샷 페인트 레이스 완화)
- Phase 2로 이월: `--outline` 토큰(첫 폼 컨트롤 전 필수, WCAG 1.4.11), reduced-motion 패턴, ThemeProvider 시스템 테마 리스너, shoot.sh 재시도 래퍼. 파운데이션 업스트림 보고: `--on-surface-muted` 4.26:1

## Self-Review (작성 후 점검 완료)

1. **스펙 커버리지**: Phase 1 범위(스캐폴드·styles·패턴 3종·품질 도구)는 전부 태스크에 매핑. 컴포넌트 24종·데모·동기화는 Phase 2~5로 명시적 이월.
2. **Placeholder 스캔**: TBD/TODO 없음. 모든 코드 스텝에 전체 코드 포함.
3. **타입 일관성**: `cx` 시그니처(T6)를 T7/T9가 동일하게 사용. `styles[variant]`는 ButtonVariant 4값 = .module.css 클래스명 4개와 일치. `--state-hover-on-primary`(T3 정의)를 T9가 참조. shoot.sh의 `globals=theme:…`는 T8 preview globalTypes와 일치.
