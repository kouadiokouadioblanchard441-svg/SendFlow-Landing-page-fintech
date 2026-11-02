"use strict";

const fs = require("node:fs");
const path = require("node:path");

function resolvePleskDeploymentRoot(repoRoot, env = process.env) {
  const sourceRoot = fs.realpathSync(path.resolve(repoRoot));
  const configuredRoot = env.PLESK_DEPLOYMENT_ROOT?.trim();
  const targetRequired = env.PLESK_REQUIRE_DEPLOYMENT_ROOT === "1";
  let candidateRoot;

  if (configuredRoot) {
    candidateRoot = path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(sourceRoot, configuredRoot);
  } else if (targetRequired) {
    throw new Error(
      "PLESK_DEPLOYMENT_ROOT is required for the Plesk production action; set it to the existing sendflow.africa target directory. The script will not infer it from Application Root.",
    );
  } else {
    candidateRoot = sourceRoot;
  }

  let deploymentRoot;
  try {
    deploymentRoot = fs.realpathSync(candidateRoot);
  } catch {
    throw new Error(
      `Plesk deployment target does not exist: ${candidateRoot}. Create/select the existing deployment directory in Plesk; the build will not guess or create a target.`,
    );
  }

  const details = fs.statSync(deploymentRoot);
  if (!details.isDirectory()) {
    throw new Error(
      `Plesk deployment target is not a directory: ${deploymentRoot}`,
    );
  }
  if (deploymentRoot === path.parse(deploymentRoot).root) {
    throw new Error("Refusing to use the filesystem root as a Plesk target.");
  }
  if (
    targetRequired &&
    path.basename(deploymentRoot) !== "sendflow.africa"
  ) {
    throw new Error(
      `The configured production target must be the existing sendflow.africa directory, not ${deploymentRoot}.`,
    );
  }

  try {
    fs.accessSync(deploymentRoot, fs.constants.W_OK);
  } catch {
    throw new Error(
      `Plesk deployment target is not writable by the Git deployment user: ${deploymentRoot}`,
    );
  }

  return deploymentRoot;
}

module.exports = { resolvePleskDeploymentRoot };

if (require.main === module) {
  try {
    const repoRoot = process.argv[2] ?? process.cwd();
    process.stdout.write(`${resolvePleskDeploymentRoot(repoRoot)}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
