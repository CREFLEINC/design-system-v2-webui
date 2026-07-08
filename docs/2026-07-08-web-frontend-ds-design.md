# CREFLE Web Design System (@crefle/web-ui) — 디자인 스펙

- 날짜: 2026-07-08
- 상태: 사용자 리뷰 대기
- 위치: 파운데이션 repo에 임시 보관. 새 repo 스캐폴드 시 `docs/`로 복사.

## 1. 목적과 배경

CREFLE 파운데이션 디자인 시스템(Stage 1: 브랜드·색상·보이스&톤·접근성)의 **첫 분야별 확장 파일럿**.
웹 프론트엔드 전용 디자인 시스템을 실제 동작하는 React 라이브러리로 구축한다.

- **첫 소비자**: OnMyFactory 제품 UI (AI Agent 스마트 팩토리 솔루션). 현재 그린필드 — DS가 먼저 만들어져 향후 제품 개발의 기준이 된다.
- **화면 유형**: 모니터링 대시보드, 데이터 테이블/로그, 에이전트 제어/설정 폼, 인증/온보딩을 비롯한 웹 범용 화면 대부분.
- **역할**: 여기서 처음 정의하는 형태 토큰(spacing/radius/type-scale/shadow/motion)은 다른 분야에서도 공통임이 입증되면 파운데이션 Stage 2로 승격한다.

## 2. 완료 기준 (v0.1)

1. 토큰 + 컴포넌트 25종 + Storybook 문서가 빌드·테스트 통과 상태로 완성
2. OnMyFactory 모니터링 대시보드 데모 1화면을 `@crefle/web-ui`를 import해서 실조립 — 라이트/다크 토글 동작
3. 새 Claude Design 프로젝트 "CREFLE Web UI"에 동기화 완료

## 3. 아키텍처 (승인됨)

- **새 repo**: `~/Documents/Claude/Projects/CREFLE Web Design System` (파운데이션과 형제)
- **패키지**: `@crefle/web-ui` — 단일 패키지 (모노레포 아님)
- **스타일링**: 순수 CSS 커스텀 프로퍼티 + CSS Modules (A안). CSS-in-JS·Tailwind 배제.
- **도구**: TypeScript, React(peerDependency), Vite 라이브러리 모드, Storybook, Vitest + Testing Library, 헤드리스 Chrome 렌더 검증(`shoot.sh` 패턴)
- **런타임 의존성 0**: React 외 외부 런타임 라이브러리 없음. 차트도 경량 SVG 자체 구현.

```
CREFLE Web Design System/
├── styles/
│   ├── foundation/        # 파운데이션 tokens.css + fonts 복사본
│   │   └── PIN            # 파운데이션 커밋 해시 기록 (최초: df6e6ed)
│   ├── web-tokens.css     # 신규 형태 토큰 (Stage 2 승격 후보)
│   ├── themes.css         # 라이트/다크 시맨틱 변수
│   └── index.css          # 단일 진입점 (@import 묶음)
├── src/
│   ├── components/<Name>/ # <Name>.tsx + .module.css + .stories.tsx + .test.tsx
│   ├── theme/             # ThemeProvider, useTheme (data-theme 토글)
│   └── index.ts
├── demo/                  # OnMyFactory 대시보드 데모 (Vite 앱, 라이브러리 소비자)
├── ds-bundle/             # Claude Design 동기화 번들
├── .design-sync/          # "CREFLE Web UI" 프로젝트 핀
└── docs/                  # 이 스펙 + 가이드
```

- **경계**: `styles/`는 React 없이 완결된 CSS 시스템(타 분야 재사용 가능) / `src/`는 React 구현체 / `demo/`는 소비자 검증용.
- **파운데이션 소비**: 복사 + 버전 핀. 파운데이션 갱신 시 재복사 스크립트로 갱신, `PIN`으로 드리프트 추적.

## 4. 토큰 & 테마 (승인됨)

### 신규 웹 토큰 (`web-tokens.css`)

