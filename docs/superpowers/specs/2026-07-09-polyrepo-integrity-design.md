# CREFLE DS 폴리레포 정합성 — 설계

**작성일:** 2026-07-09
**대상 repo:** `CREFLEINC/design-system-v2-webui` (주), `CREFLEINC/design-system-v2` (문서 이관·공개범위)
**상태:** 승인됨 (RangKim, 2026-07-09)

## 배경

CREFLE 디자인 시스템은 폴리레포다. 파운데이션(`design-system-v2`)이 브랜드 토큰의 단일 진실원이고, 웹 UI 라이브러리(`design-system-v2-webui`, `@crefle/web-ui`)가 첫 소비자다. 둘은 npm 의존이 아니라 **vendoring + PIN** 으로 묶인다: `scripts/sync-foundation.sh`가 파운데이션의 `tokens.css`와 woff2 폰트를 `styles/foundation/`으로 복사하고, 그때의 파운데이션 커밋 해시를 `styles/foundation/PIN`에 7자로 적는다.

이 구조의 강점은 실측으로 확인됐다. webui repo를 빈 디렉토리에 클린 클론해 `npm ci && npm run check`를 돌리면 파운데이션 repo 없이도 typecheck·204개 테스트·토큰 lint·라이브러리 빌드·Storybook 빌드가 모두 통과한다(exit 0). 소비자는 원하는 모듈만 받아서 고칠 수 있다.

약점은 네 가지다.

1. **미러를 직접 고치는 걸 막는 장치가 없다.** `styles/foundation/tokens.css`가 읽기 전용이라는 건 규칙일 뿐이다. 고쳐도 아무 경고가 없고 다음 sync에 조용히 덮어써진다.
2. **`sync-foundation.sh`가 로컬 경로에 묶여 있다.** 기본값이 `$HOME/Documents/Claude/Projects/CREFLE Design System`이라 다른 머신·CI에서 동작하지 않는다.
3. **PIN이 검증되지 않는다.** 커밋 해시 7자만 있고 파일 내용의 지문이 없다.
4. **웹 DS 문서가 파운데이션 repo에 있다.** 컴포넌트 25종 스펙과 phase1~4 플랜이 `design-system-v2/docs/superpowers/`에 있어서, webui만 받은 사람은 설계 의도를 볼 수 없다. 더해서 파운데이션이 PUBLIC이고 webui가 PRIVATE이라 공개 범위가 뒤집혀 있다.

## 핵심 관찰: drift에는 방향이 둘 있다

문제 1과 3은 같은 문제의 두 방향이다.

**아래쪽 drift (오염, tamper)** — 누가 미러 파일을 직접 고쳐 미러가 출처와 달라진 상태. **에러**여야 하고, 네트워크 없이 즉시 감지돼야 한다.

**위쪽 drift (노후, staleness)** — 파운데이션이 앞서 나갔는데 미러가 옛 버전인 상태. **경고**여야 한다(의도적으로 옛 버전에 핀을 박을 수 있다). 파운데이션 repo에 접근해야만 알 수 있다.

현재의 `PIN`은 둘 다 감지하지 못한다. 커밋 해시만 있고 파일 지문이 없어, 미러를 고쳐도 PIN은 그대로다. PIN을 **파일별 sha256을 담는 lock 파일**로 승격하는 것이 두 문제의 공통 해법이다.

## 검토한 대안

**A안 — lock 파일 + 단일 검사 스크립트.** (채택) tamper 검사가 lock 파일만 보므로 오프라인·CI 어디서든 돌고, `--upstream` 플래그를 줄 때만 원격에 접근해 staleness를 경고한다. 검사가 하나라 로컬 게이트와 CI가 같은 코드를 부른다.

**B안 — git submodule / subtree.** 미러를 git이 직접 추적하면 수정 여부는 `git status`가 안다. 배제 이유: submodule은 `clone --recursive`를 모르는 사람이 빈 디렉토리를 받아 **클린 클론 한 방에 빌드되는 성질**을 깬다. 그 성질이 이 프로젝트의 핵심 자산이다.

