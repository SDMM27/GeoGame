#!/usr/bin/env bash
set -euo pipefail

# The certificate of the standalone APK already published on GeoGame-releases.
expected_signer=6fc729eab4856cfac4f551d7d4a99cbf596ed6a9d8be5ae95a87e18c246899be

certificates=$("$1" verify --print-certs geogame.apk)
signer=$(printf '%s\n' "$certificates" | tr -d '\r' | sed -n 's/^Signer #[0-9][0-9]* certificate SHA-256 digest: //p')
if [[ "$signer" != "$expected_signer" ]]; then
  echo "Unexpected GeoGame APK signing certificate" >&2
  exit 1
fi

sha256sum geogame.apk > geogame.apk.sha256
printf '%s\n' "$signer"
