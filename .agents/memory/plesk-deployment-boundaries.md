---
name: Plesk deployment boundaries
description: Hosting constraints discovered when moving SendFlow away from Replit infrastructure
---

External hosting must use direct provider APIs and storage services that exist outside Replit. The Resend integration should use `RESEND_API_KEY` against the official Resend API, and media uploads cannot depend on Replit connectors or the `127.0.0.1:1106` object-storage sidecar.

**Why:** Plesk can run the Node API and serve the static web, but it does not provide Replit’s connector proxy or local object-storage sidecar.

**How to apply:** Before a Plesk production migration, verify email uses the direct provider API and either migrate media to a portable storage service or serve already-migrated public assets without enabling Replit-only upload routes.

The current Clerk tenant is Replit-managed. A successful local production build does not establish that Clerk authentication will work on an external Plesk domain, nor does it provide verified external-production keys.

**Why:** Management status was confirmed through the platform; the running workspace uses development authentication. Domain authorization and production credentials are deployment prerequisites, not properties a compiler can verify.

**How to apply:** Keep existing keys unchanged during build checks. Report external-domain Clerk authentication as unverified until it has been configured and tested on the target HTTPS host.