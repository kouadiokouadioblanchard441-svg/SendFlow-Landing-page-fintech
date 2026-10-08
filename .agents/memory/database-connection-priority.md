---
name: Database targeting
description: Generic SQL helpers can target a different database from the application.
---

Do not assume a generic SQL helper and the application use the same database. A successful write alone does not prove the application can see that data.

**Why:** A generic development SQL helper previously targeted a different database, making a successfully created table appear missing to the application.

**How to apply:** Confirm which database an operation targets before writing, then verify the result through the application's own data access path.