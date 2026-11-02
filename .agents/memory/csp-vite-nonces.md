---
name: SendFlow CSP and Vite nonces
description: How production HTML must preserve per-response nonces for Vite module scripts and dynamic SEO JSON-LD.
---

Apply the response nonce after Vite has built the HTML: Vite removes a `nonce` attribute from the production module-entry script. The server must add its fresh nonce to that compiled script as well as substitute nonce placeholders in the inline loader style. Dynamic JSON-LD should copy the nonce from the trusted entry script.

**Why:** A nonce policy looked correct in source HTML but blocked the production app after Vite stripped the entry-script nonce; browser checks caught it while source-level checks did not.

**How to apply:** When changing Vite build output or CSP middleware, test the served production HTML and open representative public and private routes in a browser, checking for CSP violations and matching nonces on the loaded module and generated JSON-LD.
