# 컴포넌트 작성 관례 (@crefle/web-ui)

Phase 1~2에서 확립된 규칙. 새 컴포넌트는 이 관례를 따른다. (패턴 레퍼런스: `src/components/Button/`)

## 파일 세트
`src/components/<Name>/` 에 `<Name>.tsx` + `<Name>.module.css` + `<Name>.stories.tsx` + `<Name>.test.tsx`. `src/index.ts`에 export 추가.

## props 스프레드 순서 — `...rest`
기본 규칙은 **"소비자가 이긴다"**: `{...rest}`를 마지막에 스프레드한다. 단, 컴포넌트가 반드시 실행해야 하는 핸들러(onClick 등)는 `rest`에서 구조분해해 **합성**한다 — 덮어쓰지도, 소비자 것을 삼키지도 않게:

```tsx
const { onClick, ...rest } = props
// ...
<button {...rest} onClick={(e) => { onClick?.(e); handleInternal(e) }} />
```

**예외 — 컴포넌트의 ARIA가 이겨야 할 때**: 커스텀 위젯(예: `Select`의 `role="combobox"` + `aria-expanded`)은 소비자가 롤/aria를 덮어쓰면 접근성이 깨진다. 이 경우 `{...rest}`를 먼저 스프레드하고 role/aria/핸들러를 그 **뒤에** 둔다 — 단, 소비자 핸들러는 여전히 `rest.onClick?.(e)`로 합성한다. `Select`가 이 패턴의 기준이다.

한 줄 요약: **role/aria/tabIndex 같은 컴포넌트 소유 속성은 `{...rest}` 뒤에, 소비자 핸들러는 항상 합성.**

## 상태 레이어 (M3)
배경을 직접 바꾸지 않고 `::before` 오버레이만 얹는다:
```css
.root { position: relative; isolation: isolate; }
.root::before { content:''; position:absolute; inset:0; border-radius:inherit;
  background:transparent; transition: background var(--motion-fast) var(--ease-standard); pointer-events:none; }
.root:hover::before  { background: var(--state-hover); }   /* primary/tonal 표면 */
.root:active::before { background: var(--state-press); }
```
중립(neutral) 표면 위에서는 `--state-hover-neutral` / `--state-press-neutral`을, primary/tonal 표면 위에서는 `--state-hover` / `--state-press`(레드 틴트)를 쓴다.

## 포커스 링
`outline: none`과 함께 `:focus-visible { box-shadow: var(--focus-ring) }`. 보더가 있으면 링과 합성한다.

## 색 토큰
- 표면 위 **레드 텍스트/아이콘** → `var(--primary-text)` (다크 AA 안전). 채움/보더 레드는 `var(--primary)`.
- 에러 **메시지 텍스트/아이콘** → `var(--semantic-error-text)`. 에러 **보더** → `var(--semantic-error)`.
- tonal/컨테이너 위 텍스트 → 대응 `--on-*-container` 토큰.
- `.module.css`는 토큰만: raw 색상 금지, px는 0/1/2만. `npm run lint:tokens`가 강제(미정의 토큰 참조도 검출).

## reduced-motion
모든 애니메이션/트랜지션은 `@media (prefers-reduced-motion: reduce)`로 끈다 — **`::before`/`::after` 유사요소도 별도 셀렉터로 명시**(부모 셀렉터로 커버되지 않음). 의미 있는 애니메이션(스피너)은 끄지 말고 감속. 자세히는 `docs/reduced-motion.md`.

## 접근성
완전한 키보드 조작, 올바른 ARIA 롤/상태, WCAG AA 대비, 폼 컨트롤 라벨 연결(htmlFor/id 또는 aria-label). 네이티브 요소를 우선 사용(예: Radio는 네이티브 라디오 그룹).

## 기타
- forwardRef를 실제 포커스 대상(input·인터랙티브 루트)에 전달.
- 런타임 의존성 0 — 위치 계산·포커스 트랩 등은 네이티브 API 또는 자체 구현.
- 스토리 카피는 한국어, 이름은 영어. `components-<name>--matrix` 스토리로 라이트/다크 전수 배열.
