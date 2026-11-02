---
name: Playwright on Nix
description: Running headless Chromium locally in Replit's NixOS environment.
---

Prefer the Chromium wrapper at `/repl/tools/bin/chromium` for local Playwright runs and pass it as `executablePath`. Playwright-downloaded Chromium can lack host-compatible shared libraries; combining arbitrary Nix libraries through `LD_LIBRARY_PATH` can also break Node or create glibc version conflicts.

**Why:** The preinstalled Replit browser runs against the container's system libraries, while a downloaded browser may not match the container's glibc and library versions.

**How to apply:** Use `/repl/tools/bin/chromium` for local browser runs in Replit; keep the default Playwright browser for CI, where the workflow installs Chromium and its dependencies.
