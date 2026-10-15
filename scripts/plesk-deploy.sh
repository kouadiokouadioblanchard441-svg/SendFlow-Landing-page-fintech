#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to build SendFlow for Plesk." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required. Select pnpm as the package manager in Plesk." >&2
  exit 1
fi

node --input-type=commonjs <<'NODE'
const [major, minor] = process.versions.node.split(".").map(Number);
const supported = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major >= 24;
if (!supported) {
  console.error(
    `Unsupported Node.js ${process.versions.node}. Use Node.js 20.19+, 22.12+, or 24 LTS on Plesk.`,
  );
  process.exit(1);
}
NODE

if [[ "${VITE_PUBLIC_SITE_URL:-}" != "https://sendflow.africa" ]]; then
  echo "Set VITE_PUBLIC_SITE_URL=https://sendflow.africa in Plesk before building." >&2
  exit 1
fi

if [[ "${VITE_CLERK_PUBLISHABLE_KEY:-}" != pk_live_* ]]; then
  echo "Set the production Clerk publishable key (pk_live_...) in Plesk before building." >&2
  exit 1
fi

export BASE_PATH="${BASE_PATH:-/}"
export VITE_CLERK_PROXY_URL="${VITE_CLERK_PROXY_URL:-/api/__clerk}"

echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile --prod=false

echo "Running tests, type checks, and the Plesk production build..."
pnpm run build

required_files=(
  "dist/index.cjs"
  "dist/pino-worker.cjs"
  "dist/pino-file.cjs"
  "dist/pino-pretty.cjs"
  "dist/thread-stream-worker.cjs"
  "dist/public/index.html"
  "dist/public/sitemap.xml"
  "dist/public/robots.txt"
)

for file in "${required_files[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "Plesk build output is missing or empty: $file" >&2
    exit 1
  fi
done

echo "Plesk build is ready."
echo "Startup file: index.cjs"
echo "Document root: dist/public"
