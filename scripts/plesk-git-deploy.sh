#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Plesk may launch deployment actions from its internal Git process and export
# repository selectors for a bare repository. Do not pass that context to
# pnpm, package scripts, or their child processes.
unset \
  GIT_ALTERNATE_OBJECT_DIRECTORIES \
  GIT_CONFIG \
  GIT_CONFIG_PARAMETERS \
  GIT_CONFIG_COUNT \
  GIT_OBJECT_DIRECTORY \
  GIT_DIR \
  GIT_WORK_TREE \
  GIT_IMPLICIT_WORK_TREE \
  GIT_GRAFT_FILE \
  GIT_INDEX_FILE \
  GIT_NO_REPLACE_OBJECTS \
  GIT_REPLACE_REF_BASE \
  GIT_PREFIX \
  GIT_SHALLOW_FILE \
  GIT_COMMON_DIR

if [[ ! -f pnpm-lock.yaml || ! -f package.json ]]; then
  echo "Plesk Git deploy action must run from the SendFlow repository." >&2
  exit 1
fi

source "$ROOT_DIR/scripts/plesk-pnpm.sh"
resolve_plesk_pnpm "$ROOT_DIR"

echo "Building SendFlow from the Plesk Git checkout..."
"${PLESK_PNPM[@]}" run deploy:plesk

mkdir -p dist/tmp
touch dist/tmp/restart.txt

echo "Plesk build completed in $ROOT_DIR/dist."
