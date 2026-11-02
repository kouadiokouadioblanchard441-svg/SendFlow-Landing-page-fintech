---
name: Playwright on Nix
description: Running headless Chromium locally in Replit's NixOS environment.
---

Playwright's `install --with-deps` expects apt and sudo, which are unavailable in this workspace. Download the browser without `--with-deps`, install missing shared libraries through Nix, then expose library directories with `LD_LIBRARY_PATH` when launching tests.

**Why:** Chromium may download successfully but still fail at launch because NixOS does not expose all runtime shared libraries to the shell by default.

**How to apply:** Use this only for local browser runs in Replit; GitHub Actions on Ubuntu can use Playwright's `install --with-deps` normally.
