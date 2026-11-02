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

For SendFlow production, preserve `/sendflow.africa` as the Plesk Git deployment target. The user reports that deploying to `/httpdocs` avoids the Git error but does not serve the site correctly; do not recommend switching to `/httpdocs` unless Plesk confirms it is the configured web root.

**Why:** The user explicitly clarified that `/sendflow.africa` is the required production deployment location.

**How to apply:** Keep the Plesk target configured for SendFlow and verify its resolved absolute path, domain document root, and writable ownership in Plesk before aligning Node's `dist` application root and `dist/public` document root.

The Plesk task label `Deploying files` does not by itself identify which subprocess failed; a custom deployment action may be grouped under that stage. The SendFlow build script contains no direct Git command, but the exact source of `fatal: this operation must be run in a work tree` is not proven until the task log identifies the command, current directory, and whether the build-start marker was printed.

**Why:** Plesk's UI groups work under a phase label, and the summarized error capture does not show the action's stdout/stderr or subprocess command.

**How to apply:** Inspect the full task log before attributing the error to native Git or the custom action. The repository can verify the build script and configuration, but not Plesk's internal checkout, environment, or actual saved action command.

Plesk is the production target for SendFlow; Replit is only the development environment. Do not suggest publishing the production app to Replit.

**Why:** The user explicitly clarified that Plesk, not Replit, must serve the functioning production app.

**How to apply:** Verify Plesk-compatible builds and runtime behavior, and distinguish workspace changes from what is actually deployed on Plesk.

Never use Replit workflow or preview health as evidence that production works. Replit is only the development environment; sendflow.africa production runs on Plesk.

**Why:** The user has repeatedly corrected this distinction after development checks were presented as if they established production health.

**How to apply:** Report production status only from live sendflow.africa checks and the Plesk/GitHub deployment run that transfers to Plesk.

Do not treat a successful standalone TCP smoke test as evidence of Passenger-compatible startup. Test the socket-managed Passenger path without a numeric `PORT` separately.

**Why:** Earlier successful builds and HTTP checks always injected a numeric port, so they did not detect a startup requirement that can prevent Passenger from reaching `listen()`. Official Passenger documentation specifies reverse port binding rather than an application-selected TCP port.

**How to apply:** Keep no-PORT Passenger regression checks alongside standalone checks. Label a simulated Passenger hook as a simulation, not as verification on the actual Plesk host.

When diagnosing a Plesk 500, distinguish access-log entries from server error logs. Access-log screenshots confirm the failing URL and status, but do not identify the crash cause; do not ask the user to resend those same screenshots.

**Why:** The Plesk screenshots supplied for SendFlow showed 500 access entries, not Passenger or Apache error details, and repeating that request delays diagnosis.

**How to apply:** Correlate all evidence already supplied before asking anything. Never ask for the same screenshots again. If the exact startup cause remains unknown, request one distinct missing error-log source; if it is unavailable, continue with code, build, and runtime-configuration checks and clearly separate confirmed facts from hypotheses. When the user replies « Il faut regarder les captures fournies, tout est dedans », do not repeat the log request; continue the independent checks without claiming the captures establish a specific crash cause.

For SendFlow, treat Plesk as the production target and focus work on resolving the production behavior; do not stop at generic advice or present local checks as a production fix.

**Why:** The user explicitly asked that work prioritize correcting the live Plesk deployment.

**How to apply:** Start from the actual Plesk failure and its deployment path. Separate repository changes from actions executed on Plesk, and report production as fixed only after Plesk deployment and live behavior are verified.

GitHub `main` is protected and requires the `build` status check; local commits must go through a feature branch and pull request rather than a direct push to `main`.

**Why:** GitHub rejected a direct update to `main` with `GH006` because the required `build` check had not run for that commit.

**How to apply:** Push the work to a non-protected branch, open a pull request targeting `main`, wait for the Plesk build check to pass, then merge; do not disable branch protection to force a push.
