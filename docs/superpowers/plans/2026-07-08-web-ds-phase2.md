# CREFLE Web DS — Phase 2 구현 계획 (Tier 1 나머지 11종)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 1에서 확립한 Button 4파일 패턴 위에, Tier 1 나머지 11개 컴포넌트(IconButton, TextField, Select, Checkbox, Radio, Switch, Chip+Badge, Card, Dialog, Tooltip, Tabs)를 라이트/다크·접근성·토큰 준수·렌더 검증을 모두 갖춰 구현한다.

**Architecture:** 각 컴포넌트는 `src/components/<Name>/`에 4파일 세트(`.tsx` + `.module.css` + `.stories.tsx` + `.test.tsx`). 공유 토큰은 Task 0에서 일괄 추가. 런타임 의존성 0(위치 계산·포커스 트랩 등 전부 자체 구현 또는 네이티브 API). 각 컴포넌트의 **완전한 스펙(props 인터페이스·수용 테스트 코드·CSS 노트)** 은 `docs/superpowers/specs/phase2-components/NN-<Name>.md`에 있으며, 구현자는 그 파일을 요구사항으로 삼는다.

**Tech Stack:** Phase 1과 동일 — React 19(peer), TS strict, Vite 8 lib, Vitest 4 + Testing Library + userEvent, Storybook 10, 헤드리스 Chrome 렌더 하네스(`npm run shoot`).

**시작점:** repo `/Users/rangkim/Documents/Claude/Projects/CREFLE Web Design System`, tag `phase1` (commit f4443d3). Phase 1 산출물(styles 레이어, cx/ThemeProvider/Icon/Button, 토큰 lint, shoot.sh) 위에 얹는다.

## Global Constraints

- repo: `/Users/rangkim/Documents/Claude/Projects/CREFLE Web Design System` (이하 `$WEB`). 스펙 브리프: 파운데이션 repo `docs/superpowers/specs/phase2-components/`.
- 파일 세트: `src/components/<Name>/<Name>.{tsx,module.css,stories.tsx,test.tsx}`. index.ts에 export 추가(기존 export 유지, append).
- **`.module.css`는 토큰만**: raw 색상(hex/rgb/hsl) 금지, px는 0/1/2만. `npm run lint:tokens`가 이를 강제하고 **미정의 `var(--x)` 참조도 검출**한다 — 존재하지 않는 토큰 참조 시 빌드 실패.
- 런타임 의존성 0. React는 peer. 외부 라이브러리(floating-ui/popper/clsx/react-aria 등) 금지. 로컬 `cx`, 네이티브 API, 자체 구현만.
- 색/텍스트 규칙: 표면 위 레드 텍스트·아이콘은 `var(--primary-text)`(다크 AA), tonal/컨테이너 위 텍스트는 `var(--on-primary-container)`. 순수 #000/#fff 금지.
- 상태 레이어: Button의 `::before` 오버레이 패턴(배경 불변). 포커스는 `:focus-visible { box-shadow: var(--focus-ring) }`.
- 모션: `--motion-*` duration + `--ease-*`. 모든 비자명 애니메이션은 `@media (prefers-reduced-motion: reduce)`로 비활성 (Task 0가 관례 확립).
- 접근성 필수: 완전한 키보드 조작, 올바른 ARIA 롤/상태, WCAG AA 대비, 폼 컨트롤 라벨 연결.
- forwardRef: 소비자가 ref를 붙일 만한 컨트롤(input·인터랙티브 루트)에 적용. `...rest`를 루트/컨트롤에 스프레드.
- 스토리 카피는 한국어, 컴포넌트/prop 이름은 영어. 각 컴포넌트는 라이트/다크 전수 배열 `Matrix` 스토리 포함.
- 테스트: Vitest + RTL + userEvent, 실제 동작 검증(tautology 금지). RTL cleanup은 `src/test/setup.ts`가 자동 처리.
- 커밋: 태스크마다. `git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit`, 메시지 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 트레일러.
- 각 태스크 게이트: `npm run typecheck && npm test && npm run lint:tokens && npm run build` (컴포넌트 태스크는 추가로 `npm run build-storybook` + `npm run shoot`로 라이트/다크 렌더 검증).

