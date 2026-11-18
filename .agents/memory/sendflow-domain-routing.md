---
name: SendFlow domain routing
description: User-selected production hostnames for the public site, merchant app, and API documentation.
---

Use `sendflow.africa` for the landing page, `merchent.business.sendflow.africa` for the merchant application and account creation, and `apis.docs.sendflow.africa` for API documentation. Do not replace these with simpler or alternative hostnames.

**Why:** The user corrected the merchant hostname spelling; public DNS and the live site confirm `merchent.business.sendflow.africa`.

**How to apply:** Keep signup and documentation destinations configurable through the admin CMS, set these exact HTTPS URLs there, and verify public DNS separately from Plesk host configuration.
