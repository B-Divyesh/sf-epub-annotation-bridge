#!/bin/sh
set -eu

repo="B-Divyesh/sf-epub-annotation-bridge"
api="https://api.github.com/repos/$repo/releases/latest"
release_json=$(curl -fsSL "$api") || {
  printf '%s\n' "The latest release could not be found. Try again later."
  exit 1
}

case "$(uname -s)" in
  Linux)
    suffix='\.AppImage$'
    destination="${HOME}/.local/bin/epub-annotation-bridge"
    ;;
  Darwin)
    case "$(uname -m)" in
      arm64) suffix='aarch64.*\.dmg$' ;;
      *) suffix='x64.*\.dmg$' ;;
    esac
    destination="${HOME}/Downloads/EPUB-Annotation-Bridge.dmg"
    ;;
  *)
    printf '%s\n' "This installer supports macOS and Linux. Use install.ps1 on Windows."
    exit 1
    ;;
esac

asset_url=$(printf '%s' "$release_json" | sed -n 's/.*"browser_download_url": "\([^"]*\)".*/\1/p' | grep -Ei "$suffix" | head -n 1)
sums_url=$(printf '%s' "$release_json" | sed -n 's/.*"browser_download_url": "\([^"]*SHA256SUMS\)".*/\1/p' | head -n 1)
if [ -z "$asset_url" ] || [ -z "$sums_url" ]; then
  printf '%s\n' "A matching release with checksums is not available yet."
  exit 1
fi

asset_name=${asset_url##*/}
work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT HUP INT TERM
curl -fL "$asset_url" -o "$work_dir/$asset_name"
curl -fsSL "$sums_url" -o "$work_dir/SHA256SUMS"
expected=$(awk -v name="$asset_name" '$2 == name || $2 == "*" name { print $1 }' "$work_dir/SHA256SUMS")
if [ -z "$expected" ]; then
  printf '%s\n' "The release checksum does not list $asset_name."
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$work_dir/$asset_name" | awk '{print $1}')
else
  actual=$(shasum -a 256 "$work_dir/$asset_name" | awk '{print $1}')
fi
[ "$actual" = "$expected" ] || { printf '%s\n' "The downloaded file failed its SHA-256 check."; exit 1; }

mkdir -p "$(dirname "$destination")"
if [ "$(uname -s)" = "Linux" ]; then
  install -m 755 "$work_dir/$asset_name" "$destination"
  printf '%s\n' "Installed the verified AppImage at $destination"
else
  cp "$work_dir/$asset_name" "$destination"
  printf '%s\n' "Saved the verified disk image at $destination"
  printf '%s\n' "Open it, then right-click the app and choose Open."
fi
