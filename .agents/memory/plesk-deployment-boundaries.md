---
name: Plesk deployment boundaries
description: Hosting constraints discovered when moving SendFlow away from Replit infrastructure
---

External hosting must use direct provider APIs and storage services that exist outside Replit. The Resend integration should use `RESEND_API_KEY` against the official Resend API, and media uploads cannot depend on Replit connectors or the `127.0.0.1:1106` object-storage sidecar.

**Why:** Plesk can run the Node API and serve the static web, but it does not provide Replit’s connector proxy or local object-storage sidecar.

**How to apply:** Before a Plesk production migration, verify email uses the direct provider API and either migrate media to a portable storage service or serve already-migrated public assets without enabling Replit-only upload routes.