**C안 — 헤더 주석 + CODEOWNERS.** 강제력이 사회적 규범 수준이고 로컬에서 아무 신호가 없다. lock 파일 없이는 "고쳤는지"를 기계가 판정할 방법이 아예 없다. A안이 C안의 안내문을 포함할 수 있으므로 흡수된다.

## 결정 사항

브레인스토밍에서 확정된 것:

| 항목 | 결정 |
|---|---|
| 강제 지점 | 로컬 게이트(`npm run check`) + CI(GitHub Actions) + branch protection, 동일 스크립트 |
| 동기화 소스 | 원격 git에서 특정 ref를 fetch (기본 `design-system-v2` / `main`), `FOUNDATION_DIR`로 로컬 오버라이드 유지 |
| 스펙 이관 | 웹 DS 문서 전부 webui repo로 이관, 파운데이션 원본 삭제, 포인터만 남김 |
| 공개 범위 | webui = **PUBLIC**, 파운데이션 = **PRIVATE** |
| 병합 차단 | webui `main` 직접 push 금지, PR 필수, `check` 잡을 required status check로 지정 (리뷰어 승인은 요구하지 않음) |
| 라이선스 | 코드 = 독점(All rights reserved), 번들 폰트 = 원 라이선스 전문 동봉 |

공개 범위 결정은 브레인스토밍 중 한 번 뒤집혔다. 처음에는 "둘 다 PRIVATE"이었으나, GitHub이 **private repo의 branch protection을 유료 플랜에서만** 허용하고 `CREFLEINC` org가 Free 플랜임이 확인되면서(API가 403 `Upgrade to GitHub Pro or make this repository public`) "private + 병합 차단"이 동시에 성립하지 않게 되었다. 병합 차단을 택하고 webui를 public으로 열기로 했다.

---

## 1. 무결성 계층

### 파일 배치

```
styles/foundation/
  foundation.lock.json     ← PIN 대체
  README.md                ← 사람을 위한 DO-NOT-EDIT 안내
  tokens.css               ← 동봉 미러 (내용 무수정)
  fonts/*.woff2            ← 6개
  fonts/LICENSE-*.txt      ← 폰트 원 라이선스 전문 (§4)
scripts/
  foundation-lock.mjs      ← 순수 로직 (hashFile, readLock, verifyMirror)
  sync-foundation.mjs      ← 갱신기 (lock 생성)
  check-foundation.mjs     ← 검사기 CLI (--upstream)
```

기존 `styles/foundation/PIN`과 `scripts/sync-foundation.sh`는 삭제한다.

### lock 스키마

해시 값은 모두 예시다.

```json
{
  "repo": "https://github.com/CREFLEINC/design-system-v2.git",
  "ref": "main",
  "commit": "<전체 40자 SHA>",
  "syncedAt": "2026-07-09T03:12:00Z",
  "files": {
    "tokens.css": "sha256:9f2a…",
    "fonts/MaterialSymbolsRounded.woff2": "sha256:c41b…",
    "fonts/SpoqaHanSansNeo-Thin.woff2": "sha256:…",
    "fonts/SpoqaHanSansNeo-Light.woff2": "sha256:…",
    "fonts/SpoqaHanSansNeo-Regular.woff2": "sha256:…",
    "fonts/SpoqaHanSansNeo-Medium.woff2": "sha256:…",
    "fonts/SpoqaHanSansNeo-Bold.woff2": "sha256:…"
  }
}
```

- `commit`은 전체 40자 SHA. 7자 축약은 충돌 여지가 있고 `git ls-remote` 결과와 직접 비교할 수 없다.
- `ref`와 `commit`을 모두 담는다. `ref`는 "무엇을 따라가려 했는가"(의도), `commit`은 "무엇을 실제로 받았는가"(사실)이다. staleness 검사가 이 둘을 비교한다.
- `syncedAt`은 사람이 읽기 위한 필드이며 **검사에 사용하지 않는다.** 검사는 결정적이어야 한다.
- `files`의 키는 `styles/foundation/` 기준 상대 경로, POSIX 구분자로 고정한다.
- `--allow-dirty`로 동기화한 경우에만 최상위에 `"dirty": true`를 추가한다. 검사기는 이 필드를 보면 경고를 출력하되 실패시키지는 않는다.

