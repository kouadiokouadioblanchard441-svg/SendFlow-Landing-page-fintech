---
name: SendFlow developer API
description: User-confirmed API availability and the boundary around undocumented API details.
---

SendFlow's developer API is available. The user confirmed this on 2026-10-27. The repository's OpenAPI document does not describe its business endpoints, authentication contract, or payloads.

The user requested a public landing-page code example modeled on a Laravel checkout flow, using the SendFlow domain. They explicitly said this displayed example does not need to match the real API contract. It uses illustrative payment-route, header, and checkout-response names, and is labeled as an example.

**Why:** The user wants the landing page to show a clean checkout example even though exact payment endpoint details are not supplied.

**How to apply:** This illustrative exception applies only to the landing-page sample. Do not treat its route, headers, or checkout response as real API details, or reuse them for functional integrations or technical documentation. Use the official contract for working API code.
