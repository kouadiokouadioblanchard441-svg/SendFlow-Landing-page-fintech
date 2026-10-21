#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f package.json || ! -f pnpm-lock.yaml || ! -f index.cjs ]]; then
  echo "cPanel deployment task must run from the SendFlow repository." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Select Node.js 24 if available, or a compatible host runtime (20.19.x+ in 20.x, or 22.12.0+)." >&2
  exit 1
fi

node scripts/check-deploy-node.cjs

EXPECTED_PNPM="$(
  node -p 'require("./package.json").packageManager?.match(/^pnpm@(.+)$/)?.[1] ?? ""'
)"
if [[ -z "$EXPECTED_PNPM" ]]; then
  echo "package.json must pin the pnpm version in packageManager." >&2
  exit 1
fi

if command -v corepack >/dev/null 2>&1; then
  PNPM=(corepack pnpm)
elif command -v pnpm >/dev/null 2>&1; then
  INSTALLED_PNPM="$(pnpm --version)"
  if [[ "$INSTALLED_PNPM" != "$EXPECTED_PNPM" ]]; then
    echo "This project requires pnpm $EXPECTED_PNPM, but cPanel provides pnpm $INSTALLED_PNPM and Corepack is unavailable." >&2
    echo "Enable Corepack for the selected Node.js version so it can use package.json's packageManager pin." >&2
    exit 1
  fi
  PNPM=(pnpm)
else
  echo "pnpm or Corepack is required in the cPanel Node.js environment." >&2
  exit 1
fi

INSTALLED_PNPM="$("${PNPM[@]}" --version)"
if [[ "$INSTALLED_PNPM" != "$EXPECTED_PNPM" ]]; then
  echo "Corepack selected pnpm $INSTALLED_PNPM; this project requires pnpm $EXPECTED_PNPM." >&2
  exit 1
fi

PUBLIC_SITE_URL="${APP_URL:-${PUBLIC_URL:-${PUBLIC_SITE_URL:-https://sendflow.africa}}}"
export VITE_PUBLIC_SITE_URL="$(
  PUBLIC_SITE_URL="$PUBLIC_SITE_URL" node --input-type=commonjs <<'NODE'
try {
  const url = new URL(process.env.PUBLIC_SITE_URL);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error();
  }
  process.stdout.write(url.origin);
} catch {
  console.error(
    "APP_URL, PUBLIC_URL, or PUBLIC_SITE_URL must be an HTTPS origin without a path.",
  );
  process.exit(1);
}
NODE
)"
export APP_URL="${APP_URL:-$VITE_PUBLIC_SITE_URL}"
export BASE_PATH="${BASE_PATH:-/}"

echo "Installing SendFlow workspace dependencies..."
"${PNPM[@]}" install --frozen-lockfile --prod=false

echo "Running tests, type checks, and the production build..."
"${PNPM[@]}" run build

required_files=(
  "dist/index.cjs"
  "dist/package.json"
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
    echo "Build output is missing or empty: $file" >&2
    exit 1
  fi
done

# Passenger watches the restart file inside the configured Node application root.
mkdir -p dist/tmp
touch dist/tmp/restart.txt

echo "cPanel deployment complete."
echo "Application root: $ROOT_DIR"
echo "Startup file: index.cjs"
echo "Compiled server: dist/index.cjs"
echo "Static files: dist/public"
echo "Passenger restart marker: dist/tmp/restart.txt"