### 미러 파일은 수정하지 않는다

`tokens.css` 상단에 `DO NOT EDIT` 배너를 주입하지 않는다. 주입하면 미러가 업스트림과 바이트 동일하지 않게 되어 "미러 == 업스트림"이라는 가장 강한 불변식을 잃는다. 사람을 위한 안내는 `styles/foundation/README.md`에 둔다. (현재 미러는 파운데이션 원본과 바이트 동일함을 `cmp`로 확인했다.)

### `verifyMirror(dir, lock) → problems[]`

순수 함수. 프로세스를 띄우지 않고 단위 테스트할 수 있도록 CLI에서 분리한다. 다음 네 조건에서 문제를 보고한다.

1. lock 파일이 없거나 파싱 불가
2. lock에 적힌 파일이 디스크에 없음
3. 파일의 sha256이 lock과 불일치 (= 수정됨)
4. lock에 없는 파일이 `styles/foundation/` 안에 존재 (= 몰래 추가됨)

4번의 허용 목록은 `foundation.lock.json`, `README.md`, `fonts/LICENSE-*.txt`다. 이 검사가 없으면 누군가 미러 디렉토리에 자기 토큰 파일을 끼워 넣어도 통과한다.

**신뢰 루트의 한계.** lock 파일 자체를 수정해 변조된 미러의 해시와 맞추면 검사는 통과한다. 이 검사는 악의적 우회가 아니라 **실수**(미러를 원본으로 착각하고 고치는 것)를 막기 위한 것이다. lock 파일 변경은 커밋 diff에 눈에 띄게 드러나므로 코드 리뷰가 마지막 방어선이다.

문제가 하나라도 있으면 `check-foundation.mjs`는 `exit 1`과 함께 다음 행동을 지시한다.

> `styles/foundation/tokens.css`는 파운데이션 repo의 동봉본입니다. 직접 수정하지 마세요.
> 파운데이션(`CREFLEINC/design-system-v2`)에서 고친 뒤 `npm run sync-foundation`을 실행하세요.

### `--upstream` (staleness)

**절대 실패하지 않는다.** 항상 `exit 0`.

1. `git ls-remote $repo $ref` → 원격 SHA
2. 원격 SHA == `lock.commit` → "최신" 출력, 종료
3. 다르면 원격 ref의 `tokens.css`만 받아 sha256을 `lock.files["tokens.css"]`와 비교
   - 같으면: "파운데이션이 N커밋 앞서 있으나 `tokens.css`는 동일 (문서 변경뿐)"
   - 다르면: "토큰이 변경됨. `npm run sync-foundation` 실행을 검토하세요."
4. 네트워크·인증 실패 → 경고 출력 후 `exit 0`

오프라인에서도, 파운데이션 접근 토큰이 없는 CI에서도 빌드가 멈추면 안 되기 때문이다.

---

## 2. 동기화 스크립트 재작성

`scripts/sync-foundation.sh`(bash) → `scripts/sync-foundation.mjs`(node, 런타임 의존성 0).

bash를 버리는 이유는 이 스크립트가 이제 sha256을 계산해 JSON을 써야 하기 때문이다. bash로는 `shasum` 호출과 수동 JSON 조립이 필요하지만 node는 `node:crypto` + `JSON.stringify`로 끝난다.

### 인터페이스

```
npm run sync-foundation                               # 기본: 원격 main
FOUNDATION_REF=v1.0.0 npm run sync-foundation         # 특정 태그/커밋에 핀
FOUNDATION_DIR="../CREFLE Design System" npm run …    # 로컬 체크아웃 (동시 작업용)
FOUNDATION_REPO=git@github.com:… npm run …            # 소스 repo 교체
```

