---
name: Newsletter campaign retry safety
description: Why failed sends must not be retried automatically without per-recipient delivery tracking.
---

A campaign that entered `sending` and later failed may already have reached some recipients. Keep failed campaigns read-only and do not automatically retry them.

**Why:** The sender tracks aggregate batch counts, not a durable per-recipient delivery result. After a timeout or partial failure, the exact delivered set can be ambiguous, so retrying may create duplicate messages.

**How to apply:** Check the provider's delivery records before creating a replacement campaign. Add per-recipient tracking and provider idempotency before implementing safe retries.
