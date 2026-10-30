#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_inputs=(
  "package.json"
  "pnpm-lock.yaml"
  "pnpm-workspace.yaml"
  "index.cjs"
  "artifacts/sendflow/vite.config.ts"
  "artifacts/api-server/build.mjs"
  "scripts/prepare-plesk-build.mjs"
  "scripts/verify-plesk-build.mjs"
  "scripts/plesk-pnpm.sh"
)
for input in "${required_inputs[@]}"; do
  if [[ ! -s "$input" ]]; then
    echo "Plesk source checkout is incomplete; required project file is missing: $input" >&2
    exit 1
  fi
done

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to build SendFlow for Plesk. Use Node.js 24, 20.19+, 22.13+, or a supported even-numbered LTS line from 24+." >&2
  exit 1
fi

node scripts/check-deploy-node.cjs

source "$ROOT_DIR/scripts/plesk-pnpm.sh"
resolve_plesk_pnpm "$ROOT_DIR"

VITE_PUBLIC_SITE_URL="$(
  node --input-type=commonjs <<'NODE'
const names = ["APP_URL", "PUBLIC_URL", "PUBLIC_SITE_URL", "VITE_PUBLIC_SITE_URL"];
const values = names
  .map((name) => [name, process.env[name]?.trim()])
  .filter(([, value]) => value);
if (values.length === 0) {
  console.error("Set APP_URL, PUBLIC_URL, PUBLIC_SITE_URL, or VITE_PUBLIC_SITE_URL in the Plesk build environment.");
  process.exit(1);
}
const origins = [];
for (const [name, value] of values) {
  try {
    const url = new URL(value);
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
    origins.push([name, url.origin]);
  } catch {
    console.error(`${name} must be an HTTPS origin without a path, query, or fragment.`);
    process.exit(1);
  }
}
const uniqueOrigins = new Set(origins.map(([, origin]) => origin));
if (uniqueOrigins.size > 1) {
  console.error(`Conflicting public URL settings: ${origins.map(([name, origin]) => `${name}=${origin}`).join(", ")}.`);
  process.exit(1);
}
process.stdout.write(origins[0][1]);
NODE
)"
export VITE_PUBLIC_SITE_URL

if [[ "${BASE_PATH:-/}" != "/" ]]; then
  echo "Plesk serves SendFlow from the domain root; set BASE_PATH=/ (or leave it unset)." >&2
  exit 1
fi
export BASE_PATH="/"

echo "Installing workspace dependencies..."
"${PLESK_PNPM[@]}" install --frozen-lockfile --prod=false

echo "Running tests, type checks, and the Plesk production build..."
"${PLESK_PNPM[@]}" run build

echo "Plesk build is ready."
echo "Application root: dist"
echo "Startup file: index.cjs (dist/index.cjs)"
echo "Document root: dist/public"
