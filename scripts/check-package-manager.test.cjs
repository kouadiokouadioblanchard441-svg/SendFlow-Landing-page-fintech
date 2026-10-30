const assert = require("node:assert/strict");
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
