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

반면 `check:foundation` 은 이 repo 안의 lock 파일만 보므로 **누구나, 오프라인에서도** 실행할 수 있고
CI 도 파운데이션에 접근하지 않습니다.

## 신뢰의 한계

이 검사는 **실수**(미러를 원본으로 착각하고 고치는 것)를 막기 위한 것이지, 작정한 우회를 막지는 못합니다.
`tokens.css`·`fonts/*.woff2`와 `foundation.lock.json`을 **같은 커밋에서 함께** 고치면 해시가 서로
맞아떨어져 검사를 그대로 통과합니다. 지금 branch protection은 리뷰어 승인 0명이라 이 상태로도
셀프 머지가 가능합니다 — 코드 리뷰가 마지막 방어선이라는 말은 승인이 필수가 되기 전까지는 원칙일 뿐
실제 강제는 아닙니다.
