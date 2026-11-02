#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$#" -ne 3 ]]; then
  echo "Usage: plesk-remote-deploy.sh <sendflow.africa target> <release id> <uploaded archive>" >&2
  exit 2
fi

DEPLOY_ROOT_INPUT="$1"
RELEASE_ID="$2"
ARCHIVE="$3"

if [[ "$DEPLOY_ROOT_INPUT" != /* || "$DEPLOY_ROOT_INPUT" == "/" ]]; then
  echo "Plesk deployment root must be an absolute, existing sendflow.africa directory." >&2
  exit 1
fi
if [[ "$DEPLOY_ROOT_INPUT" == *"/../"* || "$DEPLOY_ROOT_INPUT" == */.. ]]; then
  echo "Plesk deployment root must not contain parent-directory segments." >&2
  exit 1
fi
if [[ ! "$RELEASE_ID" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]]; then
  echo "Invalid Plesk release identifier." >&2
  exit 1
fi

if ! DEPLOY_ROOT="$(cd -- "$DEPLOY_ROOT_INPUT" && pwd -P)"; then
  echo "Plesk deployment root does not exist or is not accessible: $DEPLOY_ROOT_INPUT" >&2
  exit 1
fi
if [[ "$(basename -- "$DEPLOY_ROOT")" != "sendflow.africa" ]]; then
  echo "Refusing to deploy outside the sendflow.africa target directory: $DEPLOY_ROOT" >&2
  exit 1
fi
if [[ ! -w "$DEPLOY_ROOT" ]]; then
  echo "Plesk deployment user cannot write to: $DEPLOY_ROOT" >&2
  exit 1
fi

EXPECTED_ARCHIVE="$DEPLOY_ROOT/.sendflow-upload-${RELEASE_ID}.tar.gz"
if [[ "$ARCHIVE" != "$EXPECTED_ARCHIVE" || ! -s "$ARCHIVE" ]]; then
  echo "Uploaded release archive is missing or outside the deployment root." >&2
  exit 1
fi

STAGE="$DEPLOY_ROOT/.sendflow-stage-${RELEASE_ID}"
BACKUP="$DEPLOY_ROOT/.sendflow-dist-backup"
if [[ -e "$STAGE" || -L "$STAGE" ]]; then
  echo "Release staging path already exists; refusing to overwrite it." >&2
  exit 1
fi
if [[ -L "$BACKUP" || ( -e "$BACKUP" && ( ! -d "$BACKUP" || ! -s "$BACKUP/index.cjs" || ! -s "$BACKUP/build-info.json" ) ) ]]; then
  echo "Existing backup path is not a recognized SendFlow build; refusing to replace it." >&2
  exit 1
fi

if ! tar -tzf "$ARCHIVE" >/dev/null; then
  echo "Uploaded Plesk release archive is invalid." >&2
  exit 1
fi

mapfile -t ARCHIVE_ENTRIES < <(tar -tzf "$ARCHIVE")
for entry in "${ARCHIVE_ENTRIES[@]}"; do
  if [[ "$entry" != "dist" && "$entry" != dist/* ]]; then
    echo "Unexpected path in Plesk release archive: $entry" >&2
    exit 1
  fi
  IFS='/' read -r -a segments <<< "$entry"
  for segment in "${segments[@]}"; do
    if [[ "$segment" == ".." || "$segment" == ".git" || "$segment" == "node_modules" || "$segment" == .env* ]]; then
      echo "Unsafe path in Plesk release archive: $entry" >&2
      exit 1
    fi
  done
done

for required in \
  dist/index.cjs \
  dist/package.json \
  dist/build-info.json \
  dist/public/index.html \
  dist/public/.htaccess; do
  if ! printf '%s\n' "${ARCHIVE_ENTRIES[@]}" | grep -Fqx -- "$required"; then
    echo "Plesk release archive is missing $required." >&2
    exit 1
  fi
done

OLD_DIST_MOVED=0
cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$OLD_DIST_MOVED" == "1" && ! -e "$DEPLOY_ROOT/dist" && -e "$BACKUP" ]]; then
    if ! mv -- "$BACKUP" "$DEPLOY_ROOT/dist"; then
      echo "Could not restore the previous dist from $BACKUP." >&2
      status=1
    fi
  fi
  rm -rf -- "$STAGE"
  rm -f -- "$ARCHIVE"
  exit "$status"
}
trap cleanup EXIT

mkdir -m 700 -- "$STAGE"
tar -xzf "$ARCHIVE" -C "$STAGE" --no-same-owner --no-same-permissions

for required in \
  "$STAGE/dist/index.cjs" \
  "$STAGE/dist/package.json" \
  "$STAGE/dist/build-info.json" \
  "$STAGE/dist/public/index.html" \
  "$STAGE/dist/public/.htaccess"; do
  if [[ ! -s "$required" ]]; then
    echo "Extracted Plesk release is missing $required." >&2
    exit 1
  fi
done

if [[ -L "$DEPLOY_ROOT/dist" ]]; then
  echo "The current dist is a symlink; refusing to replace an unverified target." >&2
  exit 1
fi
if [[ -e "$DEPLOY_ROOT/dist" ]]; then
  if [[ -e "$BACKUP" ]]; then
    rm -rf -- "$BACKUP"
  fi
  OLD_DIST_MOVED=1
  mv -- "$DEPLOY_ROOT/dist" "$BACKUP"
fi
mv -- "$STAGE/dist" "$DEPLOY_ROOT/dist"
mkdir -p -- "$DEPLOY_ROOT/dist/tmp"
touch -- "$DEPLOY_ROOT/dist/tmp/restart.txt"

echo "PLESK_RELEASE_DEPLOYED"
echo "Plesk deployment target: $DEPLOY_ROOT"
echo "Plesk application root: $DEPLOY_ROOT/dist"
echo "Plesk document root: $DEPLOY_ROOT/dist/public"
if [[ "$OLD_DIST_MOVED" == "1" ]]; then
  echo "Previous Plesk build retained at $BACKUP"
fi
