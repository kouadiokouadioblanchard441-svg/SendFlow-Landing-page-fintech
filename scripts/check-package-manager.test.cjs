const assert = require("node:assert/strict");
const {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
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
    validatePackageManagerUserAgent(
      "pnpm/10.26.1 npm/? node/v24.22.1 linux x64",
    ),
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
    "clear-plesk-git-context.sh",
    "prepare-plesk-build.mjs",
    "verify-plesk-build.mjs",
  ];
  for (const file of deploymentFiles) {
    const source = readFileSync(path.join(__dirname, file), "utf8");
    assert.doesNotMatch(
      source,
      /(?:^|[\s;&|])git(?:\s|$)/m,
      `${file} must not invoke Git`,
    );
    assert.doesNotMatch(
      source,
      /\.git\b/,
      `${file} must not require a .git directory`,
    );
  }

  const hook = readFileSync(
    path.join(__dirname, "plesk-git-deploy.sh"),
    "utf8",
  );
  assert.match(hook, /run deploy:plesk/);
  assert.match(hook, /mkdir -p dist\/tmp/);
  assert.match(hook, /touch dist\/tmp\/restart\.txt/);
  assert.match(hook, /clear_plesk_git_context/);
  for (const file of ["plesk-deploy.sh", "plesk-git-deploy.sh"]) {
    const source = readFileSync(path.join(__dirname, file), "utf8");
    assert.match(source, /clear_plesk_git_context/);
  }

  const contextCleaner = readFileSync(
    path.join(__dirname, "clear-plesk-git-context.sh"),
    "utf8",
  );
  for (const variable of [
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_INDEX_FILE",
    "GIT_COMMON_DIR",
    "GIT_OBJECT_DIRECTORY",
  ]) {
    assert.match(
      contextCleaner,
      new RegExp(`unset[\\s\\S]{0,600}\\b${variable}\\b`),
      `the Plesk build chain must clear inherited ${variable}`,
    );
  }
});

test("Plesk hooks run from an external cwd, clear Git context, and propagate failures", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const tempRoot = mkdtempSync(
    path.join(os.tmpdir(), "sendflow-plesk-hook-test-"),
  );
  const fakeBin = path.join(tempRoot, "bin");
  const fakeCorepack = path.join(fakeBin, "corepack");
  const outsideWorkingDirectory = path.join(tempRoot, "outside");
  const hooks = [
    {
      file: "plesk-git-deploy.sh",
      appUrl: "https://sendflow.africa",
    },
    {
      file: "plesk-deploy.sh",
      appUrl: "https://sendflow.africa",
    },
  ];

  try {
    mkdirSync(fakeBin, { recursive: true });
    mkdirSync(outsideWorkingDirectory);
    writeFileSync(
      fakeCorepack,
      `#!/bin/sh
set -eu
if [ -n "\${GIT_DIR+x}\${GIT_WORK_TREE+x}\${GIT_INDEX_FILE+x}\${GIT_COMMON_DIR+x}\${GIT_OBJECT_DIRECTORY+x}" ]; then
  echo "Git context leaked to Corepack" >&2
  exit 99
fi
if [ "\${1:-}" = "pnpm" ] && [ "\${2:-}" = "--version" ]; then
  echo "10.26.1"
  exit 0
fi
printf 'FAKE_COREPACK_CWD=%s\\n' "$PWD"
echo "fatal: this operation must be run in a work tree" >&2
exit 42
`,
      { mode: 0o755 },
    );
    chmodSync(fakeCorepack, 0o755);

    for (const hook of hooks) {
      const result = spawnSync(
        "bash",
        [path.join(repoRoot, "scripts", hook.file)],
        {
          cwd: outsideWorkingDirectory,
          encoding: "utf8",
          env: {
            ...process.env,
            APP_URL: hook.appUrl,
            BASE_PATH: "/",
            GIT_DIR: path.join(tempRoot, "internal-bare.git"),
            GIT_WORK_TREE: path.join(tempRoot, "worktree"),
            GIT_INDEX_FILE: path.join(tempRoot, "internal-index"),
            GIT_COMMON_DIR: path.join(tempRoot, "internal-bare.git"),
            GIT_OBJECT_DIRECTORY: path.join(
              tempRoot,
              "internal-bare.git",
              "objects",
            ),
            PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
          },
        },
      );

      assert.equal(
        result.status,
        42,
        `${hook.file} must return the child failure status\n${result.stdout}\n${result.stderr}`,
      );
      assert.match(
        result.stderr,
        /fatal: this operation must be run in a work tree/,
      );
      assert.doesNotMatch(result.stderr, /Git context leaked to Corepack/);
      assert.match(
        result.stdout,
        new RegExp(
          `FAKE_COREPACK_CWD=${repoRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        ),
      );
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
