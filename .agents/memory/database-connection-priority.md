---
name: Database connection priority
description: This project uses the Neon connection variable exclusively for schema, seed scripts, and the running API.
---

The project database layer, schema tooling, seed scripts, and running API require `NEON_DATABASE_URL`; they must not fall back to a generic database variable.

**Why:** A generic development SQL helper can point at a different database when both variables exist, making a successfully applied Neon table appear missing.

**How to apply:** Use the project’s db package scripts or app connection for development data initialization, and verify the resulting row through `/api/landing`; generic SQL helpers may point to another database.