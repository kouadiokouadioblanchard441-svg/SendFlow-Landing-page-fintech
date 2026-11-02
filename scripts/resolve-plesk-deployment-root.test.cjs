"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { resolvePleskDeploymentRoot } = require("./resolve-plesk-deployment-root.cjs");

function withTempTree(run) {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "sendflow-plesk-target-test-"),
  );
  try {
    run(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("resolves an explicit deployment target relative to the checkout", () => {
  withTempTree((tempRoot) => {
    const repoRoot = path.join(tempRoot, "git");
    const deploymentRoot = path.join(tempRoot, "sendflow.africa");
    fs.mkdirSync(repoRoot);
    fs.mkdirSync(deploymentRoot);

    assert.equal(
      resolvePleskDeploymentRoot(repoRoot, {
        PLESK_DEPLOYMENT_ROOT: "../sendflow.africa",
      }),
      fs.realpathSync(deploymentRoot),
    );
  });
});

test("requires an explicit Plesk target instead of guessing from /git", () => {
  withTempTree((tempRoot) => {
    const repoRoot = path.join(tempRoot, "git");
    const deploymentRoot = path.join(tempRoot, "sendflow.africa");
    fs.mkdirSync(repoRoot);
    fs.mkdirSync(deploymentRoot);

    assert.throws(
      () =>
        resolvePleskDeploymentRoot(repoRoot, {
          PLESK_REQUIRE_DEPLOYMENT_ROOT: "1",
        }),
      /PLESK_DEPLOYMENT_ROOT is required/,
    );
  });
});

test("keeps local and CI builds in their checkout by default", () => {
  withTempTree((tempRoot) => {
    const repoRoot = path.join(tempRoot, "workspace");
    fs.mkdirSync(repoRoot);

    assert.equal(
      resolvePleskDeploymentRoot(repoRoot, {}),
      fs.realpathSync(repoRoot),
    );
  });
});

test("requires an explicit target when the Plesk action requests one", () => {
  withTempTree((tempRoot) => {
    const repoRoot = path.join(tempRoot, "git");
    fs.mkdirSync(repoRoot);

    assert.throws(
      () =>
        resolvePleskDeploymentRoot(repoRoot, {
          PLESK_REQUIRE_DEPLOYMENT_ROOT: "1",
        }),
      /PLESK_DEPLOYMENT_ROOT is required/,
    );
  });
});

test("rejects a missing, wrong, or filesystem-root target", () => {
  withTempTree((tempRoot) => {
    const repoRoot = path.join(tempRoot, "git");
    const wrongTarget = path.join(tempRoot, "httpdocs");
    fs.mkdirSync(repoRoot);
    fs.mkdirSync(wrongTarget);

    assert.throws(
      () =>
        resolvePleskDeploymentRoot(repoRoot, {
          PLESK_DEPLOYMENT_ROOT: "../missing/sendflow.africa",
        }),
      /deployment target does not exist/,
    );
    assert.throws(
      () =>
        resolvePleskDeploymentRoot(repoRoot, {
          PLESK_DEPLOYMENT_ROOT: "../httpdocs",
          PLESK_REQUIRE_DEPLOYMENT_ROOT: "1",
        }),
      /must be the existing sendflow\.africa directory/,
    );
    assert.throws(
      () =>
        resolvePleskDeploymentRoot(repoRoot, {
          PLESK_DEPLOYMENT_ROOT: path.parse(repoRoot).root,
          PLESK_REQUIRE_DEPLOYMENT_ROOT: "1",
        }),
      /filesystem root/,
    );
  });
});
