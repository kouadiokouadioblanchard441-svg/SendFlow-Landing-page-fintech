"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const { isSupportedBuildNode } = require("./check-deploy-node.cjs");

test("build compatibility includes Node 20.19+, 22.13+, and even-numbered LTS versions", () => {
  for (const version of ["20.19.0", "20.20.0", "22.13.0", "22.23.0", "24.0.0", "26.0.0"]) {
    assert.equal(isSupportedBuildNode(version), true, version);
  }
});

test("rejects versions below the toolchain minimum and odd Node lines", () => {
  for (const version of ["18.20.0", "20.18.9", "21.0.0", "21.99.0", "22.0.0", "22.12.9", "23.0.0", "25.0.0", "24.0.0-rc.1", "invalid"]) {
    assert.equal(isSupportedBuildNode(version), false, version);
  }
});

test("both deployment hooks use the same check before dependency installation", () => {
  for (const hook of ["plesk-deploy.sh", "cpanel-deploy.sh"]) {
    const source = readFileSync(path.join(__dirname, hook), "utf8");
    const check = source.indexOf('node scripts/check-deploy-node.cjs');
    assert.ok(check > 0, hook);
    assert.ok(check < source.indexOf("install --frozen-lockfile"), hook);
    assert.ok(source.includes("set -Eeuo pipefail"), hook);
  }
});

test("CLI checks the actual runtime and reports its executable", () => {
  const result = spawnSync(process.execPath, [require.resolve("./check-deploy-node.cjs")], { encoding: "utf8" });
  assert.equal(result.status, isSupportedBuildNode(process.versions.node) ? 0 : 1);
  if (result.status === 0) {
    assert.ok(result.stdout.includes(process.versions.node));
    assert.ok(result.stdout.includes(process.execPath));
  }
});

test("version failures are actionable and non-baseline versions warn without failing", () => {
  for (const version of ["20.18.0", "22.12.9", "20.19.0", "22.13.0", "24.13.0"]) {
    const result = spawnSync(process.execPath, ["-e", `
      const { checkDeployNode } = require(${JSON.stringify(require.resolve("./check-deploy-node.cjs"))});
      process.exitCode = checkDeployNode(${JSON.stringify(version)}, "/host/bin/node");
    `], { encoding: "utf8" });
    assert.equal(result.status, isSupportedBuildNode(version) ? 0 : 1, version);
    if (result.status !== 0) {
      assert.match(result.stderr, /Unsupported Node.js/);
      assert.match(result.stderr, /22\.13\+/);
    } else {
      assert.match(result.stdout, /\/host\/bin\/node/);
      assert.equal(result.stderr.includes("Compatibility mode"), !version.startsWith("24."));
    }
  }
});
