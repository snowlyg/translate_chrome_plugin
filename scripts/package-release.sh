#!/usr/bin/env bash
set -euo pipefail

output_dir="${1:-dist}"
package_name="${2:-minimal-translation-chrome-extension.zip}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$script_dir/.." && pwd)"
dist="$root/$output_dir"
staging="$dist/package"
zip_path="$dist/$package_name"

include_paths=(
  "manifest.json"
  "background.js"
  "content.js"
  "popup.html"
  "popup.js"
  "popup.css"
  "options.html"
  "options.js"
  "options.css"
  "assets"
)

mkdir -p "$dist"
rm -rf "$staging"
mkdir -p "$staging"

for relative_path in "${include_paths[@]}"; do
  source_path="$root/$relative_path"
  if [[ ! -e "$source_path" ]]; then
    echo "Missing required release path: $relative_path" >&2
    exit 1
  fi

  destination="$staging/$relative_path"
  mkdir -p "$(dirname "$destination")"
  cp -R "$source_path" "$destination"
done

rm -f "$zip_path"
(
  cd "$staging"
  zip -qr "$zip_path" .
)

echo "Packaged release to $zip_path"
