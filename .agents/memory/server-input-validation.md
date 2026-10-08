---
name: Server-side input validation
description: SendFlow's trust boundary for browser-provided requests and stored values.
---

Treat all browser-provided values as untrusted. Validate request bodies, path IDs, enum values, associations, URLs, and file metadata/content on the server before persistence or use. Client-side validation is only a usability aid; database constraints remain a second line of defense.

**Why:** the user explicitly requires that the server validate all input and that code must not be trusted.

**How to apply:** add or reuse strict API-boundary schemas for every create/update path, reject unknown fields, enforce bounds and references, and validate uploaded bytes rather than trusting browser headers.
