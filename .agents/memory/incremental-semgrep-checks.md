---
name: Incremental Semgrep checks
description: Why SendFlow's pull-request security scan compares findings to the base revision.
---

Run Semgrep against the PR base (or the previous pushed commit) and fail on newly introduced findings instead of treating every existing finding as a new blocker. The `http://127.0.0.1:1106` object-storage sidecar calls are local-only and trigger Semgrep's insecure-HTTP rule.

**Why:** A full-repository security-audit scan found these existing loopback calls and would fail all otherwise unrelated changes; incremental comparison retains a blocking check for regressions without broad suppressions.

**How to apply:** Keep the base revision available in CI and confirm the baseline matches the PR target. Reassess the exception if the sidecar stops being loopback-only or the transport changes.
