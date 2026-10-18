# SendFlow deployment on cPanel

## Automatic build after Git deployment

cPanel Git Version Control runs the tasks in `.cpanel.yml` when you deploy the
checked-out HEAD commit. The deployment hook does not run `git pull`: update the
repository from GitHub in cPanel first, then use **Deploy HEAD Commit**. The hook
then:

1. Installs the locked workspace dependencies with pnpm.
2. Runs the full test, type-check, frontend, and server build.
3. Verifies the production files in `dist/`.
4. Touches `tmp/restart.txt` in the Node application root to request a Passenger
   restart.

`dist/` remains ignored by Git intentionally. cPanel generates it after each
deployment, so it does not need to be committed or uploaded from the Replit
workspace.

## cPanel Node.js application settings

- **Application root:** the repository root (`/home/<account>/sendflow.africa`,
  using the actual path shown by cPanel).
- **Startup file:** `index.cjs` at that root. It loads `dist/index.cjs`.
- **Node.js:** Node 22, or Node 20.19 or newer.
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

The repository hook cannot change cPanel's Application Root, domain Document
Root, Node.js version, or environment variables. Configure those once in cPanel.
After a Git deployment, cPanel should run `.cpanel.yml`; if Passenger does not
restart from `tmp/restart.txt`, use **Restart App** in the Node.js application
dashboard.
