---
name: SendFlow developer API
description: User-confirmed API availability and the boundary around undocumented API details.
---

SendFlow's developer API is available. The user supplied a pay-in endpoint and JSON payload for the public documentation example. The repository's OpenAPI document does not describe the API's authentication or response contract.

**Why:** The user specified the request example, but did not provide authentication headers or a response schema.

**How to apply:** Use the supplied endpoint and fields in the public example. Do not invent authentication or response behavior, or treat those unspecified details as verified for a functional integration.
