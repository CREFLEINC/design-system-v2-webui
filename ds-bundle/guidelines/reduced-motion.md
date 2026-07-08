# Reduced Motion 관례

모든 컴포넌트의 `transition`/`animation`은 `@media (prefers-reduced-motion: reduce)`로
비활성(또는 무해하게 감속)한다. 사용자가 OS/브라우저 설정에서 모션 축소를 요청한 경우,
장식적 모션(호버·포커스 트랜지션 등)은 완전히 끄고, **의미를 전달하는 모션**(예: 로딩
스피너)은 끄지 않고 느리게 유지해 상태 정보 손실을 막는다.

## 규칙

1. 상태 레이어·색상·그림자 등 순수 장식용 `transition`은 `transition: none`으로 끈다. 
   **주의:** `::before`/`::after` 같은 의사요소가 자신의 `transition`을 정의한 경우, 
   그 의사요소는 부모 선택자에 포함되지 않으므로 `transition: none` 규칙에 명시적으로 나열해야 한다 
   (예: `.button, .button::before { transition: none; }`)
2. "진행 중"처럼 의미를 담은 `animation`(스피너, 프로그레스 바 등)은 완전히 멈추지 않는다 —
   `animation-duration`을 늘려 감속하는 정도로 그친다(예: 0.8s → 1.6s).
3. 컴포넌트별 `*.module.css` 파일 맨 아래에, 해당 컴포넌트가 정의한 애니메이션/트랜지션
   클래스만 겨냥해 하나의 `@media (prefers-reduced-motion: reduce)` 블록을 둔다.

## 예시 (Button.module.css)

```css
@media (prefers-reduced-motion: reduce) {
  .spinner { animation-duration: 1.6s; }  /* 회전은 유지하되 느리게 — 로딩 의미 보존 */
  .button { transition: none; }
}
```

이후 모든 컴포넌트(Phase 2의 11종 포함)는 이 패턴을 따른다: 장식 트랜지션은 `none`,
의미 있는 애니메이션은 `animation-duration`만 늘린다.