---

### Task 0: 공유 토큰 + reduced-motion 관례 (선행 · 모든 컴포넌트가 의존)

**Files:**
- Modify: `$WEB/styles/web-tokens.css` (라이트 기본값 추가 — foundation/tokens.css는 동기화 복사본이라 수정 금지), `$WEB/styles/themes.css` (다크 오버라이드 추가), `$WEB/src/components/Button/Button.module.css` (스피너 reduced-motion 가드 — Phase 1 최종리뷰 M3 보완)
- Create: `$WEB/docs/reduced-motion.md` (관례 1장 문서)

**Interfaces:**
- Produces (이후 모든 컴포넌트가 참조하는 신규 토큰 — 이름 확정, 변경 금지):
  - `--outline` (폼 컨트롤 실보더, surface 대비 ≥3:1 light+dark)
  - `--semantic-error-text` (에러 메시지 텍스트/아이콘, AA ≥4.5:1)
  - `--semantic-{success,error,warning,info,idle}-container` + `--on-semantic-{…}-container` (상태 칩 소프트 배경 + 그 위 텍스트, AA)
  - `--scrim` (모달 배경 스크림)
  - `--dialog-max-{sm,md,lg}` (다이얼로그 최대폭 360/512/720px)

- [ ] **Step 1: web-tokens.css :root에 라이트 값 추가** (아래를 "Color 보강" 섹션 뒤에 삽입)

```css
  /* -------- Outline — 폼 컨트롤 실보더 (surface 대비 ≥3:1, WCAG 1.4.11) -------- */
  --outline: #6E6D78;             /* light: #FBF8FD 대비 ≈4.0:1 (Step 4에서 검증·조정) */

  /* -------- Semantic 텍스트 역할 — 다크에서 밝은 톤으로 스왑 -------- */
  --semantic-error-text: var(--semantic-error);  /* light #B3261E ≈5:1 on #FBF8FD */

  /* -------- Semantic 컨테이너 — 상태 칩 소프트 배경 + 그 위 텍스트 (surface-relative, 다크 오버라이드 있음)
     파운데이션 Stage 2 승격 후보. 라이트 값은 여기, 다크는 themes.css. -------- */
  --semantic-success-container:    #E6F4EA;  --on-semantic-success-container: #0E5223;
  --semantic-error-container:      #FBEAE8;  --on-semantic-error-container:   #8C1D18;
  --semantic-warning-container:    #FBF0D0;  --on-semantic-warning-container: #6B4E00;
  --semantic-info-container:       #E5EDFB;  --on-semantic-info-container:    #0A458F;
  --semantic-idle-container:       #ECEDEF;  --on-semantic-idle-container:    #3B4147;

  /* -------- Scrim + Dialog 폭 (테마 무관 폭; scrim은 다크 오버라이드 있음) -------- */
  --scrim: rgba(27, 27, 31, 0.45);
  --dialog-max-sm: 360px;
  --dialog-max-md: 512px;
  --dialog-max-lg: 720px;
```

- [ ] **Step 2: themes.css `[data-theme='dark']`에 다크 오버라이드 추가**

```css
  /* Outline — 다크 surface #1B1D21 대비 ≥3:1 */
  --outline: #8E9099;                            /* ≈4.2:1 on #1B1D21 (Step 4 검증) */
  /* Semantic 텍스트 — 다크에서 밝은 톤 */
  --semantic-error-text: #F2B8B5;                /* ≈10:1 on #1B1D21 */
  /* Semantic 컨테이너 — 다크 surface-relative 틴트 */
  --semantic-success-container: #17311F;  --on-semantic-success-container: #A6D9B6;
  --semantic-error-container:   #3A1512;  --on-semantic-error-container:   #F2B8B5;
  --semantic-warning-container: #362B04;  --on-semantic-warning-container: #F2D48F;
  --semantic-info-container:    #14243F;  --on-semantic-info-container:    #AEC9F5;
  --semantic-idle-container:    #2A2D33;  --on-semantic-idle-container:    #C4C6CC;
  /* Scrim — 다크는 더 짙게 */
  --scrim: rgba(0, 0, 0, 0.60);
```

