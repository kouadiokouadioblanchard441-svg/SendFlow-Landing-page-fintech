---
name: Environment example hygiene
description: Keep credentials out of tracked environment templates and account for Git history.
---

Tracked environment examples must contain unmistakable placeholders only. Automated secret scanners can miss credential-shaped values, and replacing a value in the current file does not remove older copies from Git history.

**Why:** a manual SendFlow review found non-placeholder-looking remote service values in the tracked example even though the automated privacy scan reported no findings.

**How to apply:** inspect sensitive variable values without printing them; use unmistakable placeholders, check remote refs and history, and treat possibly valid committed credentials as exposed until rotated. Never rewrite shared history or force-push without explicit authorization.
