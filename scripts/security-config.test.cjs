const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function ignoreRuleFor(filePath) {
  return spawnSync(
    "git",
    ["check-ignore", "--no-index", "-v", filePath],
    { cwd: repoRoot, encoding: "utf8" },
  );
}

test("runtime environment files and common private-key files are ignored by the project rules", () => {
  for (const filePath of [
    ".env",
    ".env.local",
    ".env.production",
    "artifacts/api-server/.env.production",
    ".envrc",
    ".netrc",
    ".npmrc.local",
    "private.pem",
    "private.key",
    "private.p12",
    "private.pfx",
    "secrets.json",
    "credentials.json",
  ]) {
    const result = ignoreRuleFor(filePath);
    assert.equal(result.status, 0, `${filePath} should be ignored`);
    assert.match(result.stdout, /\.gitignore/, `${filePath} must be protected by this repository`);
  }
});

test("environment example templates remain eligible for Git", () => {
  for (const filePath of [".env.example", "artifacts/api-server/.env.example"]) {
    const result = ignoreRuleFor(filePath);
    assert.equal(result.status, 1, `${filePath} should not be ignored`);
  }
});
