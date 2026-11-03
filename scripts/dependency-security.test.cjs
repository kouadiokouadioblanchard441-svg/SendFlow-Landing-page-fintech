const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

test("the workspace lockfile keeps minimatch on the patched release", () => {
  const workspace = readFileSync("pnpm-workspace.yaml", "utf8");
  const lockfile = readFileSync("pnpm-lock.yaml", "utf8");

  assert.match(workspace, /^  minimatch: ["']?11\.0\.1["']?$/m);
  assert.match(lockfile, /^  minimatch: 11\.0\.1$/m);
  assert.match(lockfile, /^  minimatch@11\.0\.1:$/m);
  assert.doesNotMatch(lockfile, /^  minimatch@10\.2\.6:$/m);
});
