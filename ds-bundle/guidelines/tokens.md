# 토큰 카탈로그 (Tokens)

CREFLE Web UI의 유일한 스타일 언어는 **CSS custom property 토큰**이다.
**raw hex/px 금지 — 항상 `var(--token)`.** 색·타이포·표면·상태는 토큰만으로 표현한다.
`.module.css`는 토큰만 참조하며 px 리터럴은 0/1/2만 허용된다 (`npm run lint:tokens`가 강제).

정의 위치:
- `tokens/foundation.css` — 브랜드·색상·표면·시맨틱·상태 (Stage 1 공통 파운데이션, 라이트 기본)
- `tokens/web-tokens.css` — 웹 전용 형태 토큰 (type·space·radius·elevation·motion·chart·layout·z…)
- `tokens/themes.css` — `[data-theme='dark']` 다크 오버라이드만

---

## Color — 색상

- **브랜드**: `--brand-red` · `--brand-red-dark` · `--brand-red-deep` · `--brand-red-soft` · `--brand-charcoal` · `--brand-charcoal-deep` · `--brand-gradient-dark`
- **primary 별칭/역할**: `--primary` · `--primary-hover` · `--primary-press` · `--primary-container` · `--on-primary` · `--on-primary-container` · `--primary-text`
- **product 전용**: `--product-primary` (`#4758A9`, viskit_killer 제품 화면 한정)
- **표면 사다리**: `--surface` · `--surface-container-low` · `--surface-container` · `--surface-container-high`
- **전경 텍스트**: `--on-surface` · `--on-surface-variant` · `--on-surface-muted`
- **보더**: `--outline` (폼 컨트롤 실보더) · `--outline-variant` (1px 카드 보더)
- **시맨틱 채움**: `--semantic-success` · `--semantic-error` · `--semantic-warning` · `--semantic-info` · `--semantic-idle`
- **시맨틱 텍스트**: `--semantic-error-text` · `--semantic-success-text`
- **시맨틱 컨테이너 (배경+텍스트 쌍)**: `--semantic-{success,error,warning,info,idle}-container` + `--on-semantic-{…}-container`
- **스크림**: `--scrim` (Dialog/Toast 뒷막)

## Type — 타이포 (→ `type.md`)

- **스케일 (font 단축)**: `--type-display-lg|sm` · `--type-headline-lg|sm` · `--type-title-lg|sm` · `--type-body-lg|sm` · `--type-label-lg|sm`
- **tracking (짝)**: 각 스케일의 `--type-*-tracking`
- **폰트 패밀리**: `--font-sans` (Spoqa Han Sans Neo) · `--font-mono`

## Space — 간격 (4px 기반)

`--space-1`(4) · `-2`(8) · `-3`(12) · `-4`(16) · `-5`(20) · `-6`(24) · `-7`(32) · `-8`(40) · `-9`(48) · `-10`(64) · `-11`(80) · `-12`(96)

- **컨트롤 높이**: `--control-height-sm`(32) · `--control-height-md`(40) · `--control-height-lg`(48)

## Radius — 모서리

`--radius-sm`(8) · `--radius-md`(12) · `--radius-lg`(16) · `--radius-xl`(24) · `--radius-full`(999, pill/원형)

## Elevation — 그림자 (절제된 최대 2레이어)

`--elevation-0`(none) · `-1` · `-2` · `-3` · `-4` · `-5`. 다크에서는 그림자를 약화하고 표면 사다리로 위계를 대신한다.

## Motion — 모션

- **duration**: `--motion-fast`(100ms) · `--motion-base`(200ms) · `--motion-slow`(300ms)
- **easing**: `--ease-standard` · `--ease-emphasized`
- 모든 장식 트랜지션은 `@media (prefers-reduced-motion: reduce)`로 끈다 (→ `reduced-motion.md`).

## State — 상태 레이어 (M3 알파 오버레이)

- primary/tonal: `--state-hover`(8%) · `--state-focus`(12%) · `--state-press`(12%)
- 중립: `--state-hover-neutral` · `--state-press-neutral`
- on-primary: `--state-hover-on-primary` · `--state-press-on-primary`
- 비활성: `--state-disabled-fill`(12%) · `--state-disabled-text`(38%)
- 포커스: `--focus-ring`

## Chart — 차트 색 (레드 1번 + 차콜 명도)

`--chart-1`(=`--primary`) · `--chart-2` · `--chart-3` · `--chart-4` · `--chart-5` · `--chart-grid`

## Layout — 레이아웃

- **사이드바 폭**: `--sidebar-width`(256) · `--sidebar-width-collapsed`(72)
- **Dialog 최대 폭**: `--dialog-max-sm`(360) · `--dialog-max-md`(512) · `--dialog-max-lg`(720)
- **스켈레톤 시머**: `--skeleton-base` · `--skeleton-shine`

## Z-index — 쌓임 순서

`--z-toast`(1100). 그 외 로컬 스태킹은 `isolation: isolate` + 국소 z-index로 관리.
