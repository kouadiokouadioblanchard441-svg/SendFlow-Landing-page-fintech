---
name: SendFlow fee configuration
description: Storage and publishing rules for operator fee schedules.
---

Store the operator fee schedule in the existing landing-content CMS with a dedicated, validated admin editor; avoid a new database table or migration for this data.

**Why:** SendFlow is deployed through a Plesk build that must not run production migrations, and the owner requires fee values to remain editable in the admin panel.

**How to apply:** Public pages should read published values from persisted CMS content. Do not display guessed or hardcoded fees when that record is missing or incomplete; let the admin editor supply and save the initial values.

The public fee representation is intentionally limited to operators associated with Côte d’Ivoire; it is not a complete Africa-wide fee schedule. Do not add an operator to the catalog just to fill a mockup without explicit approval.

**Why:** The owner clarified that this section is a small Côte d’Ivoire example, not a comprehensive list of all regional operators.

**How to apply:** Derive the fee-section operators from the visible Côte d’Ivoire country/operator associations. Keep other countries’ operator listings unchanged.
