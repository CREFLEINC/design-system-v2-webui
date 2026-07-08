# CREFLE Web UI — 웹 디자인 시스템

**@crefle/web-ui** — 크레플 주식회사(CREFLE Inc.)의 **웹 컴포넌트 라이브러리** 디자인 시스템이다.
공통 파운데이션(브랜드 레드 `#C9252C` 단일 액센트 · Spoqa Han Sans Neo · 시맨틱 컬러)을
그대로 상속하면서, 그 위에 **형태 토큰(type·space·radius·elevation·motion) + 26개 React 컴포넌트**를
올린 실사용 UI 시스템이다. 기반은 Material Design 3 파생.

## 셋업 (Setup)

렌더되는 모든 디자인은 **`styles.css` 한 장만** 로드하면 된다. 이 파일이 `@import`로
토큰 3종 + 번들 폰트를 모두 끌어온다 (로드 순서: foundation → web-tokens → themes → fonts):

```html
<link rel="stylesheet" href="styles.css" />
```

`styles.css`를 로드하지 않으면 토큰·폰트가 정의되지 않아 디자인이 무채색·시스템 폰트로 깨진다.
다크 테마는 `<html data-theme="dark">` 또는 임의 컨테이너 `<div data-theme="dark">`로 스코프한다
(요소 단위 적용 가능 — 라이트/다크를 한 화면에 나란히 배치 가능).

## 토큰 모델 (스타일 전에 읽을 것)

이 시스템의 유일한 스타일 언어는 **CSS 토큰**이다. **raw hex/px 금지 — 항상 `var(--token)`**.

- `tokens/foundation.css` — 브랜드·색상·표면·시맨틱·상태 (Stage 1 공통 파운데이션)
- `tokens/web-tokens.css` — 웹 형태 토큰 (type·space·radius·elevation·motion·chart·layout·z)
- `tokens/themes.css` — `[data-theme='dark']` 다크 오버라이드
- `guidelines/colors.md` · `type.md` · `tokens.md` — 색/타이포/전체 토큰 카탈로그
- `guidelines/component-conventions.md` · `reduced-motion.md` — 컴포넌트 작성 관례

핵심 규칙: 레드 **단일 액센트**(강조는 오직 `--primary`), 위계는 색이 아니라 **표면 사다리 + 차콜 명도**로.
시맨틱은 개념 동등=색 동등(고정). 상태는 darken/lighten이 아니라 **M3 상태 레이어 오버레이**로.
접근성은 WCAG AA, 모든 장식 모션은 `prefers-reduced-motion`으로 끈다.

## 라이브 컴포넌트 (Storybook)

프로덕션 앱은 마크업을 직접 쓰지 않고 **@crefle/web-ui** React 컴포넌트를 배럴 import 해서 조립한다.
런타임 의존성 0 · 토큰 기반 스타일. 상호작용/상태 매트릭스(라이트·다크 전수)는 **Storybook**에서 확인한다:

```bash
npm run storybook        # 로컬 개발
npm run build-storybook  # 정적 빌드 (storybook-static/)
```

각 컴포넌트는 `components-<name>--matrix` 스토리로 라이트/다크 전 상태를 배열한다.
플래그십 조립 예시는 `OnMyFactoryDashboard` 데모(설비 모니터링 대시보드)다.

> 이 번들의 `cards/*.html`은 Claude Design용 **정적 토큰 기반 레퍼런스**다 —
> 실제 앱은 위 React 컴포넌트를 쓰고, 카드는 토큰이 만드는 룩을 보여주는 참고용이다.

## 컴포넌트 26종 + 티어

| 티어 | 컴포넌트 |
|---|---|
| **Foundation** | Icon, Button |
| **Tier 1 — 폼·기본 (Phase 2)** | IconButton, TextField, Select, Checkbox, Radio, Switch, Chip, Badge, Card, Dialog, Tooltip, Tabs |
| **Tier 2 — 데이터·피드백 (Phase 3)** | Table, StatCard, Progress, Gauge, AlertBanner, Toast, Navigation(Sidebar/Topbar), Breadcrumb, EmptyState, Skeleton, SearchInput |
| **Tier 3 — 조립·시각화 (Phase 4)** | AppShell, Chart(Line/Bar/Pie), PageHeader |

(Navigation은 Sidebar/SidebarItem/SidebarSection/Topbar, Chart는 Line/Bar/Pie로 하위 분할된다.)

## 메타

- 회사: 크레플 주식회사 / CREFLE Inc.
- 패키지: **@crefle/web-ui** (`VERSION 0.1.0`)
- 기본 강조(primary): 브랜드 레드 `#C9252C`
- 서체: Spoqa Han Sans Neo (100·300·400·500·700) + Material Symbols Rounded — 로컬 번들 woff2
- 기반: Material Design 3 파생 · 공통 파운데이션(CREFLE Foundation) 상속
