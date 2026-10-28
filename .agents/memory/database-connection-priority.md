---
name: Database targeting
description: Generic SQL helpers can target a different database from the application.
---

Do not assume a generic SQL helper and the application use the same database. A successful write alone does not prove the application can see that data.

**Why:** A generic development SQL helper previously targeted a different database, making a successfully created table appear missing to the application.

**How to apply:** Confirm which database an operation targets before writing, then verify the result through the application's own data access path.

For CMS compare-and-swap writes, guard on the exact original `value` or lock the row; do not rely on JavaScript `Date` equality for `updatedAt`.

**Why:** A timestamp equality update matched zero rows even though the selected fee record was still unchanged; comparing its exact stored value succeeded.

**How to apply:** When saving JSON-backed CMS data, preserve the fetched object, compare its original serialized value in the update condition, then verify the saved result through the public API.