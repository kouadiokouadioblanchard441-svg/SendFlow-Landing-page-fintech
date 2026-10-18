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
const supported = (major === 20 && minor >= 19) || major >= 22;
if (!supported) {
  console.error(
    `Unsupported Node.js ${process.versions.node}. Use Node.js 20.19+ or 22+.`,
  );
  process.exit(1);
}
NODE

PUBLIC_SITE_URL="${APP_URL:-${PUBLIC_URL:-${PUBLIC_SITE_URL:-}}}"
if [[ -z "$PUBLIC_SITE_URL" ]]; then
  echo "Set APP_URL, PUBLIC_URL, or PUBLIC_SITE_URL in the production build environment." >&2
  exit 1
fi
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
  console.error("APP_URL, PUBLIC_URL, or PUBLIC_SITE_URL must be a valid HTTPS origin without a path.");
  process.exit(1);
}
NODE
)"

export BASE_PATH="${BASE_PATH:-/}"

echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile --prod=false

echo "Running tests, type checks, and the Plesk production build..."
pnpm run build

required_files=(
  "dist/package.json"
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
echo "Application root: dist"
echo "Startup file: index.cjs (dist/index.cjs)"
echo "Document root: dist/public"
