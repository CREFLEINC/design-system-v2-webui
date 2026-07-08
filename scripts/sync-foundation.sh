#!/usr/bin/env bash
# 파운데이션 DS의 토큰·폰트를 복사하고 커밋 해시를 PIN에 기록한다.
set -euo pipefail
SRC="${FOUNDATION_DIR:-$HOME/Documents/Claude/Projects/CREFLE Design System}"
DST="$(cd "$(dirname "$0")/.." && pwd)/styles/foundation"
mkdir -p "$DST/fonts"
cp "$SRC/tokens.css" "$DST/tokens.css"
cp "$SRC"/ds-bundle/fonts/*.woff2 "$DST/fonts/"
(git -C "$SRC" rev-parse --short HEAD 2>/dev/null || echo unknown) > "$DST/PIN"
echo "foundation synced @ $(cat "$DST/PIN")"
