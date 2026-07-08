# 타이포그래피 (Type)

서체는 **Spoqa Han Sans Neo** (한국어/UI), 코드·식별자는 `--font-mono`. 아이콘은
Material Symbols Rounded. 타입 스케일은 Material Design 3 구조를 Spoqa로 재조율한 것으로,
전부 `tokens/web-tokens.css`에 `font` 단축 토큰 + 짝이 되는 `-tracking` 토큰으로 정의된다.

## 사용법

`font` 단축 토큰과 `letter-spacing` tracking 토큰을 **함께** 쓴다. `font` 토큰에는
weight/size/line-height/family가 들어있고, tracking은 별도다.

```css
.title {
  font: var(--type-title-lg);
  letter-spacing: var(--type-title-lg-tracking);
}
```

## 스케일

| 토큰 | weight / size / line-height | tracking | 용도 |
|---|---|---|---|
| `--type-display-lg` | 700 · 45px / 52px | `-0.02em` | 초대형 히어로 숫자·타이틀 |
| `--type-display-sm` | 700 · 36px / 44px | `-0.02em` | 대형 타이틀 |
| `--type-headline-lg` | 700 · 28px / 36px | `-0.02em` | 페이지 제목 (PageHeader), StatCard 값 |
| `--type-headline-sm` | 700 · 24px / 32px | `-0.02em` | 섹션 제목, compact 페이지 제목 |
| `--type-title-lg` | 500 · 20px / 28px | `-0.02em` | 카드 헤더, 브랜드 워드마크 |
| `--type-title-sm` | 500 · 16px / 24px | `-0.01em` | 패널 제목, 단위(unit), topbar 브랜드 |
| `--type-body-lg` | 400 · 16px / 24px | `0` | 기본 본문 (body 기본값) |
| `--type-body-sm` | 400 · 14px / 20px | `0` | 보조 본문, 표 셀, 헬퍼/설명 |
| `--type-label-lg` | 500 · 14px / 20px | `0` | 버튼·탭·칩·라벨, StatCard delta |
| `--type-label-sm` | 500 · 12px / 16px | `0.01em` | 마이크로 라벨, 축 눈금, 뱃지, sm 컨트롤 |

## 규칙

- **weight 매핑**: display/headline = 700(Bold), title/label = 500(Medium), body = 400(Regular). Thin(100)/Light(300)은 번들되어 있으나 UI 텍스트에는 쓰지 않는다(장식/대형 디스플레이 한정).
- **한국어 우선**: 스토리·UI 카피는 한국어, 식별자·이름은 영어.
- **display size 감소 tracking**: 큰 글자일수록 `-0.02em`으로 조여 밀도를 유지한다. body/label은 0 또는 미세 양수.
- 본문 대비는 WCAG AA 4.5:1 이상 — 표면 위 텍스트는 `--on-surface`(본문) / `--on-surface-variant`(보조) / `--on-surface-muted`(라벨) 3단으로만.
