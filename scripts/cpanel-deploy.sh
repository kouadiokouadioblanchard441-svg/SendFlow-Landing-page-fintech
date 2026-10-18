#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f package.json || ! -f pnpm-lock.yaml || ! -f index.cjs ]]; then
  echo "cPanel deployment task must run from the SendFlow repository." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Select Node.js 22 (or 20.19+) in cPanel." >&2
  exit 1
fi

node --input-type=commonjs <<'NODE'
const [major, minor] = process.versions.node.split(".").map(Number);
if (!((major === 20 && minor >= 19) || major >= 22)) {
  console.error(
    `Unsupported Node.js ${process.versions.node}. Use Node.js 20.19+ or 22+.`,
  );
  process.exit(1);
}
NODE

if command -v pnpm >/dev/null 2>&1; then
  PNPM=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  PNPM=(corepack pnpm)
else
  echo "pnpm or Corepack is required in the cPanel Node.js environment." >&2
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

# Passenger watches this file to restart the application from its application root.
mkdir -p tmp
touch tmp/restart.txt

echo "cPanel deployment complete."
echo "Application root: $ROOT_DIR"
echo "Startup file: index.cjs"
echo "Compiled server: dist/index.cjs"
echo "Static files: dist/public"
