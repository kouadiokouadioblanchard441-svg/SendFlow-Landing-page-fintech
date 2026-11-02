#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ACTION_CWD="$PWD"
cd "$ROOT_DIR"

source "$ROOT_DIR/scripts/clear-plesk-git-context.sh"
clear_plesk_git_context

echo "PLESK_BUILD_HOOK_STARTED"
echo "Plesk action working directory: $ACTION_CWD"
echo "Plesk monorepo root: $ROOT_DIR"
echo "Building SendFlow from the Plesk Git checkout..."

required_inputs=(
  "package.json"
  "pnpm-lock.yaml"
  "pnpm-workspace.yaml"
  "index.cjs"
  "artifacts/sendflow/vite.config.ts"
  "artifacts/api-server/build.mjs"
  "scripts/prepare-plesk-build.mjs"
  "scripts/verify-plesk-build.mjs"
  "scripts/resolve-plesk-deployment-root.cjs"
  "scripts/plesk-pnpm.sh"
  "scripts/validate-plesk-runtime-config.cjs"
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
node scripts/validate-plesk-runtime-config.cjs

PLESK_DEPLOYMENT_ROOT="$(
  node scripts/resolve-plesk-deployment-root.cjs "$ROOT_DIR"
)"
PLESK_DIST_DIR="$PLESK_DEPLOYMENT_ROOT/dist"
export PLESK_DEPLOYMENT_ROOT PLESK_DIST_DIR
export PLESK_KEEP_PREVIOUS_DIST=1

echo "Plesk source checkout: $ROOT_DIR"
echo "Plesk website deployment target: $PLESK_DEPLOYMENT_ROOT"

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

required_outputs=(
  "$PLESK_DIST_DIR/index.cjs"
  "$PLESK_DIST_DIR/.node-version"
  "$PLESK_DIST_DIR/pnpm-workspace.yaml"
  "$PLESK_DIST_DIR/build-info.json"
  "$PLESK_DIST_DIR/public/index.html"
  "$PLESK_DIST_DIR/public/.htaccess"
)
for output in "${required_outputs[@]}"; do
  if [[ ! -s "$output" ]]; then
    echo "Plesk build completed without its required output: $output" >&2
    exit 1
  fi
done

DIST_ROOT="$(cd "$PLESK_DIST_DIR" && pwd -P)"
DOCUMENT_ROOT="$(cd "$DIST_ROOT/public" && pwd -P)"
BUILD_ID="$(node -p 'require(process.env.PLESK_DIST_DIR + "/build-info.json").buildId')"

mkdir -p "$PLESK_DIST_DIR/tmp"
touch "$PLESK_DIST_DIR/tmp/restart.txt"
echo "Plesk Application Root: $DIST_ROOT"
echo "Plesk Startup File: index.cjs"
echo "Plesk Document Root: $DOCUMENT_ROOT"
echo "Plesk build ID: $BUILD_ID"
echo "PLESK_BUILD_COMPLETE"
echo "Passenger restart requested."