| 그룹 | 내용 |
|---|---|
| Type scale | M3 구조: display/headline/title/body/label × large/small. Spoqa 웨이트 700/500/400/300, 제목 -0.02em |
| Spacing | 4px 기반 `--space-1`(4) ~ `--space-12`(96) |
| Radius | `--radius-sm` 8 / `md` 12 / `lg` 16 / `xl` 24 / `full` 999px. 기준값 12px |
| Elevation | 0~5단계. 라이트=절제된 단일 그림자, 다크=표면 명도 상승(tonal). 그림자 더미 금지 |
| Motion | duration fast 100ms / base 200ms / slow 300ms + easing 토큰 |
| State layer | hover 8% / focus 12% / press 12% (파운데이션 규칙 성문화) |
| 차트 컬러 | 시맨틱은 파운데이션 재사용. 카테고리 5색: 레드 #C9252C이 1번, 나머지 차콜 명도 변주. 무지개 금지 |

### 테마 (`themes.css`)

- `:root` = 라이트 기본(파운데이션 값), `[data-theme="dark"]` = 다크 오버라이드
- 다크 팔레트는 이 repo에서 신규 정의. 출발점은 OnMyFactory 다크 작업 검증 값(#1b1d21 배경, #33363b 표면 계열)
- 다크에서도 레드 단일 액센트, 순수 검정·순수 흰색 금지(웜 뉴트럴)
- **하드코딩 금지 원칙**: 컴포넌트 CSS는 시맨틱 토큰만 참조. hex/임의 px 금지 (lint로 강제)

## 5. 컴포넌트 목록 (25종)

### Tier 1 · 기초 (12종)

| # | 컴포넌트 | 용도 | 주요 변형/기능 |
|---|---|---|---|
| 1 | Button | 기본 액션 | filled(레드)/tonal/outlined/text · sm/md/lg · loading · 아이콘 슬롯 |
| 2 | IconButton | 아이콘 단독 액션 | standard/filled/tonal · toggle 상태 |
| 3 | TextField | 텍스트 입력 | label·helper·error · prefix/suffix 아이콘 · disabled |
| 4 | Select | 선택 입력 | 커스텀 listbox · 옵션 그룹 · 키보드 탐색 |
| 5 | Checkbox | 다중 선택 | indeterminate 지원 |
| 6 | Radio | 단일 선택 | RadioGroup 포함 |
| 7 | Switch | on/off 토글 | 라벨 배치 옵션 |
| 8 | Chip / Badge | 상태·필터·카운트 | 시맨틱 상태 칩(success/error/warning/info/idle) · 필터 칩 · 숫자 배지 |
| 9 | Card | 콘텐츠 컨테이너 | 표면 레벨 · header/body/footer 슬롯 · interactive 변형 |
| 10 | Dialog | 모달 | sm/md/lg · focus trap · ESC/오버레이 닫기 |
| 11 | Tooltip | 보조 설명 | 4방향 배치 · 지연 표시 |
| 12 | Tabs | 뷰 전환 | 언더라인 스타일 · 키보드 탐색 |

### Tier 2 · 제품 필수 (10종)

| # | 컴포넌트 | 용도 | 주요 변형/기능 |
|---|---|---|---|
| 13 | Table | 이벤트 로그·설비 목록 | 고정 헤더 · 정렬 · 페이지네이션 · 행 선택 · 밀도 옵션 |
| 14 | StatCard | KPI 현황 | 값+증감 표시(▲▼) · 스파크라인 슬롯 · 상태 컬러 |
| 15 | Progress / Gauge | 가동률·진행률 | 선형 + 원형 게이지 · 임계값별 시맨틱 컬러 |
| 16 | AlertBanner | 페이지 수준 알림 | 시맨틱 4종 · 닫기 · 액션 슬롯 |
| 17 | Toast | 일시 알림 | ToastProvider + useToast 훅 · 자동 소멸 · 시맨틱 변형 |
| 18 | Sidebar + Topbar | 앱 내비게이션 | 접이식 사이드바 · Material Symbols 아이콘 · active 상태 · 톱바(브레드크럼/사용자 영역) |
| 19 | Breadcrumb | 위치 표시 | 말줄임 처리 |
| 20 | EmptyState | 빈 화면 | 아이콘+제목+설명+액션 |
| 21 | Skeleton | 로딩 자리표시 | text/rect/circle · 시머 애니메이션 |
| 22 | SearchInput | 검색·필터 | 클리어 버튼 · 필터 드롭다운 패턴 |

### Tier 3 · 조립 (3종)

| # | 컴포넌트 | 용도 | 주요 변형/기능 |
|---|---|---|---|
| 23 | AppShell | 앱 골격 | 사이드바+톱바+콘텐츠 그리드 · 반응형 |
| 24 | Chart (Line/Bar/Pie) | 추이·분포·구성비 시각화 | 경량 SVG 자체 구현 · 원형은 파이/도넛 변형 · 차트 토큰 · 축/그리드/범례/툴팁 최소 구성 |
| 25 | PageHeader | 페이지 머리 | 제목·설명·액션·탭 슬롯 |

### 공통 유틸

- **Icon**: Material Symbols Rounded(파운데이션 폰트 번들) 래퍼 — opsz 24 / wght 400 / FILL 0 고정
- **ThemeProvider / useTheme**: `data-theme` 토글, 시스템 선호 감지

### 컴포넌트 공통 규칙

- 파일 세트: `<Name>.tsx` + `<Name>.module.css` + `<Name>.stories.tsx` + `<Name>.test.tsx`
- 상태(hover/focus/press/disabled)는 state layer 토큰으로 일괄 구현
- 접근성: 키보드 포커스 링 필수, WCAG AA 대비, 적절한 aria — 파운데이션 접근성 가이드 준수
- 스토리: 변형 전수 + 라이트/다크 양쪽

## 6. 품질 검증 루프

1. **Vitest 단위 테스트** — 동작·접근성 속성 (컴포넌트당 최소 1 스모크 + 핵심 동작)
2. **렌더 검증** — Storybook 스토리를 헤드리스 Chrome으로 라이트/다크 스크린샷 → 시각 검사 (OnMyFactory 검증 방식)
3. **토큰 준수 lint** — 컴포넌트 CSS에 hex/임의 px 하드코딩 자동 검출
4. **소비자 검증** — 데모 앱이 npm 패키지 경계를 통해서만 import

## 7. 데모: OnMyFactory 모니터링 대시보드

AppShell + 사이드바 + StatCard 4개(가동률·활성 에이전트·경고·처리량) + 설비 이벤트 로그 Table + 차트 3개(Line 추이, Bar 분포, Donut 설비 상태 구성비) + AlertBanner/Toast. 라이트/다크 토글 동작. 가짜 데이터는 정적 fixture.

## 8. Claude Design 동기화

- 새 프로젝트 **"CREFLE Web UI"** 생성 (파운데이션 프로젝트와 별개)
- `ds-bundle/`: styles 클로저(foundation+web-tokens+themes) + 컴포넌트 레퍼런스 + 가이드라인 → design-sync 절차로 업로드
- 이후 Claude Design에서 웹 화면 시안 제작 시 이 DS가 기준

## 9. 구축 순서

1. repo 스캐폴드 (git, Vite, TS, Storybook, Vitest)
2. `styles/` 토큰·테마 (+ 파운데이션 복사/PIN)
3. Tier 1 (12종) → 렌더 검증
4. Tier 2 (10종) → 렌더 검증
5. Tier 3 (3종)
6. 데모 대시보드 조립
7. Storybook 문서 정리
8. Claude Design "CREFLE Web UI" 동기화

## 10. 범위 제외 (YAGNI)

- 모노레포 분리, npm 레지스트리 배포(로컬 패키지로 충분), i18n 프레임워크, 폼 상태 관리 라이브러리, 외부 차트 라이브러리 통합, e2e 테스트 스위트 — 필요해지면 그때
