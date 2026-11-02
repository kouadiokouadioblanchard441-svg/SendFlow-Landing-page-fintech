#!/usr/bin/env bash

resolve_plesk_pnpm() {
  local repo_root="$1"
  local package_manager expected_version actual_version=""

  PLESK_PNPM=()
  PLESK_PNPM_SOURCE=""
  package_manager="$(node -e 'process.stdout.write(require(process.argv[1]).packageManager ?? "")' "$repo_root/package.json")"
  if [[ "$package_manager" =~ ^pnpm@([0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
    expected_version="${BASH_REMATCH[1]}"
  else
    echo "package.json must pin pnpm to an exact version using packageManager." >&2
    return 1
  fi

  # Plesk may expose a newer global pnpm than the workspace lockfile expects.
  # Pin the executable explicitly instead of trusting the panel's global pnpm.
  if command -v corepack >/dev/null 2>&1; then
    PLESK_PNPM=(corepack "pnpm@$expected_version")
    if actual_version="$("${PLESK_PNPM[@]}" --version 2>/dev/null)" &&
      [[ "$actual_version" == "$expected_version" ]]; then
      PLESK_PNPM_SOURCE="Corepack"
      echo "Using pinned pnpm $actual_version via Corepack."
      return 0
    fi
    PLESK_PNPM=()
  fi

  if command -v npx >/dev/null 2>&1; then
    PLESK_PNPM=(npx --yes "pnpm@$expected_version")
    if actual_version="$("${PLESK_PNPM[@]}" --version 2>/dev/null)" &&
      [[ "$actual_version" == "$expected_version" ]]; then
      PLESK_PNPM_SOURCE="npx"
      echo "Using pinned pnpm $actual_version via npx."
      return 0
    fi
    PLESK_PNPM=()
  fi

  if command -v pnpm >/dev/null 2>&1; then
    PLESK_PNPM=(pnpm)
    if actual_version="$("${PLESK_PNPM[@]}" --version 2>/dev/null)" &&
      [[ "$actual_version" == "$expected_version" ]]; then
      PLESK_PNPM_SOURCE="PATH"
      echo "Using pinned pnpm $actual_version from PATH."
      return 0
    fi
  fi

  PLESK_PNPM=()
  if [[ -n "$actual_version" ]]; then
    echo "This project requires pnpm $expected_version; Plesk provided pnpm $actual_version." >&2
    echo "Refusing to install with the incompatible version. Enable Corepack or npx for the Plesk Node.js runtime, or provide pnpm $expected_version on PATH." >&2
  else
    echo "Could not run pnpm $expected_version. Provide Corepack, npx, or the exact pinned pnpm version in the Plesk deployment environment." >&2
  fi
  return 1
}
