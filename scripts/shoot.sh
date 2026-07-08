#!/usr/bin/env bash
# Storybook 정적 빌드의 스토리를 헤드리스 Chrome으로 스크린샷 (라이트/다크)
# 사용: npm run shoot -- components-button--matrix dark 1200x800
set -euo pipefail
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STORY="${1:?usage: shoot.sh <story-id> [light|dark] [WxH]}"
THEME="${2:-light}"
SIZE="${3:-1200x800}"
OUT="$ROOT/shots/${STORY//\//-}-$THEME.png"
mkdir -p "$ROOT/shots"
[ -d "$ROOT/storybook-static" ] || { echo "run npm run build-storybook first" >&2; exit 1; }
URL="file://$ROOT/storybook-static/iframe.html?id=$STORY&globals=theme:$THEME"
# 참고: Storybook 정적 빌드는 ES 모듈(<script type="module">)로 번들되며, Chromium은
# file:// 출처에서 모듈 스크립트 로드를 CORS 정책으로 항상 차단한다(virtual-time-budget과 무관).
# --disable-web-security --allow-file-access-from-files로 로컬 정적 파일 렌더링에 한해 우회한다.
"$CHROME" --headless=new --disable-web-security --allow-file-access-from-files \
  --force-device-scale-factor=2 --window-size="${SIZE/x/,}" \
  --virtual-time-budget=4000 --screenshot="$OUT" "$URL" 2>/dev/null
echo "$OUT"
