# 색상 (Colors)

> 개념이 같으면 색도 같다. "양품"은 어디서나 success, "불량"은 어디서나 error.
> 장식 색은 브랜드 팔레트로만 쓰고 **새 hex를 만들지 않는다.**
> 모든 값은 하드코딩 hex가 아니라 `tokens/foundation.css` · `tokens/web-tokens.css`의
> `var(--token)`으로 참조한다. 다크는 `tokens/themes.css`의 `[data-theme='dark']` 오버라이드.

CREFLE Web UI는 **레드 단일 액센트(single-accent)** 시스템이다. 강조는 오직 브랜드 레드
`#C9252C` 하나. 위계·구분은 색을 늘리지 않고 **표면 사다리(surface ladder) + 차콜 명도**로 만든다.

## 1. 브랜드 아이덴티티 (로고에서 샘플링)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--brand-red` / `--primary` | `#C9252C` | 기본 / primary 강조 |
| `--brand-red-dark` | `#A81E24` | hover |
| `--brand-red-deep` | `#7D161B` | press / on-dark accent |
| `--brand-red-soft` | `#F4DDDE` | container, subtle bg |
| `--brand-charcoal` | `#3E4146` | 기본 차콜 (차트 2번) |
| `--brand-charcoal-deep` | `#1F2125` | full-bleed dark |
| `--brand-gradient-dark` | charcoal→red 램프 | 섹션 구분 / 타이틀 배경 |

## 2. Primary 별칭 + 역할 토큰

모든 강조는 `--brand-*`가 아니라 별칭을 통해 참조한다 (주색 변경 시 한 곳만 수정).

- `--primary` · `--primary-hover` · `--primary-press` · `--primary-container` · `--on-primary` (`#FFFFFF`)
- `--on-primary-container` — tonal 표면 위 텍스트. light `#7D161B`(8.1:1) / dark `#F4DDDE`(10.3:1).
- **`--primary-text`** — 표면 위 레드 텍스트/아이콘/링크 역할. light는 `--primary`, **dark는 밝은 톤 `#E8878B`로 스왑**(AA 안전). 채움/보더 레드는 `--primary`, 표면 위 글자/아이콘은 반드시 `--primary-text`.

## 3. 중립 표면 (Neutral surfaces) — 4단 사다리

순수 `#FFFFFF`/`#000000` 금지. 라이트는 약한 마젠타 기 도는 warm-cool white, 다크는 차콜 계열.

| 토큰 | light | dark |
|---|---|---|
| `--surface` | `#FBF8FD` | `#1B1D21` |
| `--surface-container-low` | `#F5F2F7` | `#22252A` |
| `--surface-container` | `#EFEDF1` | `#2A2D33` |
| `--surface-container-high` | `#E9E7EB` | `#33363B` |
| `--on-surface` (본문) | `#1B1B1F` | `#F4F3F7` |
| `--on-surface-variant` (보조) | `#2D2C33` | `#C4C6CC` |
| `--on-surface-muted` (라벨) | `#77767F` | `#8A8D94` |
| `--outline-variant` (1px 보더) | `#C6C5D0` | `#43464D` |
| `--outline` (폼 컨트롤 보더, ≥3:1) | `#6E6D78` | `#8E9099` |

## 4. 시맨틱 (Semantic) — 라이트/다크 **고정**

개념 동등 = 색 동등. 채움/아이콘/점(dot) 색은 라이트·다크 공통 고정값.

| 토큰 | 값 | 의미 |
|---|---|---|
| `--semantic-success` | `#1F883D` | 양품 / Pass / OK |
| `--semantic-error` | `#B3261E` | 불량 / Fail / NG |
| `--semantic-warning` | `#E8A100` | 주의 / Attention |
| `--semantic-info` | `#0B57D0` | 정보 / Info |
| `--semantic-idle` | `#6E7781` | 대기 / Idle |

### 텍스트 역할 — 다크에서 밝은 톤으로 스왑
표면 위 시맨틱 **글자/아이콘**은 고정 채움색이 아니라 텍스트 역할 토큰을 쓴다.

- `--semantic-error-text` — light `#B3261E`(6.21:1) / dark `#F2B8B5`(9.88:1)
- `--semantic-success-text` — light `#0E5223`(8.87:1) / dark `#A6D9B6`(10.63:1)
- `--semantic-warning`은 흰 배경 텍스트로 쓰면 미달(2.09:1). **채움/아이콘/테두리로만**, 그 위 글자는 `--on-semantic-warning-container`.

### 컨테이너 역할 — 소프트 배경 + 그 위 텍스트 (상태 칩 / AlertBanner)
`surface-relative` 틴트. 각 컨테이너 배경과 그 위 텍스트가 쌍으로 정의된다 (라이트/다크 둘 다).

| 배경 토큰 | 텍스트 토큰 |
|---|---|
| `--semantic-success-container` | `--on-semantic-success-container` |
| `--semantic-error-container` | `--on-semantic-error-container` |
| `--semantic-warning-container` | `--on-semantic-warning-container` |
| `--semantic-info-container` | `--on-semantic-info-container` |
| `--semantic-idle-container` | `--on-semantic-idle-container` |

## 5. 차트 색 — 레드 1번 + 차콜 명도 변주 (무지개 금지)

시리즈는 채도 대신 **명도**로 구분한다. 다크에서는 명도 사다리가 반전된다.

| 토큰 | light | dark |
|---|---|---|
| `--chart-1` | `= --primary` `#C9252C` | 동일 |
| `--chart-2` | `#3E4146` | `#E2E3E7` |
| `--chart-3` | `#63666D` | `#B9BBC1` |
| `--chart-4` | `#8A8D94` | `#8A8D94` |
| `--chart-5` | `#B4B6BC` | `#5C6067` |
| `--chart-grid` | `= --outline-variant` | 동일 |

## 6. 상태 레이어 (State layers) — M3 알파 오버레이

hover 8% · focus 12% (+2px ring) · press 12% · disabled fill 12% / text 38%.
**darken/lighten 이나 shrink-on-press 금지.** `::before` 오버레이만 얹는다.

- primary/tonal 표면 위: `--state-hover` · `--state-focus` · `--state-press` (레드 틴트)
- 중립(neutral) 표면 위: `--state-hover-neutral` · `--state-press-neutral`
- on-primary(레드 채움) 위: `--state-hover-on-primary` · `--state-press-on-primary`
- 비활성: `--state-disabled-fill` · `--state-disabled-text`
- 포커스 링: `--focus-ring` (`0 0 0 2px var(--surface), 0 0 0 4px var(--primary)`)

## 7. 다크 테마 사용법

`[data-theme='dark']`는 **요소 스코프** — `<html>`뿐 아니라 임의 컨테이너에도 적용 가능하다.
라이트/다크를 한 화면에 나란히 보여줄 때는 dark 절반을 `<div data-theme="dark">`로 감싸면 된다.
시맨틱 채움색은 고정, 표면·텍스트 역할·컨테이너·차트 명도만 스왑된다.
