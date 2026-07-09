# CREFLE Web DS — Phase 3 구현 계획 (Tier 2 10종)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Phase 1-2 위에 Tier 2 컴포넌트 10종(Table, StatCard, Progress+Gauge, AlertBanner, Toast, Navigation[Sidebar+Topbar], Breadcrumb, EmptyState, Skeleton, SearchInput)을 라이트/다크·접근성·토큰 준수·렌더 검증을 갖춰 구현한다.

**Architecture:** Phase 2와 동일. 각 컴포넌트 4파일 세트, 완전한 스펙은 `docs/superpowers/specs/phase3-components/NN-*.md`. 공유 토큰은 Task 0. 런타임 의존성 0(게이지/차트=자체 SVG, Toast=popover top-layer + z-token, 위치계산=CSS/네이티브).

**시작점:** repo `/Users/rangkim/Documents/Claude/Projects/CREFLE Web Design System`, tag `phase2` (9a297d6). 관례: `docs/component-conventions.md`.

## Global Constraints
- Phase 2와 동일 (컴포넌트 4파일 세트 · `.module.css` 토큰 전용, px 0/1/2 · 런타임 의존성 0 · rest 관례 · reduced-motion 유사요소 포함 · 접근성 AA · 한국어 스토리 · `components-<name>--matrix` 스토리).
- 게이트(컴포넌트): `npm run typecheck && npm test && npm run lint:tokens && npm run build && npm run build-storybook` + `npm run shoot`로 라이트/다크 렌더 검증.
- 커밋 트레일러 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`, author RangKim <jg.kim@crefle.com>.
- 재사용: Table→Checkbox, AlertBanner/Toast/SearchInput→IconButton, EmptyState→Button+Icon, SearchInput→TextField 패턴, Navigation→Icon/IconButton (전부 Phase 1-2 존재).

---

### Task 0: 공유 토큰 (선행)

**Files:** Modify `styles/web-tokens.css` (라이트/테마무관), `styles/themes.css` (다크). foundation/tokens.css 수정 금지.

**Produces (이름 고정):**
- `--semantic-success-text` — up-delta/성공 텍스트 (surface 위 AA ≥4.5:1)
- `--z-toast` — 토스트 스택 z-index
- `--sidebar-width`, `--sidebar-width-collapsed` — 사이드바 폭
- `--skeleton-base`, `--skeleton-shine` — 스켈레톤 시머 (장식, AA 비적용)

- [ ] **Step 1: web-tokens.css :root 추가**
```css
  /* -------- Semantic 성공 텍스트 (--semantic-error-text 형제) -------- */
  --semantic-success-text: #0E5223;   /* light: #FBF8FD 위 8.8:1 (Step 3 검증) */
  /* -------- Z-index -------- */
  --z-toast: 1100;
  /* -------- Layout -------- */
  --sidebar-width: 256px;
  --sidebar-width-collapsed: 72px;
  /* -------- Skeleton 시머 (비-텍스트 장식) -------- */
  --skeleton-base: #E6E4EA;
  --skeleton-shine: #F3F1F7;
```
- [ ] **Step 2: themes.css `[data-theme='dark']` 추가**
```css
  --semantic-success-text: #A6D9B6;   /* dark: #1B1D21 위 ~8.7:1 */
  --skeleton-base: #2E3137;
  --skeleton-shine: #3B3E45;
```
(`--z-toast`, `--sidebar-width*`는 테마 무관 → 다크 오버라이드 없음)

- [ ] **Step 3: 대비 검증** — `--semantic-success-text` light(vs #FBF8FD)·dark(vs #1B1D21) ≥4.5:1 계산. 미달 시 조정. 스켈레톤 토큰은 장식이라 대비 요건 없음(단 다크 순수검정 금지 확인).
- [ ] **Step 4: 게이트 + 커밋**
Run: `npm run lint:tokens && npm test && npm run build` → OK / 107 유지 / 빌드 성공.
```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: phase 3 shared tokens (semantic-success-text, z-toast, sidebar widths, skeleton shimmer)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Tasks 1–10: 컴포넌트 (공통 절차 = Phase 2와 동일)
각 태스크: 스펙 파일(`NN-*.md`) 읽기 → 수용 테스트 작성(RED) → 구현(GREEN, 관례·토큰 준수) → index.ts export → 스토리(Matrix) → 게이트 → `shoot` 라이트/다크 렌더 검증 → 커밋. 스펙에 없는 신규 토큰 필요 시 중단·보고.

