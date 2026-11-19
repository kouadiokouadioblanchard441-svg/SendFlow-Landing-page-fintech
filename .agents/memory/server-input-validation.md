---
name: Server-side input validation
description: SendFlow's trust boundary for browser-provided requests and stored values.
---

Treat all browser-provided values as untrusted. Validate request bodies, path IDs, enum values, associations, URLs, and file metadata/content on the server before persistence or use. Client-side validation is only a usability aid; database constraints remain a second line of defense. For SendFlow visitor monitoring, derive IP, GeoIP, browser/device estimates, deduplication, authorization, and Telegram actions on the backend. Treat browser-sent page/click events only as untrusted telemetry hints, never as a security or identity decision.

**Why:** the user explicitly requires that the server validate all input, that code must not be trusted, and that SendFlow’s sensitive logic remain on the backend rather than depending on browser behavior.

**How to apply:** add or reuse strict API-boundary schemas for every create/update path, reject unknown fields, enforce bounds and references, and validate uploaded bytes rather than trusting browser headers. Derive security-relevant visitor metadata from the server request and do not let client telemetry choose IP, location, account identity, or enforcement outcomes.
