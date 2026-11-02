"use strict";

const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const deployScript = path.join(__dirname, "plesk-remote-deploy.sh");
const releaseId = `${"a".repeat(40)}-12345-1`;

function withTempTree(run) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "sendflow-plesk-remote-deploy-"),
  );
  try {
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function createReleaseArchive(root, releaseFolder = "release", id = releaseId) {
  const sourceRoot = path.join(root, releaseFolder);
  const sourceDist = path.join(sourceRoot, "dist");
  const targetRoot = path.join(root, "sendflow.africa");
  fs.mkdirSync(path.join(sourceDist, "public"), { recursive: true });
  fs.mkdirSync(targetRoot, { recursive: true });
  for (const [relativePath, content] of [
    ["index.cjs", "console.log('new release');\n"],
    ["package.json", '{"private":true}\n'],
    ["build-info.json", '{"buildId":"test-build"}\n'],
    ["public/index.html", "<!doctype html><title>SendFlow</title>\n"],
    ["public/.htaccess", "RewriteEngine On\n"],
  ]) {
    fs.writeFileSync(path.join(sourceDist, relativePath), content);
  }
  const archive = path.join(targetRoot, `.sendflow-upload-${id}.tar.gz`);
  execFileSync("tar", ["-czf", archive, "-C", sourceRoot, "dist"]);
  return { sourceDist, targetRoot, archive };
}

test("deploys the validated dist, keeps the previous release, and requests Passenger restart", () => {
  withTempTree((root) => {
    const { targetRoot, archive } = createReleaseArchive(root);
    const oldDist = path.join(targetRoot, "dist");
    fs.mkdirSync(oldDist);
    fs.writeFileSync(path.join(oldDist, "index.cjs"), "old server\n");
    fs.writeFileSync(
      path.join(oldDist, "build-info.json"),
      '{"buildId":"old"}\n',
    );
    fs.writeFileSync(path.join(oldDist, "old-release.txt"), "preserve\n");

    const result = spawnSync(
      "bash",
      [deployScript, targetRoot, releaseId, archive],
      { cwd: root, encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /PLESK_RELEASE_DEPLOYED/);
    assert.equal(
      fs.readFileSync(
        path.join(targetRoot, "dist", "public", "index.html"),
        "utf8",
      ),
      "<!doctype html><title>SendFlow</title>\n",
    );
    assert.ok(
      fs.statSync(path.join(targetRoot, "dist", "tmp", "restart.txt")).isFile(),
    );
    assert.equal(
      fs.readFileSync(
        path.join(targetRoot, ".sendflow-dist-backup", "old-release.txt"),
        "utf8",
      ),
      "preserve\n",
    );
    assert.equal(fs.existsSync(archive), false);
  });
});

test("keeps only the latest previous generated build as the rollback copy", () => {
  withTempTree((root) => {
    const firstId = releaseId;
    const secondId = `${"b".repeat(40)}-12345-1`;
    const first = createReleaseArchive(root, "first-release", firstId);
    const firstDeploy = spawnSync(
      "bash",
      [deployScript, first.targetRoot, firstId, first.archive],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(firstDeploy.status, 0, firstDeploy.stderr);
    fs.writeFileSync(
      path.join(first.targetRoot, "dist", "version-marker.txt"),
      "first version\n",
    );

    const second = createReleaseArchive(root, "second-release", secondId);
    const secondDeploy = spawnSync(
      "bash",
      [deployScript, second.targetRoot, secondId, second.archive],
      { cwd: root, encoding: "utf8" },
    );

    assert.equal(secondDeploy.status, 0, secondDeploy.stderr);
    assert.equal(
      fs.readFileSync(
        path.join(
          second.targetRoot,
          ".sendflow-dist-backup",
          "version-marker.txt",
        ),
        "utf8",
      ),
      "first version\n",
    );
    assert.equal(
      fs
        .readdirSync(second.targetRoot)
        .filter((entry) => entry.startsWith(".sendflow-dist-backup")).length,
      1,
    );
  });
});

test("rejects destinations other than sendflow.africa without touching them", () => {
  withTempTree((root) => {
    const targetRoot = path.join(root, "httpdocs");
    fs.mkdirSync(targetRoot);
    fs.writeFileSync(path.join(targetRoot, "keep.txt"), "unchanged\n");
    const archive = path.join(
      targetRoot,
      `.sendflow-upload-${releaseId}.tar.gz`,
    );

    const result = spawnSync(
      "bash",
      [deployScript, targetRoot, releaseId, archive],
      { cwd: root, encoding: "utf8" },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing to deploy outside/);
    assert.equal(
      fs.readFileSync(path.join(targetRoot, "keep.txt"), "utf8"),
      "unchanged\n",
    );
  });
});

test("rejects an incomplete package and leaves the live dist unchanged", () => {
  withTempTree((root) => {
    const targetRoot = path.join(root, "sendflow.africa");
    const sourceRoot = path.join(root, "invalid-release");
    const sourceDist = path.join(sourceRoot, "dist");
    const liveDist = path.join(targetRoot, "dist");
    const archive = path.join(
      targetRoot,
      `.sendflow-upload-${releaseId}.tar.gz`,
    );
    fs.mkdirSync(path.join(sourceDist, "public"), { recursive: true });
    fs.mkdirSync(liveDist, { recursive: true });
    fs.writeFileSync(path.join(sourceDist, "index.cjs"), "new\n");
    fs.writeFileSync(path.join(liveDist, "live.txt"), "keep current release\n");
    execFileSync("tar", ["-czf", archive, "-C", sourceRoot, "dist"]);

    const result = spawnSync(
      "bash",
      [deployScript, targetRoot, releaseId, archive],
      { cwd: root, encoding: "utf8" },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /missing dist\/package.json/);
    assert.equal(
      fs.readFileSync(path.join(liveDist, "live.txt"), "utf8"),
      "keep current release\n",
    );
  });
});
