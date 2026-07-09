# @crefle/web-ui

CREFLE 웹 프론트엔드 디자인 시스템 — 파운데이션(Stage 1) 위의 첫 분야별 확장.

## 설치

npm 레지스트리에 퍼블리시하지 않는다. git 의존으로 설치한다.

```bash
npm i github:CREFLEINC/design-system-v2-webui
```

설치 시 `prepare` 훅이 임시 클론 안에서 `npm run build`를 돌려 `dist/`를 만든다.
소비 프로젝트에서 따로 할 일은 없지만, 그만큼 첫 설치가 느리고 Node ≥ 20.19가 필요하다.
버전을 고정하려면 태그나 커밋을 붙인다: `github:CREFLEINC/design-system-v2-webui#<tag>`.

React 18 또는 19가 peer dependency다.

```ts
import '@crefle/web-ui/styles/index.css' // 토큰 + 폰트 + 테마
import '@crefle/web-ui/css'              // 컴포넌트 스타일
import { Button } from '@crefle/web-ui'
```

- 테마: `<html data-theme="light|dark">` — `ThemeProvider` 사용
- 스펙: `docs/superpowers/specs/2026-07-08-web-frontend-ds-design.md`
- 컴포넌트 상세 스펙: `docs/superpowers/specs/phase{2,3,4}-components/`
- 구현 플랜: `docs/superpowers/plans/`
