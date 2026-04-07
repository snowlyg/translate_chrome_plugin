#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_PATH="${CHROME_PATH:-/mnt/c/Program Files/Google/Chrome/Application/chrome.exe}"
EXPORT_PAGE_WIN="$(wslpath -w "$ROOT_DIR/assets/icon-export.html")"

if [[ ! -f "$CHROME_PATH" ]]; then
  echo "Chrome not found at: $CHROME_PATH" >&2
  echo "Set CHROME_PATH to your chrome.exe path and retry." >&2
  exit 1
fi

for size in 16 32 48 128; do
  output_win="$(wslpath -w "$ROOT_DIR/assets/icons/icon-${size}.png")"
  "$CHROME_PATH" \
    --headless \
    --disable-gpu \
    --screenshot="$output_win" \
    --window-size="${size},${size}" \
    "file:///${EXPORT_PAGE_WIN//\\//}"
done

echo "Exported icons: 16, 32, 48, 128"
