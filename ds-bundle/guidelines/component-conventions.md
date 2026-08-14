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
- 지난 값/중립 텍스트(예: 변경 이력의 이전 값) → `var(--semantic-idle-text)`. **이전 값에 `--semantic-error`·취소선(`line-through`)을 쓰지 않는다** — 잘못된 값이 아니라 지난 값이다.
- `.module.css`는 토큰만: raw 색상 금지, px는 0/1/2만. `npm run lint:tokens`가 강제(미정의 토큰 참조도 검출).

## reduced-motion
모든 애니메이션/트랜지션은 `@media (prefers-reduced-motion: reduce)`로 끈다 — **`::before`/`::after` 유사요소도 별도 셀렉터로 명시**(부모 셀렉터로 커버되지 않음). 의미 있는 애니메이션(스피너)은 끄지 말고 감속. 자세히는 `docs/reduced-motion.md`.

## 접근성
완전한 키보드 조작, 올바른 ARIA 롤/상태, WCAG AA 대비, 폼 컨트롤 라벨 연결(htmlFor/id 또는 aria-label). 네이티브 요소를 우선 사용(예: Radio는 네이티브 라디오 그룹).

**disabled 컨트롤의 부가 정보**: disabled 인풋은 포커스를 받지 못하므로, 잠금 사유 같은 부가 정보를 `Tooltip` 단독으로 전달하면 키보드·스크린리더 사용자가 도달할 수 없다. 항상 보이는 DOM 텍스트로 렌더하고 `aria-describedby`로 인풋에 연결한다. 기준 구현은 `TextField`의 `disabledReason`. 포커스 가능한 `readOnly`는 해당 없음 — `helperText`로 충분하다.

## 팝업 배치
앵커형 팝업(트리거에 상대 위치하는 listbox·달력 다이얼로그 등)은 overflow 조상에 잘리지 않도록 포털로 렌더한다. 포털 호스트는 트리거의 가장 가까운 native `<dialog>`이고, 없으면 `document.body`다. 팝업은 호스트 기준 `position: absolute`로 배치하므로, 뷰포트 `DOMRect` 좌표를 body에서는 `window.scrollX/Y`를 더한 문서 좌표로, dialog에서는 호스트 rect·border·scroll 오프셋을 반영한 로컬 좌표로 변환한다. scoped 테마 안의 팝업이 body로 옮겨도 토큰을 잃지 않게 가장 가까운 `data-theme` 값도 팝업에 전달한다.

배치는 **아래 우선**이다. 열릴 때 1회, 트리거·팝업의 실측 rect로 뷰포트 아래 공간이 부족하고 위 공간이 충분한 경우에만 위로 뒤집는다. 위·아래 둘 다 부족하면 아래를 유지한다. 가로도 오른쪽이 부족하고 왼쪽이 충분할 때만 왼쪽 성장으로 바꾸며, 양쪽이 부족하면 오른쪽 성장을 유지한다. 간격은 팝업의 `--space-1` 계산값을 사용한다. 공용 로직은 내부 훅 `src/utils/useFlipPlacement.ts`(공개 export 아님)에 있다.

측정은 `useLayoutEffect`로 열릴 때 1회만 하고, 첫 측정 전 팝업은 숨긴다. 닫히면 기본 placement와 미측정 상태로 리셋해 다음 오픈이 다시 재측정하게 한다. 스크롤·리사이즈 재계산은 하지 않는다 — 경계값에서 배치가 진동할 위험과 리스너 수명 관리 비용이 이득을 넘는다. CSS 상수(`max-height`, 셀 크기 등)를 JS에 복제하지 않고 렌더 후 실측으로 높이·간격을 얻는다 — 토큰이 바뀌어도 로직이 낡지 않는다.

포털 팝업의 document `pointerdown` 바깥 클릭 판정은 트리거 `.root`와 popup ref를 모두 내부 경계로 취급한다. 포털 내부 클릭을 바깥 클릭으로 닫아 옵션·날짜 선택이 유실되지 않게 하기 위함이다. DOM 접근은 열려 있을 때만 하고 `document`/`window` 존재 여부를 가드해 SSR 렌더 경로에서 전역 객체를 참조하지 않는다. 이 관례는 내부 구현이며 공개 props·export·런타임 의존성을 추가하지 않는다.

명시적으로 `placement` prop을 받는 컴포넌트(예: `Tooltip`)는 소비자가 방향을 직접 지정하므로 이 규칙의 대상이 아니다.

## 기타
- forwardRef를 실제 포커스 대상(input·인터랙티브 루트)에 전달.
- 런타임 의존성 0 — 위치 계산·포커스 트랩 등은 네이티브 API 또는 자체 구현.
- 스토리 카피는 한국어, 이름은 영어. `components-<name>--matrix` 스토리로 라이트/다크 전수 배열.
- `width: 100%`와 padding 을 같은 규칙에 쓰면 `box-sizing: border-box` 를 함께 명시한다 — 전역 리셋이 없어 기본 content-box 는 컨테이너를 padding 만큼 넘친다. `npm run lint:box-sizing` 이 강제한다.
