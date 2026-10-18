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

The control-panel screenshots for `sendflow.africa` identify Plesk, so its deployment must use the Plesk Git action rather than `.cpanel.yml`.

**Why:** The hosted Node application is configured through Plesk Passenger; cPanel deployment tasks do not run in that panel.

**How to apply:** Follow the Plesk deploy hook and restart-file location when deploying this domain; use `.cpanel.yml` only for a separate cPanel-hosted checkout.

Plesk is the production target for SendFlow; Replit is only the development environment. Do not suggest publishing the production app to Replit.

**Why:** The user explicitly clarified that Plesk, not Replit, must serve the functioning production app.

**How to apply:** Verify Plesk-compatible builds and runtime behavior, and distinguish workspace changes from what is actually deployed on Plesk.
