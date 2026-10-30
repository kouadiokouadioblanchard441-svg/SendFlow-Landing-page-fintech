const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  getPinnedPnpmVersion,
  validatePackageManagerUserAgent,
} = require("./check-package-manager.cjs");

test("reads the exact pnpm version pinned by the workspace", () => {
  assert.equal(getPinnedPnpmVersion(), "10.26.1");
});

test("accepts the pinned pnpm installer", () => {
  assert.deepEqual(
    validatePackageManagerUserAgent("pnpm/10.26.1 npm/? node/v24.22.1 linux x64"),
    { ok: true, version: "10.26.1" },
  );
});

test("rejects npm and other package managers", () => {
  assert.match(
    validatePackageManagerUserAgent("npm/10.8.2 node/v24.22.1").message,
    /Use pnpm 10\.26\.1/,
  );
});

test("rejects pnpm versions that differ from the workspace pin", () => {
  assert.match(
    validatePackageManagerUserAgent("pnpm/12.16.1 npm/? node/v24.22.1").message,
    /requires pnpm 10\.26\.1.*current installer is pnpm 12\.16\.1/,
  );
});

test("Plesk deploy chain does not run Git or require a worktree", () => {
  const deploymentFiles = [
    "plesk-git-deploy.sh",
    "plesk-deploy.sh",
    "plesk-pnpm.sh",
    "prepare-plesk-build.mjs",
    "verify-plesk-build.mjs",
  ];
  for (const file of deploymentFiles) {
    const source = readFileSync(path.join(__dirname, file), "utf8");
    assert.doesNotMatch(source, /(?:^|[\s;&|])git(?:\s|$)/m, `${file} must not invoke Git`);
    assert.doesNotMatch(source, /\.git\b/, `${file} must not require a .git directory`);
  }

  const hook = readFileSync(path.join(__dirname, "plesk-git-deploy.sh"), "utf8");
  assert.match(hook, /run deploy:plesk/);
  assert.match(hook, /mkdir -p dist\/tmp/);
  assert.match(hook, /touch dist\/tmp\/restart\.txt/);
});