- [ ] **Step 3: Button 스피너 reduced-motion 가드 추가** (`Button.module.css`의 `@keyframes spin` 사용부에 대해, 파일 하단에 추가)

```css
@media (prefers-reduced-motion: reduce) {
  .spinner { animation-duration: 1.6s; }  /* 회전은 유지하되 느리게 — 로딩 의미 보존 */
  .button { transition: none; }
}
```

- [ ] **Step 4: 대비 검증 스크립트 실행** — 모든 신규 값이 목표 대비를 만족하는지 계산

Node 인라인 스크립트로 WCAG 대비를 계산한다: `--outline`(light/dark vs 각 surface) ≥3:1; `--semantic-error-text` ≥4.5:1; 각 `--on-semantic-*-container` vs 대응 `--semantic-*-container`(같은 테마) ≥4.5:1. 미달 항목은 목표를 넘도록 hex를 조정(어둡게/밝게)하고 재계산. 계산에 쓴 스크립트와 최종 값·비율을 리포트에 남긴다.
Expected: 모든 쌍이 목표 이상. (제안값은 근사치이므로 조정 가능 — 단 이름은 고정.)

- [ ] **Step 5: reduced-motion 관례 문서**

`docs/reduced-motion.md`: "모든 컴포넌트의 transition/animation은 `@media (prefers-reduced-motion: reduce)`로 비활성(또는 무해하게 감속)한다. 예시 블록 포함. 이후 컴포넌트는 이 패턴을 따른다." (1장, 예시 CSS 포함)

- [ ] **Step 6: 게이트 + 커밋**

Run: `npm run lint:tokens && npm test && npm run build`
Expected: `token lint OK`(신규 토큰 정의됨), 테스트 14/14 유지, 빌드 성공.

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "feat: phase 2 shared tokens (outline, semantic containers, scrim, dialog widths) + reduced-motion convention

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Tasks 1–11: 컴포넌트 (공통 절차)

각 컴포넌트 태스크는 **동일한 절차**를 따른다. 아래 템플릿을 각 태스크에 적용하고, 컴포넌트별 세부는 지정된 스펙 파일이 소스다.

**공통 절차 (TDD):**
1. 스펙 파일 `docs/superpowers/specs/phase2-components/NN-<Name>.md`를 읽는다 — props 인터페이스, 수용 테스트(전체 코드), CSS 노트, 접근성 계약, 렌더 검증 체크리스트가 전부 그 안에 있다.
2. `<Name>.test.tsx`에 스펙의 수용 테스트를 작성 → 실패 확인(RED).
3. `<Name>.tsx` + `<Name>.module.css` 구현(스펙의 props 인터페이스·CSS 노트 준수, Button/Icon 패턴 따름) → 테스트 통과(GREEN).
4. `src/index.ts`에 스펙의 export 라인 추가.
5. `<Name>.stories.tsx` 작성(Matrix 스토리 포함, 한국어 카피).
6. 게이트: `npm run typecheck && npm test && npm run lint:tokens && npm run build && npm run build-storybook`.
7. 렌더 검증: `npm run shoot -- components-<name>--matrix light` / `… dark` → 두 PNG를 Read로 열어 스펙의 렌더 검증 체크리스트를 라이트/다크 양쪽에서 확인. 실패 시 수정→재렌더.
8. 커밋(트레일러 포함).

**컴포넌트 CSS에 raw 색상/px가 스펙 예시에 있으면**(예: 크기값) 대응 토큰으로 치환 — Button의 control-height 사례처럼. 스펙에 없는 신규 토큰이 필요하면 중단하고 보고(Task 0에서 누락된 것).

---

### Task 1: IconButton
- 스펙: `docs/superpowers/specs/phase2-components/01-IconButton.md` (수용 테스트 9)
- 핵심: standard/filled/tonal × sm/md/lg(정사각 --control-height-*, --radius-full), toggle 모드(제어/비제어, aria-pressed), `aria-label` 타입 레벨 필수, Icon 내부 재사용(장식), Button과 동일한 ::before 상태 레이어 + `type='button'` 기본.
- Story id: `components-iconbutton--matrix`. Export: IconButton + 타입.

