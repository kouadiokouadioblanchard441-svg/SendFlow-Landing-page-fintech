#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to build SendFlow for Plesk. Use Node.js 24, or a compatible host runtime (20.19.x+ in 20.x, or 22.12.0+)." >&2
  exit 1
fi

node scripts/check-deploy-node.cjs

source "$ROOT_DIR/scripts/plesk-pnpm.sh"
resolve_plesk_pnpm "$ROOT_DIR"

PUBLIC_SITE_URL="${APP_URL:-${PUBLIC_URL:-${PUBLIC_SITE_URL:-${VITE_PUBLIC_SITE_URL:-}}}}"
if [[ -z "$PUBLIC_SITE_URL" ]]; then
  echo "Set APP_URL, PUBLIC_URL, PUBLIC_SITE_URL, or VITE_PUBLIC_SITE_URL in the production build environment." >&2
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
"${PLESK_PNPM[@]}" install --frozen-lockfile --prod=false

echo "Running tests, type checks, and the Plesk production build..."
"${PLESK_PNPM[@]}" run build

required_files=(
  "dist/build-info.json"
  "dist/package.json"
  "dist/index.cjs"
  "dist/pino-worker.cjs"
  "dist/pino-file.cjs"
  "dist/pino-pretty.cjs"
  "dist/thread-stream-worker.cjs"
  "dist/public/.htaccess"
  "dist/public/index.html"
  "dist/public/sitemap.xml"
  "dist/public/robots.txt"
  "dist/public/download/index.html"
  "dist/public/fonctionnalites/index.html"
  "dist/public/securite/index.html"
  "dist/public/a-propos/index.html"
  "dist/public/conditions-utilisation/index.html"
  "dist/public/confidentialite/index.html"
  "dist/public/mentions-legales/index.html"
  "dist/public/france-senegal/index.html"
  "dist/public/en/index.html"
  "dist/public/en/features/index.html"
  "dist/public/en/security/index.html"
  "dist/public/en/download/index.html"
  "dist/public/en/about/index.html"
  "dist/public/en/terms/index.html"
  "dist/public/en/privacy/index.html"
  "dist/public/en/legal-notice/index.html"
  "dist/public/en/france-senegal/index.html"
)

for file in "${required_files[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "Plesk build output is missing or empty: $file" >&2
    exit 1
  fi
done

node --check dist/index.cjs
node -e '
  const fs = require("node:fs");
  const pkg = JSON.parse(fs.readFileSync("dist/package.json", "utf8"));
  if (pkg.type !== "commonjs" || pkg.scripts?.start !== "node ./index.cjs") {
    console.error("Plesk runtime manifest must start the CommonJS bundle with node ./index.cjs.");
    process.exit(1);
  }
'

echo "Plesk build is ready."
echo "Application root: dist"
echo "Startup file: index.cjs (dist/index.cjs)"
echo "Document root: dist/public"