기본값: `FOUNDATION_REPO=https://github.com/CREFLEINC/design-system-v2.git`, `FOUNDATION_REF=main`.
`FOUNDATION_DIR`이 **설정된 경우에만** 로컬 경로를 사용한다. 로컬 경로가 기본값인 현재 동작은 사라진다.

### 동작

1. 소스 결정. `FOUNDATION_DIR`이 있으면 그 디렉토리, 없으면 임시 디렉토리에 얕은 sparse clone:
   ```
   git clone --depth 1 --branch $REF --filter=blob:none --sparse $REPO $TMP
   git -C $TMP sparse-checkout set tokens.css ds-bundle/fonts
   ```
   필요한 blob만 받으므로 `onmyfactory/` 같은 무거운 디렉토리는 네트워크를 타지 않는다. 파운데이션이 private이어도 전역 설정된 `gh` credential helper(`credential.https://github.com.helper`)가 자동 인증한다.

2. `FOUNDATION_DIR` 사용 시 **working tree가 dirty하면 거부**한다. 커밋되지 않은 토큰 변경을 복사하면 lock의 커밋 SHA가 가리키는 내용과 실제 파일이 영구히 어긋난다. `--allow-dirty`로 강제할 수 있고, 그때는 lock에 `"dirty": true`를 남긴다.

3. 전체 40자 커밋 SHA를 해석한다 (`git rev-parse HEAD`).

4. `tokens.css` → `styles/foundation/tokens.css`, `ds-bundle/fonts/*.woff2` → `styles/foundation/fonts/`로 복사. 내용은 수정하지 않는다.

5. `foundation.lock.json`을 재생성하고, 무엇이 바뀌었는지(파일별 추가/변경/삭제) 요약을 출력한다.

임시 디렉토리는 성공·실패 무관하게 정리한다.

---

## 3. 문서 이관

webui repo에 `docs/superpowers/`를 만들고 파운데이션의 웹 DS 문서 29개를 옮긴다.

```
docs/superpowers/specs/2026-07-08-web-frontend-ds-design.md
docs/superpowers/specs/phase2-components/*.md   (11)
docs/superpowers/specs/phase3-components/*.md   (10)
docs/superpowers/specs/phase4-components/*.md   (3)
docs/superpowers/plans/2026-07-08-web-ds-phase{1,2,3,4}.md
docs/superpowers/specs/2026-07-09-polyrepo-integrity-design.md   ← 이 문서
docs/component-conventions.md   ← 위치 유지
docs/reduced-motion.md          ← 위치 유지
docs/token-sheet.html           ← 위치 유지
```

webui의 `docs/2026-07-08-web-frontend-ds-design.md`는 파운데이션본과 **바이트 동일**함을 `cmp`로 확인했다. `specs/` 아래 한 벌만 남기고 루트 사본은 삭제한다.

두 repo가 별개라 `git mv`로 히스토리를 끌고 올 수 없다. `git filter-repo`로 서브트리를 추출해 병합하는 방법은 문서 29개에 비해 과하다. **복사 후 커밋**하고 커밋 메시지에 출처를 명시한다: `Moved from CREFLEINC/design-system-v2@7ea18c4`. 원본 히스토리는 파운데이션 repo에 남으므로 소실되는 정보는 없다.

파운데이션 쪽은 해당 파일을 삭제하고 `docs/README.md` 하나만 남긴다 — 웹 DS 문서가 어디로, 언제, 어느 커밋에서 갔는지. 파운데이션의 `docs/`는 앞으로 파운데이션 자신의 스펙이 들어올 자리가 된다.

---

## 4. 공개 범위와 라이선스

```
gh repo edit CREFLEINC/design-system-v2      --visibility private --accept-visibility-change-consequences
gh repo edit CREFLEINC/design-system-v2-webui --visibility public  --accept-visibility-change-consequences
```

파운데이션에는 `onmyfactory/` 브랜드 리디자인 산출물, 로고 SVG 원본, 정적 스타일 가이드가 들어 있어 private으로 돌린다. webui는 branch protection을 쓰기 위해 public으로 연다(§5 참조).

