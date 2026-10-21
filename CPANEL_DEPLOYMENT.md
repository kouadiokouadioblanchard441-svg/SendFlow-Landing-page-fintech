# SendFlow deployment on cPanel

## Automatic build after Git deployment

cPanel Git Version Control runs the tasks in `.cpanel.yml` when you deploy the
checked-out HEAD commit. The deployment hook does not run `git pull`: update the
repository from GitHub in cPanel first, then use **Deploy HEAD Commit**. The hook
then:

1. Installs the locked workspace dependencies with pnpm.
2. Runs the full test, type-check, frontend, and server build.
3. Verifies the production files in `dist/`.
4. Touches `dist/tmp/restart.txt` to request a Passenger restart. This matches
   the configured Node application root `dist`.

`dist/` remains ignored by Git intentionally. cPanel generates it after each
deployment, so it does not need to be committed or uploaded from the Replit
workspace.

## cPanel Node.js application settings

- **Application root:** the repository root (`/home/<account>/sendflow.africa`,
  using the actual path shown by cPanel).
- **Startup file:** `index.cjs` at that root. It loads `dist/index.cjs`.
- **Node.js:** Node 24 if the host offers it (the development/CI baseline),
  otherwise Node 22.12+ within the 22.x branch. Node 20.19+ within 20.x remains
  accepted for existing hosting; prefer a maintained LTS branch.
- **Package manager:** Corepack should be available so the hook uses the exact
  pnpm version pinned in the root `package.json` (`pnpm@10.26.1`). The hook
  rejects a mismatched global pnpm rather than silently using it.
- **Environment:** set the app's production variables in cPanel's Node.js app
  configuration. `APP_URL` should be `https://sendflow.africa`. The build hook
  also uses this public origin (and defaults it to that value).

The Express application serves the compiled frontend from `dist/public` and
handles `/api` routes in the same Node process. Do not set the **Application
root** to `dist`; the configured root startup file expects `dist/` beneath the
repository root. Do not expose `dist/` itself as a static document root because
it contains the server bundle. The domain must continue routing requests to the
cPanel Node.js application; if cPanel requires a separate static Document Root,
`dist/public` is the public-files directory, but confirm that this does not
bypass the Node application for page and API requests.

## What remains a cPanel action

### Node.js availability and compatibility

The broader hosting compatibility is intentional, not a claim that every
accepted version has passed CI. Both deployment hooks use
`scripts/check-deploy-node.cjs` and accept `^20.19.0 || >=22.12.0`, the requirement
declared by the locked Vite 7 and React plugin packages
([Vite requirements](https://vite.dev/guide/#scaffolding-your-first-vite-project)).
Node 22.0–22.11 was previously accepted incorrectly and is now rejected before
installation; Node 21 remains rejected. Later versions satisfying this range
remain accepted, but odd-numbered or unmaintained branches are not recommended
for production.

Only Node 24 is currently covered by the GitHub build/runtime checks. Other
accepted versions require a successful full build and runtime verification on
the host. The generated `dist/package.json` declares a runtime minimum of
`>=20.19.0`; that dependency-free runtime manifest does not describe the
requirements for building the repository. Development-only tools such as Orval
code generation may require newer Node versions; use Node 24 for that work.

The [cPanel installation guide](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)
lists EasyApache packages including `ea-nodejs20` and `ea-nodejs22`, with
availability depending on the OS and packages installed by the provider.
Do not assume Node 24 is available just because the workspace uses it.
CloudLinux Node.js Selector installations may offer a different list.
This repository cannot establish which runtime is installed on a particular
hosting account.

Ensure the Git deployment shell's `PATH` uses the same Node version as the
Passenger application. In the shell that runs the hook, check:

```sh
node -p 'process.version + " " + process.execPath'
node scripts/check-deploy-node.cjs
```

The shared check reports the actual executable and warns when it is not the
Node 24 baseline. Passing this check confirms the version prerequisite only.
After changing versions, run **Deploy HEAD Commit**, restart the application,
and check `/`, `/fonctionnalites/`, `/en/`, and `/api/healthz` on the configured
domain. The health endpoint confirms an API response, not database or external
service health.

The repository hook cannot change cPanel's Application Root, domain Document
Root, Node.js version, or environment variables. Configure those once in cPanel.
After a Git deployment, cPanel should run `.cpanel.yml`; if Passenger does not
restart from `dist/tmp/restart.txt`, use **Restart App** in the Node.js
application dashboard.
