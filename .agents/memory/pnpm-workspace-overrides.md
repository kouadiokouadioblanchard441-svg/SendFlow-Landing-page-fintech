---
name: Workspace dependency overrides
description: Preserve the monorepo's existing pnpm override set when pinning a transitive dependency
---

Keep dependency overrides in the existing `pnpm-workspace.yaml` override map. Do not add a separate root `package.json` `pnpm.overrides` block without first moving and verifying every existing workspace override.

**Why:** In this workspace, adding the root-manifest override caused pnpm to regenerate the lockfile without the broader existing overrides, including platform-specific optional-package exclusions. Restoring the override in the workspace map reduced the lockfile change to the intended package pin.

**How to apply:** When fixing or pinning a transitive dependency, update the workspace override map, regenerate the lockfile, and compare its complete top-level override section before accepting the change.
