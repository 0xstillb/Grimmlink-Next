#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f compose.phase08.staging-local.yml || ! -f apps/adapter/scripts/hash-owner-password.mjs ]]; then
  echo "Run this script from the Grimmlink-Next repository root." >&2
  exit 1
fi
if [[ -e .env.staging || -L .env.staging ]]; then
  echo ".env.staging already exists; refusing to overwrite Staging credentials." >&2
  exit 1
fi
if [[ "$(id -u)" != "1000" ]]; then
  echo "Run as the staging account with UID 1000 so the Adapter can write its local SQLite directory." >&2
  exit 1
fi

read -r -s -p "Choose Staging owner password (12-256 bytes): " password_one
printf '\n'
read -r -s -p "Confirm Staging owner password: " password_two
printf '\n'
if [[ "$password_one" != "$password_two" ]]; then
  unset password_one password_two
  echo "Passwords did not match." >&2
  exit 1
fi
password_hash="$(printf '%s\n' "$password_one" | node apps/adapter/scripts/hash-owner-password.mjs)"
unset password_one password_two
signing_key="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"

umask 077
mkdir -p staging-data
chmod 0700 staging-data
cat > .env.staging <<EOF
GRIMMLINK_OWNER_PASSWORD_HASH='$password_hash'
GRIMMLINK_SESSION_SIGNING_KEY='$signing_key'
GRIMMLINK_PUBLIC_ORIGIN='http://192.168.1.116:6062'
EOF
chmod 0600 .env.staging
unset password_hash signing_key
echo "Created private Staging credentials and local-only data directory. Secret values were not printed."
