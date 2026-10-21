#!/bin/bash
set -euo pipefail

cd "$(dirname -- "${BASH_SOURCE[0]}")/.."

pnpm install --frozen-lockfile

# A code merge must not implicitly alter an external database schema.
# Apply schema changes separately, after reviewing the target and changes.
echo "Post-merge dependencies installed; no database schema changes were applied."
