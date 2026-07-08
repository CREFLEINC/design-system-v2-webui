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
# 참고: file:// 모듈 로드는 --allow-file-access-from-files로 허용한다
# (드롭: --disable-web-security, A/B 테스트로 불필요 확인).
# --run-all-compositor-stages-before-draw: virtual-time-budget 만료 시 컴포지터가
# 마지막 페인트를 반영하기 전에 스크린샷이 찍히는 레이스가 관찰되어(스피너만 캡처됨) 추가.
"$CHROME" --headless=new --allow-file-access-from-files \
  --force-device-scale-factor=2 --window-size="${SIZE/x/,}" \
  --virtual-time-budget=4000 --run-all-compositor-stages-before-draw \
  --screenshot="$OUT" "$URL" 2>/dev/null
echo "$OUT"
