---
name: Git-ignored production assets
description: Prevent required frontend images from disappearing in clean Git checkouts.
---

Production source can import files from `attached_assets/` that exist in the Replit workspace but are ignored by a workspace-level Git ignore rule. A successful local build therefore does not prove that a clean GitHub or Plesk checkout has those files.

**Why:** A clean checkout failed on imported SendFlow images that were present locally but absent from Git; `git check-ignore` identified the workspace-level ignore rule.

**How to apply:** When a build reports a missing imported asset, confirm whether it is tracked with `git ls-files` and inspect ignore sources with `git check-ignore -v`. Add narrow project `.gitignore` exceptions for required production assets and verify they appear in `git ls-files --others --exclude-standard` so they can be committed; avoid broadly including unrelated user uploads.