### 무엇이 실제로 공개되는가

webui가 `styles/foundation/tokens.css`를 통째로 동봉하므로, **파운데이션을 private으로 돌려도 브랜드 토큰 전체(브랜드 레드 `#C9252C` 포함)는 공개된다.** 여기에 이관되는 컴포넌트 스펙 29개와 OnMyFactory 대시보드 데모도 함께 공개된다. 데모 fixture는 전부 가공된 상수이므로 실제 공장 데이터는 노출되지 않는다(`src/demo/fixtures.ts` 확인).

파운데이션을 private으로 돌려 실제로 가려지는 것은 `onmyfactory/`, `assets/`(로고 원본), `index.html`뿐이다. "브랜드를 비공개로 유지한다"가 목적이었다면 이 조합으로는 달성되지 않는다는 점을 명시적으로 수용한다.

### 라이선스 (public 전환의 선행 조건)

**코드 — 독점.** `LICENSE`에 저작권 고지와 "All rights reserved"를 명시한다. `package.json`에 `"license": "UNLICENSED"`를 추가한다(`"private": true`는 유지 — 이건 npm 퍼블리시 방지 플래그로 repo 공개 범위와 무관하다). 소스는 열람 가능하지만 사용·복제·파생은 허용하지 않는다.

**번들 폰트 — 원 라이선스 동봉 (의무).** repo에 폰트 6개가 라이선스 파일도 저작권 고지도 없이 들어 있다. 재배포 시 라이선스 전문 포함이 요구되므로, public 전환 **전에** 반드시 추가한다.

| 폰트 | 라이선스 | 추가할 파일 |
|---|---|---|
| Spoqa Han Sans Neo (Thin/Light/Regular/Medium/Bold) | SIL OFL 1.1 | `styles/foundation/fonts/LICENSE-SpoqaHanSansNeo.txt` |
| Material Symbols Rounded | Apache-2.0 | `styles/foundation/fonts/LICENSE-MaterialSymbols.txt` |

이 두 파일은 파운데이션에서 동기화된 것이 아니므로 lock의 `files`에 등재되지 않는다. 그대로 두면 `verifyMirror`의 4번 검사(미등록 파일 = 에러)에 걸린다. 그래서 §1의 허용 목록에 `fonts/LICENSE-*.txt`가 처음부터 포함돼 있다 — 2단계에서 검사기를 구현할 때 이미 반영하고, 5단계는 파일만 추가한다.

### private 파운데이션이 sync에 주는 영향

`sync-foundation.mjs`의 기본 `FOUNDATION_REPO`가 private repo를 가리키게 된다. webui를 클론한 외부인은 `npm run sync-foundation`을 실행할 수 없다. 이는 의도된 것이다 — 토큰 동기화는 메인테이너의 작업이다. **`check-foundation.mjs`는 오프라인이므로 누구나 실행할 수 있고 CI도 green이다.** 이 사실을 `styles/foundation/README.md`에 적는다.

---

## 5. CI와 병합 차단

### CI는 파운데이션 repo에 접근하지 않는다

이 점을 오해하기 쉬우므로 못박아 둔다. CI가 하는 일은 repo 안의 `foundation.lock.json`에 적힌 sha256과 같은 repo 안 `styles/foundation/`의 실제 파일을 대조하는 것이다. 파운데이션 원본을 clone하지 않는다. 즉 **원본의 *현재* 가 아니라 *마지막으로 동의한 시점* 과 비교한다.** 그래야 (a) 파운데이션이 private이어도 CI에 자격증명이 필요 없고, (b) 파운데이션에 누가 커밋했다고 해서 webui의 CI가 아무 변경 없이 빨개지지 않으며, (c) 로컬과 CI가 항상 같은 판정을 내린다.

파운데이션이 앞서 나갔는지는 `check:foundation:upstream`이 알려주며, 이것은 수동이고 절대 실패하지 않는다.

### 워크플로우

webui repo에만 `.github/workflows/ci.yml`을 둔다. 파운데이션 repo에는 빌드도 테스트도 없어 검사할 대상이 없다.

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24', cache: npm }
      - run: npm ci
      - run: npm run check
