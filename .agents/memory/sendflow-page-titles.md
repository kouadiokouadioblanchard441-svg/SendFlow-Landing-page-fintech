---
name: SendFlow page titles
description: Localized browser titles for public routes and static Plesk output.
---

Every public route should have its own title in French and English, beginning with that page’s localized name. Keep runtime browser titles and generated Plesk HTML titles aligned. Legal routes need distinct fallback titles in both languages.

**Why:** The user explicitly wants each page’s name visible in the browser.

**How to apply:** When adding or editing routes, preserve distinct localized titles across static metadata and client-side navigation, and verify both in tests.
