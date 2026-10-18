---
name: SendFlow authentication scope
description: The user's standing decision about authentication providers and the admin panel.
---

Do not use Clerk in SendFlow. The user explicitly requested removing the service everywhere. Preserve the existing independent admin login/session unless the user asks to change it.

**Why:** Clerk caused confusion during the Plesk deployment discussion, and the user does not want SendFlow to depend on it.

**How to apply:** Do not reintroduce Clerk packages, auth routes, proxy middleware, keys, or deployment requirements. Keep admin access protected by its current separate server-side authentication.
