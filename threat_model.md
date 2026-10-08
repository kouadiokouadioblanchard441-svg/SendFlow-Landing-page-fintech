# Threat Model

## Project Overview

SendFlow's web project serves public marketing, landing, download, and legal pages, plus an authenticated administration panel for site content and newsletter campaigns. It uses React/Vite, an Express API, PostgreSQL through Drizzle, Clerk for customer-facing identity flows, a separate custom admin session, and Resend for email campaigns. Plesk production is intended to run the bundled Express server, which serves `dist/public` and the API.

## Assets

- **Admin credentials and sessions** — password hashes, panel URL token/email, and admin session cookies. Their compromise could expose CMS data and permit newsletter sends or edits.
- **Subscriber data** — email addresses, consent state, and unsubscribe tokens stored in PostgreSQL.
- **Site and legal content** — CMS drafts, visibility state, founder/contact details, and uploaded media.
- **Application secrets and database access** — Neon, Clerk, and Resend credentials; these must remain server-side and out of logs and client bundles.
- **Operational evidence** — logs and records needed to investigate admin changes and campaign sends, without recording credentials or private URL tokens.

## Trust Boundaries

- **Visitor/browser to Express** — requests cross the hosting reverse proxy and enter public or authenticated API routes; all client data is untrusted.
- **Public to admin** — public landing/newsletter endpoints are separate from CMS, subscriber, and campaign operations, which require the admin session.
- **Express to PostgreSQL** — server routes read and modify content, subscriber records, campaign state, and admin sessions.
- **Express to third parties** — Clerk authentication proxy and Resend API calls use server-side configuration and credentials.
- **Application to object storage** — media uploads and public media reads cross a storage boundary. The current Replit-local storage dependency is not a Plesk-compatible production storage design.
- **Development to Plesk production** — build-time `VITE_*` values become public frontend configuration; runtime server credentials must only be configured on the server.

## Scan Anchors

- Production entry/build: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/build.mjs`, `scripts/prepare-plesk-build.mjs`.
- Highest-risk routes: `artifacts/api-server/src/routes/landing.ts`, `adminAuth.ts`, and `storage.ts`; security controls: `artifacts/api-server/src/middlewares/`.
- Public: `/api/landing`, newsletter subscribe/unsubscribe, static pages, and public media. Admin: `/api/admin/*` and `/panel/:token/:email`.
- Frontend and backend source are production-relevant; Vite configuration, tests, and API specification packages are build/development surfaces unless included in the deployed runtime.

## Threat Categories

### Spoofing

Admin authentication uses a scrypt password hash, random session tokens stored as hashes, and an HttpOnly/SameSite cookie; production cookies require HTTPS. Admin access must remain server-enforced, rate limits must identify real clients behind Plesk without trusting arbitrary forwarded headers, and the panel URL token must not be treated as a replacement for the password. Clerk must be verified with production keys and the actual Plesk domain before launch.

### Tampering

All CMS mutations and campaign operations must require a valid admin session. Keep database operations parameterized and validate field types, lengths, and allowed values server-side, not only field names. Media uploads must enforce both a strict image format allowlist and the actual file content before public serving.

### Repudiation

Admin changes and newsletter sends need attributable, timestamped audit evidence. Logs must not contain passwords, session cookies, panel URL tokens, subscriber addresses where unnecessary, or campaign contents.

### Information Disclosure

Public responses must contain only published records and fields required by visitors. The public landing endpoint currently selects whole content tables and relies on the browser to hide records marked invisible; current live data had no invisible rows during this review, but future drafts could be disclosed. The panel token and email in `/panel/:token/:email` must be redacted from application and hosting access logs. Plesk must expose only `dist/public` as static content; server source maps are emitted alongside the server bundle and must not be made publicly reachable.

### Denial of Service

Request bodies and public endpoints need bounded work and abuse controls. Current rate limits are in-memory per process and use Express `req.ip`; behind a reverse proxy, client IP handling and rate-limit sharing must be explicitly validated for Plesk. Production limits should not collapse all visitors into one bucket or reset on each process restart.

### Elevation of Privilege

Every admin route must enforce authorization on the server, including reads and mutations; frontend route guards are not security controls. Preserve the current separation between the custom admin session and public routes, and test unauthenticated access to each admin API after deployment.