### Task 2: TextField
- 스펙: `.../02-TextField.md` (수용 테스트 7). New token: `--outline`, `--semantic-error-text` (Task 0 제공).
- 핵심: label/helper/error(aria-describedby/aria-invalid 연결), leading/trailing Icon 슬롯, default/focus/error/disabled, 보더 `--outline`(rest)/`--primary`(focus)/`--semantic-error`(error), 메시지 텍스트는 `--semantic-error-text`. forwardRef→input. sm/md/lg.
- Story id: `components-textfield--matrix`.

### Task 3: Select
- 스펙: `.../03-Select.md` (수용 테스트 12). New token: `--outline`.
- 핵심: 커스텀 listbox(네이티브 select 아님), 트리거+팝오버, role=listbox/option, aria-selected/activedescendant, 키보드(Up/Down/Home/End/Enter/Esc/타입어헤드), 외부클릭+Esc 닫기, 옵션 그룹, 위치는 CSS 앵커(라이브러리 없음), 제어/비제어.
- Story id: `components-select--matrix`.

### Task 4: Checkbox
- 스펙: `.../04-Checkbox.md` (수용 테스트 8). New token: `--outline`.
- 핵심: checked/unchecked/indeterminate(ref로 네이티브 input.indeterminate), 시각 숨김 네이티브 input 위 커스텀 박스, 박스에 focus-visible 링, forwardRef→input, disabled.
- Story id: `components-checkbox--matrix`.

### Task 5: Radio (+ RadioGroup)
- 스펙: `.../05-Radio.md` (수용 테스트 11). New token: `--outline`.
- 핵심: Radio(스타일 라디오+라벨) + RadioGroup(name/value/onChange 컨텍스트, role=radiogroup), 네이티브 라디오 그룹의 화살표 선택 활용, 시각 숨김 input 위 커스텀 도트, forwardRef, 아이템/그룹 disabled.
- Story id: `components-radio--matrix`. Export: Radio + RadioGroup + 타입.

### Task 6: Switch
- 스펙: `.../06-Switch.md` (수용 테스트 8). New token: `--outline`.
- 핵심: role=switch(네이티브 checkbox+aria), 트랙+썸(–-motion-base로 슬라이드, reduced-motion 가드), 라벨 배치(start/end), 시각 숨김 input, checked 트랙 `--primary`, forwardRef, disabled.
- Story id: `components-switch--matrix`.

### Task 7: Chip + Badge
- 스펙: `.../07-Chip.md` (수용 테스트 7). New tokens: `--outline` + 시맨틱 컨테이너 10종(Task 0 제공). **디렉토리 하나에 Chip과 Badge 두 컴포넌트** (Chip.{tsx,module.css,stories,test} + Badge.{…}).
- 핵심: Chip = 상태 변형(success/error/warning/info/idle → `--semantic-*-container`/`--on-semantic-*-container`) + 필터/선택 변형(aria-pressed) + leading Icon + removable(trailing X는 **IconButton 재사용** → Task 1 선행) + onRemove. Badge = 카운트(max 캡 99+) 또는 도트.
- Story ids: `components-chip--matrix`, `components-badge--matrix`. Export: Chip + Badge + 타입 전부.
- **의존성: Task 1(IconButton) 완료 후.**

### Task 8: Card (+ CardHeader/CardBody/CardFooter)
- 스펙: `.../08-Card.md` (수용 테스트 7).
- 핵심: surface/elevation 레벨(--surface-container-*/--elevation-*), header/body/footer 서브컴포넌트 컴포지션, interactive 변형(호버/클릭 → 상태 레이어, 키보드 포커스), --radius-lg, 보더 --outline-variant(장식 OK).
- Story id: `components-card--matrix`. Export: Card + CardHeader + CardBody + CardFooter + 타입.

