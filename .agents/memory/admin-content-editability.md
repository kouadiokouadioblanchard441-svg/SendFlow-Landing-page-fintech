---
name: Admin content editability
description: The user's project-wide requirement for SendFlow content management.
---

All SendFlow site information must be editable through the administrator panel; nothing should be hardcoded. Operational settings belong in the backend/database and must be exposed through validated APIs; the frontend only displays them and submits admin edits.

**Why:** the user repeatedly corrected the scope and explicitly emphasized that everything must be editable in the panel.

**How to apply:** Audit every public page and route for fixed content and ensure the corresponding information can be managed in the administrator panel. Do not put runtime URLs, rates, operator availability, or other editable configuration in frontend source or Vite environment variables.
