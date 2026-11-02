---
name: Git-ignored production assets
description: Prevent required frontend images from disappearing in clean Git checkouts.
---

Production source can import files from `attached_assets/` that exist in the Replit workspace but are ignored by a workspace-level Git ignore rule. A successful local build therefore does not prove that a clean GitHub or Plesk checkout has those files. If the asset is tracked in both the current commit and the remote branch but missing on the server, stop changing ignore rules and compare the server checkout commit, deployment target contents, and locked dependency versions.

**Why:** A clean checkout once failed on imported SendFlow images that were present locally but absent from Git; `git check-ignore` identified the workspace-level ignore rule. Later, a Plesk log reported a missing brand asset that was already tracked in the current and remote commits, alongside a Vite version differing from the lockfile, indicating a checkout/deployment mismatch rather than an ignore-rule defect.

**How to apply:** When a build reports a missing imported asset, confirm whether it is tracked with `git ls-files` and inspect ignore sources with `git check-ignore -v`. If tracked in the active remote revision, verify the server's exact commit and target directory before changing ignore rules. If genuinely untracked because of an ignore rule, add narrow project exceptions and verify the files can be committed; avoid broadly including unrelated user uploads.
