---
name: Plesk build identity
description: Safe way to distinguish generated Plesk packages from the runtime
---

Use a fresh, opaque UUID for each prepared Plesk package instead of exposing a commit hash, build path, environment variable, or deployment configuration. Expose only that UUID through the public health response; compare it with the identifier printed by the deployment build.

**Why:** Repeated deployment attempts from the same commit still need to be distinguishable, and the public check must not reveal repository or host details.

**How to apply:** Keep the generated build metadata in the Plesk application root and make the health endpoint report an explicit missing value when running outside a packaged build.