### Task 9: Dialog
- 스펙: `.../09-Dialog.md` (수용 테스트 8). New tokens: `--scrim`, `--dialog-max-*`.
- 핵심: **네이티브 `<dialog>`**(showModal/close — 포커스 트랩·top-layer·Esc 내장), sm/md/lg(max-width 토큰), 배경 클릭 닫기(가드 가능), title(aria-labelledby)/body/footer, 제어 open + onClose, 스크롤 락, reduced-motion 가드 enter 애니메이션. 스토리에서 Button 재사용.
- Story id: `components-dialog--matrix`(또는 트리거 스토리 — 렌더 검증 가능하게).

### Task 10: Tooltip
- 스펙: `.../10-Tooltip.md` (수용 테스트 6). New token: `--outline`.
- 핵심: 4방향(top/bottom/left/right, CSS 위치, 라이브러리 없음), 호버+키보드 포커스에 표시/blur·mouseleave·Esc에 숨김, 오픈 지연(~400ms, setTimeout+cleanup), role=tooltip + aria-describedby 연결, 비인터랙티브, reduced-motion 가드 페이드.
- Story id: `components-tooltip--matrix`.

### Task 11: Tabs
- 스펙: `.../11-Tabs.md` (수용 테스트 7). New token: `--outline`.
- 핵심: 언더라인 스타일, role=tablist/tab/tabpanel + aria-selected/controls + roving tabindex, 키보드(Left/Right/Home/End 포커스 이동, 선택 방식은 스펙의 결정 따름), 애니메이션 액티브 언더라인(reduced-motion 가드), 제어/비제어, config-driven API(스펙 결정).
- Story id: `components-tabs--matrix`.

---

### Task 12: Phase 2 최종 게이트 + 태그

**Files:** 없음(검증만)

- [ ] **Step 1: 전체 게이트**

Run: `npm run check` (typecheck+test+lint:tokens+build+build-storybook 통합)
Expected: 전부 green. 테스트 수 = 14(Phase 1) + 11개 컴포넌트 수용 테스트 합계(≈90).

- [ ] **Step 2: index.ts export 전수 확인**

11개 컴포넌트(+ 서브컴포넌트 Card*/RadioGroup/Badge)가 전부 `src/index.ts`에서 export되고 `dist/index.d.ts`에 타입이 나오는지 확인.

- [ ] **Step 3: 커밋 + 태그**

```bash
git add -A && git -c user.name="RangKim" -c user.email="jg.kim@crefle.com" commit -m "chore: phase 2 complete — Tier 1 components (11)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" --allow-empty
git tag phase2
```

---

## 최종 whole-branch 리뷰

전 태스크 완료 후, `phase1..HEAD` 범위를 가장 유능한 모델로 whole-branch 리뷰(Phase 1과 동일 방식): 대비 재계산·토큰 그래프 전수·접근성 계약·컴포넌트 간 일관성. 발견은 한 번의 fix 배치로 처리 후 태그 확정.

## 컴포넌트 빌드 순서 / 의존성
Task 0 → 1(IconButton) → 2(TextField) → 3(Select) → 4(Checkbox) → 5(Radio) → 6(Switch) → 7(Chip+Badge, **IconButton 의존**) → 8(Card) → 9(Dialog) → 10(Tooltip) → 11(Tabs) → 12(게이트). Task 1 외의 순서는 대체로 독립.

## Self-Review (작성 후 점검 완료)
1. **스펙 커버리지**: 스펙의 모든 newTokensNeeded가 Task 0에 집계됨(--outline, --semantic-error-text, 컨테이너 10종, --scrim, --dialog-max 3종). 11개 컴포넌트 전부 태스크 존재.
2. **Placeholder**: 각 컴포넌트의 완전한 코드(props·테스트·CSS)는 스펙 파일에 존재하며 구현자가 그 파일을 읽음. 계획은 스펙 파일을 소스로 명시.
3. **의존성**: Chip의 removable이 IconButton 사용 → Task 1이 Task 7 앞. Dialog 스토리가 Button 사용(Phase 1 존재). 명시됨.
4. **토큰 정의 위치**: 라이트=web-tokens.css(:root), 다크=themes.css. foundation/tokens.css(동기화 복사본)는 건드리지 않음 — 명시됨.
