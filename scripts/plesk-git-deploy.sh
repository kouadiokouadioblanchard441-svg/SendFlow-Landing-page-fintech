#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f pnpm-lock.yaml || ! -f package.json ]]; then
  echo "Plesk Git deploy action must run from the SendFlow repository." >&2
  exit 1
fi

echo "Building SendFlow from the Plesk Git checkout..."
pnpm run deploy:plesk

mkdir -p dist/tmp
touch dist/tmp/restart.txt

echo "Plesk build completed in $ROOT_DIR/dist."
