---
name: Empty CMS collections
description: How public SendFlow pages should interpret empty collections returned by the landing CMS.
---

Treat a successfully loaded public CMS collection as authoritative even when it contains zero visible records. Use local defaults only while the public bundle is unavailable; do not use an empty array as a loading signal.

**Why:** Hiding every record can be an intentional administrator choice. Replacing an empty response with hardcoded defaults makes hidden content public again and contradicts the server's visibility rules.

**How to apply:** For landing countries, operators, FAQs, and other CMS-backed lists, distinguish “bundle not loaded” from “loaded with no visible entries.” Render a clear empty state where needed.
