---
name: SendFlow 404 behavior
description: The intended appearance and meaning of SendFlow's page for nonexistent URLs.
---

Unknown SendFlow URLs should display a simple, white, browser-error-inspired page that clearly says the requested page does not exist. Localize visible copy for French and English. Do not reproduce Chrome's actual network-error wording or imply the whole SendFlow site is unreachable.

**Why:** The user shared a browser error screenshot as a visual reference but clarified that the message should indicate the page itself does not exist.

**How to apply:** Use this for public frontend fallback routes. Keep the page visually minimal, localized, and distinct from the global React error boundary.
