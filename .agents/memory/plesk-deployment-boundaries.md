---
name: Plesk deployment boundaries
description: Hosting constraints discovered when moving SendFlow to external hosting
---

External hosting must use direct provider APIs and storage services that exist outside the managed development environment. The Resend integration should use `RESEND_API_KEY` against the official Resend API, and media uploads cannot depend on its managed connector proxy or the `127.0.0.1:1106` object-storage sidecar.

**Why:** Plesk can run the Node API and serve the static web, but it does not provide the development environment’s connector proxy or local object-storage sidecar.

**How to apply:** Before a Plesk production migration, verify email uses the direct provider API and either migrate media to a portable storage service or serve already-migrated public assets without enabling development-environment-only upload routes.

For cPanel Git deployments, use `.cpanel.yml` to run the build after cPanel updates the checkout; do not run `git pull` inside the deployment task. Keep generated `dist/` ignored and regenerate it on the host. Invoke the package manager pinned by the root `packageManager` field through Corepack when available. For pnpm 12 installs launched directly by the host, mirror the narrow `onlyBuiltDependencies` list in the newer `allowBuilds` map.

**Why:** The cPanel host used a newer global pnpm than the workspace pin and rejected esbuild's install script despite esbuild already being allowlisted for pnpm 10.

**How to apply:** When a host reports ignored dependency build scripts, compare its pnpm version with the lockfile/workspace version; keep both pnpm config formats synchronized rather than broadening script trust.