```

로컬은 Node 25(current), CI는 24(LTS)로 잡고 `package.json`에 `engines: { "node": ">=20.19" }`를 명시한다.

### npm scripts

```jsonc
{
  "check:foundation": "node scripts/check-foundation.mjs",
  "check:foundation:upstream": "node scripts/check-foundation.mjs --upstream",
  "sync-foundation": "node scripts/sync-foundation.mjs",
  "check": "npm run check:foundation && npm run typecheck && npm test && npm run lint:tokens && npm run build && npm run build-storybook"
}
```

`check:foundation`을 **맨 앞**에 둔다. 1초짜리 검사라 미러가 오염됐으면 5분짜리 Storybook 빌드를 기다리기 전에 즉시 죽는다.

`check:foundation:upstream`은 네트워크가 필요하므로 `check`에 넣지 않는다. 토큰을 갱신하려는 사람이 명시적으로 부르는 명령이다.

### 병합 차단 (branch protection)

CI가 빨간 X를 띄우는 것만으로는 병합이 막히지 않는다. 실제 차단은 branch protection이 한다.

```
gh api -X PUT repos/CREFLEINC/design-system-v2-webui/branches/main/protection \
  -F required_status_checks[strict]=true \
  -F 'required_status_checks[contexts][]=check' \
  -F enforce_admins=false \
  -F required_pull_request_reviews[required_approving_review_count]=0 \
  -F restrictions=null
