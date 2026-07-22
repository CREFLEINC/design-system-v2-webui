# 이 디렉토리는 동봉본입니다 — 직접 수정하지 마세요

`tokens.css` 와 `fonts/*.woff2` 는 파운데이션 repo
[`CREFLEINC/design-system-v2`](https://github.com/CREFLEINC/design-system-v2) 에서
복사된 파일입니다. 원본과 **바이트 동일**해야 합니다.

여기 있는 파일을 고치면 `npm run check` 와 CI 가 실패합니다.
토큰을 바꾸려면 파운데이션 repo 에서 고친 뒤 아래를 실행하세요.

```bash
npm run sync-foundation
```

## 파일

| 파일 | 설명 |
|---|---|
| `foundation.lock.json` | 출처 repo·ref·커밋 SHA 와 파일별 sha256. 무결성 검사의 기준 |
| `tokens.css` | 파운데이션 Stage 1 토큰 (동봉본) |
| `fonts/*.woff2` | Spoqa Han Sans Neo 5종 + Material Symbols Rounded (동봉본) |
| `fonts/LICENSE-*.txt` | 위 폰트들의 원 라이선스 전문 |
| `README.md` | 이 파일 |

## 명령

| 명령 | 하는 일 | 네트워크 |
|---|---|---|
| `npm run check:foundation` | 미러가 lock 과 일치하는지 + `ds-bundle/fonts/` 폰트 사본이 lock·미러와 일치하는지 검사. 불일치 시 실패 | 불필요 |
| `npm run check:foundation:upstream` | 파운데이션이 앞서 있는지 확인. **경고만 하고 절대 실패하지 않음** | 필요 |
| `npm run check:foundation:verify` | `lock.commit` 기준 upstream 원본과 파일 집합·해시 전수 대조. 검증 불가 시에도 실패(fail-closed) | 필요 |
| `npm run sync-foundation` | 파운데이션에서 다시 받아 lock 갱신 | 필요 |

## 환경변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `FOUNDATION_REPO` | `https://github.com/CREFLEINC/design-system-v2.git` | 소스 repo |
| `FOUNDATION_REF` | `main` | 브랜치·태그·전체 SHA |
| `FOUNDATION_DIR` | (없음) | 로컬 체크아웃에서 동기화 (동시 작업용) |

## 참고

파운데이션 repo 는 **private** 입니다. `sync-foundation` 은 `gh` CLI 의 credential helper
(또는 SSH 키)로 인증합니다. 접근 권한이 없으면 동기화할 수 없습니다.

반면 `check:foundation` 은 이 repo 안의 lock 파일만 보므로 **누구나, 오프라인에서도** 실행할 수 있고,
`styles/foundation` 을 건드리지 않는 PR 의 CI 는 파운데이션에 접근하지 않습니다. 기본 게이트는 여전히
오프라인이 원칙이며, `styles/foundation` 을 변경하는 PR 에 한해서만 CI 가 `check:foundation:verify` 로
예외적으로 파운데이션에 접근합니다 (아래 "신뢰의 한계" 참고).

`FOUNDATION_PAT` 은 `CREFLEINC/design-system-v2` 리포 한정·Contents:Read 권한의 fine-grained PAT 로
피해 상한을 걸었고, fork PR 에는 제공되지 않습니다 (`pull_request` 이벤트 특성).

## 신뢰의 한계

`npm run check:foundation`(오프라인)은 **실수**(미러를 원본으로 착각하고 고치는 것)를 막기 위한 것이지,
작정한 우회를 막지는 못합니다. `tokens.css`·`fonts/*.woff2`와 `foundation.lock.json`을 **같은 커밋에서
함께** 고치면 해시가 서로 맞아떨어져 이 검사는 그대로 통과합니다.

이 구멍은 CI가 메웁니다. `styles/foundation`을 건드리는 PR에 한해 `check` job이
`npm run check:foundation:verify`(= `--verify-upstream`)를 실행해, lock이 아니라 **파운데이션 원본
(`CREFLEINC/design-system-v2`) 그 자체**를 `lock.commit` 기준으로 대조합니다. 신뢰 루트가
lock(같은 PR에서 위조 가능)에서 파운데이션 리포(웹UI PR 작성자가 건드릴 수 없음)로 옮겨진 것입니다.
위조 SHA(fetch 자체가 실패)도, 진짜 SHA + 위조 해시 조합(내용 대조 실패)도 모두 검출되고
fail-closed이므로 검증 자체가 안 되는 상황(네트워크·인증 실패)도 실패로 취급됩니다. 미러만 고치고
lock을 재생성해 오프라인 검사를 속이는 것도 같은 경로로 걸립니다. 즉 **"위조 불가능"이 아니라
"웹UI PR 단독으로는 위조 불가 — 파운데이션 리포 침해 또는 워크플로(`ci.yml`) 동시 변조가 필요"**입니다.

지금 branch protection은 리뷰어 승인 0명이라 셀프 머지가 가능합니다. 코드 리뷰가 마지막 방어선이라는
말은 여전히 원칙일 뿐 강제는 아니지만, 위 upstream 대조가 그 자리를 실질적으로 대신합니다.

**정직하게 수용하는 잔여 리스크:**

1. 같은 PR에서 `ci.yml` 자체를 무력화하면 여전히 우회 가능합니다 — 주간 `upstream.yml`의 verify가
   사후 검출하지만, 그것마저 함께 고치면 못 잡습니다. 승인이 강제되기 전에는 원리상 닫히지 않습니다.
2. 파운데이션 리포(`CREFLEINC/design-system-v2`) 자체가 침해되면 이 방어는 무력합니다 — 신뢰 루트
   이동의 정의상 한계입니다.
3. `FOUNDATION_PAT`이 PR CI에 노출됩니다(write 권한자는 워크플로 수정으로 유출 가능). Contents:Read ·
   단일 리포 한정 fine-grained PAT로 피해 상한을 걸었고, fork PR은 이 secret을 받지 않습니다
   (`pull_request` 이벤트 특성).

**승인 1 재개 조건:** 협업자는 이미 8명이지만 실제 활성 기여자는 1인뿐이라, 지금 리뷰어 승인을
강제하면 개발이 정지됩니다. **제2의 활성 기여자가 등장하면** `required_approving_review_count`를
1 이상으로 올리고 CODEOWNERS를 함께 도입할 것을 권고합니다.
