# CREFLE Web DS — Phase 4 구현 계획 (Tier 3 + OnMyFactory 데모)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Tier 3 조립·시각화 컴포넌트 3종(AppShell, Chart[Line/Bar/Pie], PageHeader)을 구현하고, 전체 라이브러리를 실조립한 **OnMyFactory 모니터링 대시보드** 데모를 만든다.

**Architecture:** Phase 1-3와 동일. 각 컴포넌트 4파일 세트, 완전 스펙은 `docs/superpowers/specs/phase4-components/NN-*.md`. **신규 토큰 없음**(전부 기존 토큰 사용 — 스펙 확인됨). 데모는 전체 컴포넌트를 조립한 Storybook 페이지 스토리로, 라이트/다크 렌더 검증.

**시작점:** repo `/Users/rangkim/Documents/Claude/Projects/CREFLE Web Design System`, tag `phase3`. 관례: `docs/component-conventions.md`.

## Global Constraints
- Phase 1-3와 동일 (4파일 세트 · 토큰 전용 px 0/1/2 · 런타임 의존성 0[차트=자체 SVG] · rest 관례 · reduced-motion 유사요소 포함 · 접근성 AA · 한국어 스토리 · `components-<name>--matrix`).
- 게이트(컴포넌트): `npm run typecheck && npm test && npm run lint:tokens && npm run build && npm run build-storybook` + `npm run shoot` 라이트/다크.
- 커밋 트레일러 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`, author RangKim.
- 재사용: AppShell→Sidebar/Topbar(Navigation), PageHeader→Breadcrumb/Tabs/Button.

## Tasks 1–3: 컴포넌트 (공통 절차 = Phase 2-3)
스펙 파일 읽기 → 수용 테스트(RED) → 구현(GREEN, 관례·토큰 준수) → index.ts export → 스토리(Matrix) → 게이트 → shoot 렌더 검증 → 커밋. index.ts는 조립 단계에서 일괄 배선.

### Task 1: AppShell
- 스펙 `01-AppShell.md` (테스트 5). 재사용: Sidebar/Topbar 슬롯. CSS 그리드 T-레이아웃(--sidebar-width 트랙), 접힘 제어/비제어 + useAppShell 컨텍스트, skip-to-content 링크 + `<main>` 랜드마크(단일). 반응형 768px media. Story `components-appshell--matrix`. Export AppShell + useAppShell.

### Task 2: Chart (Line/Bar/Pie)
- 스펙 `02-Chart.md` (테스트 8). 자체 SVG. `<Chart type>` dispatcher + LineChart/BarChart/PieChart. 카테고리 컬러 --chart-1..5, 그리드 --chart-grid, role=img + 데이터 요약 aria-label + 시각숨김 테이블. reduced-motion draw-in 비활성. Story `components-chart--matrix`. Export Chart + LineChart + BarChart + PieChart + 타입.

### Task 3: PageHeader
- 스펙 `03-PageHeader.md` (테스트 7). 재사용: Breadcrumb/Tabs/Button 슬롯. `<header>` + 제목(레벨 지정) + 설명 + 액션(우측) + 탭 슬롯, 반응형. Story `components-pageheader--matrix`. Export PageHeader + 타입.

### Task 4: 조립 + 게이트
- [ ] index.ts에 3종(+ Chart 서브 + useAppShell) export 배선.
- [ ] `npm run check` 전부 green.

### Task 5: OnMyFactory 대시보드 데모 (캡스톤)
전체 라이브러리를 실조립한 모니터링 대시보드를 **Storybook 페이지 스토리**로 만든다 (`src/demo/OnMyFactoryDashboard.tsx` + `OnMyFactoryDashboard.stories.tsx`, title `Pages/OnMyFactory Dashboard`). 라이브러리 배럴(`../index` 또는 각 컴포넌트)에서 import해 소비자처럼 조립.
- 구성: `AppShell`(Sidebar[대시보드/설비/에이전트/로그/설정] + Topbar[CREFLE 9-dot 브랜드 + Breadcrumb + 알림 IconButton + 프로필]) 안에 `PageHeader`(제목 "설비 모니터링" + 설명 + 액션 Button + Tabs) → `StatCard` 4개(가동률 Gauge/활성 에이전트/경고 수/처리량, 델타 포함) → `AlertBanner`(경고 1건) → `Chart` 3개(LineChart 가동률 추이 · BarChart 라인별 처리량 · PieChart/Donut 설비 상태 구성비) → 설비 이벤트 로그 `Table`(정렬·상태 칩). 정적 fixture 데이터.
- 라이트/다크 토글 동작(ThemeProvider / preview 툴바). CREFLE 레드 단일 액센트, 다크 우선 감성 유지.
- [ ] `npm run build-storybook` + `shoot components-... 또는 pages-onmyfactory-dashboard--default` 라이트/다크 → 대시보드 전체가 브랜드 정합·가독성 있게 렌더되는지 육안 검증.
- [ ] 커밋.

### Task 6: Phase 4 최종 게이트 + 태그
- [ ] `npm run check` green. index.ts export 전수 확인.
- [ ] 커밋 + `git tag phase4`.

## 최종 whole-branch 리뷰
`phase3..HEAD`를 opus로 whole-branch 리뷰 → fix 배치 → 태그 확정.

## 빌드 순서
Task 1~3 **병렬 가능**(AppShell/PageHeader는 Phase 1-3 컴포넌트에만 의존, Chart 독립) → 4(조립) → 5(데모, 전체 조립이라 3종 완료 후) → 6(태그).

## Self-Review
- 신규 토큰 없음(스펙 확인). 3종 + 데모 태스크 존재. Placeholder 없음(코드는 스펙 파일). 데모는 실조립 소비자 검증 = Phase 1 완료기준 충족.