```

`main` 직접 push를 금지하고 PR을 필수로 하며, `check` 잡을 required status check로 지정한다. **리뷰어 승인은 요구하지 않는다** — 현재 1인 개발이라 자기 PR을 승인할 수 없어 스스로 막히기 때문이다. 팀이 늘면 `required_approving_review_count`를 올린다.

`enforce_admins=false`로 두어 관리자가 긴급 상황에 우회할 수 있게 한다.

이 설정은 지금까지의 워크플로우를 바꾼다. webui repo의 29개 커밋은 전부 `main` 직행이었으나, 이후로는 브랜치 → PR → CI green → 병합이 된다. 그래서 이 설정은 **구현 순서의 맨 마지막**에 적용한다(§7).

방어선은 세 겹이 된다. 로컬 `npm run check`가 즉시 실패하고, CI가 PR에서 실패 표시를 내고, branch protection이 병합을 물리적으로 막는다.

---

## 6. 검증

**단위 테스트.** `verifyMirror`가 순수 함수이므로 임시 디렉토리 픽스처로 통과 경로 1개와 실패 경로 4개(lock 없음 / 파일 없음 / 해시 불일치 / 미등록 파일)를 테스트한다. `vite.config.ts`의 `test.include`를 `['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs']`로 넓힌다.

**실증 리허설.** 단위 테스트만으로는 게이트가 실제로 걸리는지 알 수 없다. 실제 `styles/foundation/tokens.css`를 1바이트 수정하고 `npm run check`가 실패하는지 확인한 뒤, `git checkout`으로 되돌려 통과하는지 확인한다.

**이관 무결성.** 파운데이션에서 삭제한 29개 파일과 webui에 생성한 29개 파일의 sha256을 대조해 무손실을 확인한다.

**클린 클론.** push 후 빈 디렉토리에 클론해 `npm ci && npm run check`가 green인지 재확인한다. 파운데이션 repo가 없는 상태여야 한다.

**CI.** 첫 workflow run이 green인지 `gh run watch`로 확인한다.

**병합 차단.** protection을 켠 뒤, 미러를 일부러 변조한 브랜치로 PR을 열어 `check`가 실패하고 병합 버튼이 잠기는지 확인한다. 확인 후 PR을 닫고 브랜치를 지운다. `main` 직접 push가 거부되는지도 확인한다.

**라이선스.** public 전환 **직전에** `LICENSE`, `package.json`의 `license` 필드, 폰트 라이선스 2종이 모두 존재하는지 확인한다. 하나라도 없으면 전환하지 않는다.

---

## 7. 작업 순서

일곱 단계. 각각 독립적으로 되돌릴 수 있다. **아직 `main` 직행이 가능한 동안** 1~6을 끝내고, 마지막에 branch protection을 켠다.

1. **lock 스키마 + sync 재작성** (webui) — `foundation-lock.mjs`, `sync-foundation.mjs`, `styles/foundation/README.md`. `PIN`과 `sync-foundation.sh` 삭제. 실행해 `foundation.lock.json` 생성.
2. **검사기 + 테스트 + 게이트 배선** (webui) — `check-foundation.mjs`, `scripts/check-foundation.test.mjs`, `vite.config.ts` include 확장, `package.json` scripts·engines.
3. **CI** (webui) — `.github/workflows/ci.yml`. push 후 첫 run이 green인지 확인.
4. **문서 이관** (webui + 파운데이션, 유일하게 두 repo를 동시에 건드림) — 29개 복사, 루트 중복본 삭제, `README.md`의 스펙 경로 링크 갱신, 파운데이션에서 삭제 + `docs/README.md` 포인터.
5. **라이선스** (webui) — `LICENSE`(독점), `package.json`의 `"license": "UNLICENSED"`, 폰트 라이선스 2종 추가. 허용 목록은 2단계에서 이미 반영돼 있다. **public 전환 전에 반드시 완료.**
6. **공개 범위 전환** — 파운데이션 private, webui public.
7. **branch protection** — webui `main`. 이후 모든 변경은 PR을 거친다.

1→2는 순서 의존(lock이 있어야 검사할 대상이 생긴다). 5→6도 순서 의존(라이선스 없이 공개하면 폰트 재배포 위반). 6→7도 순서 의존(Free 플랜에서는 public이어야 protection이 켜진다). 3·4는 2 이후 어느 순서든 무방하다.

## 8. 하지 않을 것 (YAGNI)

- **`@crefle/tokens` npm 퍼블리시** — 모듈이 셋이 되는 시점(모바일 DS)으로 미룬다. 그때 vendoring과 lock이 모두 불필요해진다.
- **git submodule / subtree** — 클린 클론 빌드를 깬다.
- **CODEOWNERS** — lock 검사가 기계적으로 판정하고 branch protection이 병합을 막으므로 불필요하다.
- **pre-push 훅** — branch protection이 서버 측에서 강제하므로 클라이언트 훅은 중복이다. (protection을 못 쓰는 상황이었다면 필요했다.)
- **리뷰어 승인 필수** — 1인 개발이라 자기 PR을 승인할 수 없어 스스로 막힌다. 팀이 늘면 켠다.
- **nightly upstream cron** — 파운데이션이 사실상 정지 상태(마지막 토큰 변경 이후 커밋 9개가 전부 문서 변경, `tokens.css`를 건드린 커밋 0개)라 과하다.
- **미러 파일 배너 주입** — "미러 == 업스트림" 불변식을 잃는다.

## 성공 기준

- 미러 파일(`tokens.css`, `fonts/*.woff2`)을 수정하거나 `styles/foundation/`에 파일을 추가하면 `npm run check`와 CI가 모두 실패하고, 실패 메시지가 `npm run sync-foundation`을 지시한다. (허용 목록인 `README.md`, `foundation.lock.json`, `fonts/LICENSE-*.txt`는 예외다.)
- 그 상태의 PR은 `main`에 병합할 수 없다.
- 파운데이션 repo가 없는 머신에서 `npm run sync-foundation`이 원격에서 토큰을 받아 lock을 갱신한다.
- `npm run check:foundation:upstream`이 파운데이션의 최신 상태를 알려주되 빌드를 막지 않는다.
- webui repo만 클론한 사람이 컴포넌트 스펙과 구현 플랜을 모두 볼 수 있고, 파운데이션 접근 없이 `npm run check`가 green이다.
- webui는 PUBLIC이며 코드 라이선스와 폰트 라이선스 전문이 동봉돼 있다. 파운데이션은 PRIVATE이다.