### Task 1: Table
- 스펙 `01-Table.md` (테스트 8). 재사용: Checkbox. 정렬(aria-sort 3-상태, 제어/비제어) · 행 선택(select-all indeterminate) · 밀도 · sticky 헤더 · zebra/hover/선택 셀 배경 · 제네릭 `Table<T>`. Story `components-table--matrix`.

### Task 2: StatCard
- 스펙 `02-StatCard.md` (테스트 7). New token: `--semantic-success-text`. 값+델타(▲▼ success/error/neutral)+스파크라인 슬롯. Story `components-statcard--matrix`.

### Task 3: Progress (+ Gauge)
- 스펙 `03-Progress.md` (테스트 11). Progress(선형, determinate/indeterminate) + Gauge(원형 SVG). 임계값 시맨틱 컬러. role=progressbar. Story `components-progress--matrix`. Export Progress + Gauge.

### Task 4: AlertBanner
- 스펙 `04-AlertBanner.md` (테스트 8). 재사용: IconButton. 시맨틱 4종(container 토큰) + 닫기 + 액션. role=alert/status. Story `components-alertbanner--matrix`.

### Task 5: Toast
- 스펙 `05-Toast.md` (테스트 6). New token: `--z-toast`. ToastProvider + useToast, 자동 소멸(타이머 cleanup, 호버 일시정지), aria-live, popover top-layer(zero-dep), reduced-motion. Story `components-toast--matrix`. Export ToastProvider + useToast + 타입.

### Task 6: Navigation (Sidebar + Topbar)
- 스펙 `06-Navigation.md` (테스트 8). New tokens: `--sidebar-width`, `--sidebar-width-collapsed`. 재사용: Icon/IconButton. 접이식 사이드바(aria-current) + 톱바(브랜드/브레드크럼/액션 슬롯). Story `components-navigation--matrix`. Export Sidebar + SidebarItem + Topbar + 타입.

### Task 7: Breadcrumb
- 스펙 `07-Breadcrumb.md` (테스트 8). items 배열, 구분자(chevron aria-hidden), 현재(aria-current), 오버플로 말줄임. `<nav aria-label>`. Story `components-breadcrumb--matrix`.

### Task 8: EmptyState
- 스펙 `08-EmptyState.md` (테스트 7). 재사용: Button+Icon. 아이콘+제목+설명+액션, 사이즈 sm/md/lg. Story `components-emptystate--matrix`.

### Task 9: Skeleton
- 스펙 `09-Skeleton.md` (테스트 6). New tokens: `--skeleton-base`, `--skeleton-shine`. text/rect/circle + SkeletonText, 시머(reduced-motion 정적 폴백), aria-hidden. Story `components-skeleton--matrix`. Export Skeleton + SkeletonText + 타입.

### Task 10: SearchInput
- 스펙 `10-SearchInput.md` (테스트 8). 재사용: TextField 패턴 + IconButton. search 아이콘 + 클리어 버튼 + onSearch(Enter) + 로딩. type=search. Story `components-searchinput--matrix`.

---

### Task 11: Phase 3 최종 게이트 + 태그
- [ ] `npm run check` 전부 green (테스트 ≈107 + Tier2 수용 테스트 합계).
- [ ] index.ts에 10종(+ 서브컴포넌트 Gauge/Sidebar*/Topbar/SkeletonText/useToast/ToastProvider) export 전수 확인.
- [ ] 커밋 + `git tag phase3`.

## 최종 whole-branch 리뷰
`phase2..HEAD`를 opus로 whole-branch 리뷰(reduced-motion 스윕·토큰 그래프·접근성·컴포넌트 간 일관성). 발견은 fix 배치 후 태그 확정.

## 빌드 순서 / 의존성
Task 0 → 1~10은 **전부 병렬 가능** (Phase 1-2 컴포넌트에만 의존, 상호 의존 없음) → 11(게이트). 파일은 각자 디렉토리 + index.ts는 조립 단계에서 일괄 배선.

## Self-Review
- 스펙 newTokensNeeded 5종 전부 Task 0 집계됨. 10종 전부 태스크 존재. 신규 토큰 정의 위치(라이트=web-tokens, 다크=themes) 명시. Placeholder 없음(코드는 스펙 파일).
