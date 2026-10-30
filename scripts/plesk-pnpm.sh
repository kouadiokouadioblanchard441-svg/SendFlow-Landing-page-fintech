#!/usr/bin/env bash

resolve_plesk_pnpm() {
  local repo_root="$1"
  local package_manager expected_version actual_version

  package_manager="$(node -e 'process.stdout.write(require(process.argv[1]).packageManager ?? "")' "$repo_root/package.json")"
  if [[ "$package_manager" =~ ^pnpm@([0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
    expected_version="${BASH_REMATCH[1]}"
  else
    echo "package.json must pin pnpm to an exact version using packageManager." >&2
    return 1
  fi

  if command -v corepack >/dev/null 2>&1; then
    PLESK_PNPM=(corepack pnpm)
  elif command -v pnpm >/dev/null 2>&1; then
    PLESK_PNPM=(pnpm)
  else
    echo "Corepack or pnpm is required to install the locked workspace dependencies." >&2
    return 1
  fi

  if ! actual_version="$("${PLESK_PNPM[@]}" --version)"; then
    echo "Could not start the pinned pnpm package manager." >&2
    return 1
  fi
  if [[ "$actual_version" != "$expected_version" ]]; then
    echo "This project requires pnpm $expected_version; Plesk provided pnpm $actual_version." >&2
    echo "Select the pinned pnpm version or provide Corepack for the Node.js runtime." >&2
    return 1
  fi

  echo "Using pinned pnpm $actual_version."
}
