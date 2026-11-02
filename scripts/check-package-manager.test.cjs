const assert = require("node:assert/strict");
const {
  chmodSync,
  existsSync,
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
    validatePackageManagerUserAgent("pnpm/12.15.0 npm/? node/v22.23.4").message,
    /requires pnpm 10\.26\.1.*current installer is pnpm 12\.15\.0/,
  );
});

test("Plesk build and packaging use the sole active deployment script", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const packageJson = JSON.parse(
    readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  const deploymentGuide = readFileSync(
    path.join(repoRoot, "PLESK_DEPLOYMENT.md"),
    "utf8",
  );
  const deploymentSkill = readFileSync(
    path.join(repoRoot, ".agents/skills/plesk-deployment-engineer/SKILL.md"),
    "utf8",
  );
  const deploymentWorkflow = readFileSync(
    path.join(repoRoot, ".github/workflows/validate-plesk-build.yml"),
    "utf8",
  );
  const gitignore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
  const remoteDeployment = readFileSync(
    path.join(__dirname, "plesk-remote-deploy.sh"),
    "utf8",
  );

  assert.equal(
    packageJson.scripts["deploy:plesk"],
    "bash ./scripts/plesk-deploy.sh",
  );
  assert.match(
    packageJson.scripts["package:plesk"],
    /^bash \.\/scripts\/plesk-deploy\.sh && node \.\/scripts\/package-plesk-release\.mjs$/,
  );
  assert.equal(existsSync(path.join(__dirname, "plesk-git-deploy.sh")), false);
  assert.match(deploymentGuide, /pnpm run deploy:plesk/);
  assert.match(deploymentSkill, /scripts\/plesk-deploy\.sh/);
  for (const source of [deploymentGuide, deploymentSkill]) {
    assert.doesNotMatch(source, /scripts\/plesk-git-deploy\.sh/);
  }
  assert.match(deploymentWorkflow, /deploy-plesk:/);
  assert.match(deploymentWorkflow, /secrets\.PLESK_SSH_PRIVATE_KEY/);
  assert.match(deploymentWorkflow, /vars\.PLESK_DEPLOY_ROOT/);
  assert.match(
    deploymentWorkflow,
    /PLESK_DEPLOY_ROOT: \$\{\{ vars\.PLESK_DEPLOY_ROOT \}\}/,
  );
  assert.doesNotMatch(
    deploymentWorkflow,
    /PLESK_DEPLOY_ROOT:\s*\$\{\{\s*vars\.PLESK_DEPLOY_ROOT\s*\|\|/,
  );
  assert.match(deploymentWorkflow, /PLESK_DEPLOY_ROOT PLESK_SSH_PRIVATE_KEY/);
  assert.match(deploymentWorkflow, /scripts\/plesk-remote-deploy\.sh/);
  assert.match(deploymentWorkflow, /pnpm run package:plesk/);
  assert.match(deploymentWorkflow, /actions\/upload-artifact@v4/);
  assert.match(deploymentWorkflow, /actions\/download-artifact@v4/);
  assert.match(deploymentWorkflow, /scp "\$\{scp_options\[@\]\}"/);
  assert.match(deploymentWorkflow, /PLESK_RELEASE_DEPLOYED/);
  assert.match(gitignore, /^dist$/m);
  assert.match(gitignore, /CI packages and delivers dist\/ to Plesk/);
  assert.doesNotMatch(remoteDeployment, /(?:^|[\s;&|])git(?:\s|$)/m);
});

test("Plesk deploy chain does not run Git or require a worktree", () => {
  const deploymentFiles = [
    "plesk-deploy.sh",
    "plesk-pnpm.sh",
    "clear-plesk-git-context.sh",
    "prepare-plesk-build.mjs",
    "verify-plesk-build.mjs",
    "resolve-plesk-deployment-root.cjs",
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

  const deployScript = readFileSync(
    path.join(__dirname, "plesk-deploy.sh"),
    "utf8",
  );
  assert.match(deployScript, /source "\$ROOT_DIR\/scripts\/plesk-pnpm\.sh"/);
  assert.match(deployScript, /resolve_plesk_pnpm "\$ROOT_DIR"/);
  assert.match(deployScript, /resolve-plesk-deployment-root\.cjs "\$ROOT_DIR"/);
  assert.match(deployScript, /export PLESK_DEPLOYMENT_ROOT PLESK_DIST_DIR/);
  assert.match(deployScript, /PLESK_KEEP_PREVIOUS_DIST=1/);
  assert.match(
    deployScript,
    /"\$\{PLESK_PNPM\[@\]\}" install --frozen-lockfile --prod=false/,
  );
  assert.match(deployScript, /"\$\{PLESK_PNPM\[@\]\}" run build/);
  assert.match(deployScript, /PLESK_BUILD_HOOK_STARTED/);
  assert.match(deployScript, /PLESK_BUILD_COMPLETE/);
  for (const output of [
    "$PLESK_DIST_DIR/index.cjs",
    "$PLESK_DIST_DIR/.node-version",
    "$PLESK_DIST_DIR/pnpm-workspace.yaml",
    "$PLESK_DIST_DIR/build-info.json",
    "$PLESK_DIST_DIR/public/index.html",
    "$PLESK_DIST_DIR/public/.htaccess",
  ]) {
    assert.ok(
      deployScript.includes(`"${output}"`),
      `the Plesk deploy action must verify ${output} before Passenger restart`,
    );
  }
  assert.match(deployScript, /run build/);
  assert.match(deployScript, /mkdir -p "\$PLESK_DIST_DIR\/tmp"/);
  assert.match(deployScript, /touch "\$PLESK_DIST_DIR\/tmp\/restart\.txt"/);
  assert.match(deployScript, /clear_plesk_git_context/);

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

test("Plesk runtime paths match the Passenger startup and document root", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const prepareBuild = readFileSync(
    path.join(__dirname, "prepare-plesk-build.mjs"),
    "utf8",
  );
  const verifyBuild = readFileSync(
    path.join(__dirname, "verify-plesk-build.mjs"),
    "utf8",
  );
  const deploymentGuide = readFileSync(
    path.join(repoRoot, "PLESK_DEPLOYMENT.md"),
    "utf8",
  );

  assert.match(prepareBuild, /scripts:\s*\{\s*start:\s*"node \.\/index\.cjs"/);
  assert.match(prepareBuild, /path\.join\(outputDist, "\.node-version"\)/);
  assert.match(
    prepareBuild,
    /path\.join\(outputDist, "pnpm-workspace\.yaml"\)/,
  );
  assert.match(prepareBuild, /process\.env\.PLESK_DIST_DIR/);
  assert.match(prepareBuild, /PLESK_KEEP_PREVIOUS_DIST/);
  assert.match(verifyBuild, /const PLESK_STARTUP_FILE = "index\.cjs"/);
  assert.match(verifyBuild, /verifyNodeVersionSelection/);
  assert.match(verifyBuild, /verifyRuntimeWorkspaceIsolation/);
  assert.match(verifyBuild, /"public\/index\.html"/);
  assert.match(verifyBuild, /"index\.cjs"/);
  assert.equal(
    readFileSync(path.join(repoRoot, ".node-version"), "utf8").trim(),
    "22",
  );
  assert.match(
    deploymentGuide,
    /Cible du déploiement Git.*`\/sendflow\.africa`/,
  );
  assert.match(deploymentGuide, /Application Root.*`\/sendflow\.africa\/dist`/);
  assert.match(deploymentGuide, /Startup File.*`index\.cjs`/);
  assert.match(
    deploymentGuide,
    /Document Root.*`\/sendflow\.africa\/dist\/public`/,
  );
  assert.match(deploymentGuide, /PLESK_DEPLOY_ROOT.*Obligatoire/);
  assert.match(
    deploymentGuide,
    /Le libellé `\/sendflow\.africa` affiché par le panneau est un chemin relatif/,
  );
  assert.match(deploymentGuide, /PLESK_SSH_PRIVATE_KEY/);
  assert.match(deploymentGuide, /job `deploy-plesk`/);
});

test("Plesk deploy script clears fake Git context and propagates child failures", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const tempRoot = mkdtempSync(
    path.join(os.tmpdir(), "sendflow-plesk-hook-test-"),
  );
  const fakeBin = path.join(tempRoot, "bin");
  const fakeCorepack = path.join(fakeBin, "corepack");
  const outsideWorkingDirectory = path.join(tempRoot, "outside");
  const hooks = [
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
    if [ "\${1:-}" = "pnpm@10.26.1" ] && [ "\${2:-}" = "--version" ]; then
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
            PLESK_MEDIA_DIR: path.join(tempRoot, "sendflow-media"),
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
