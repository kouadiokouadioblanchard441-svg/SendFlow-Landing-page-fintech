#!/usr/bin/env node
"use strict";

// Vite 7 and @vitejs/plugin-react 5 require ^20.19.0 || >=22.12.0.
// ESLint 10 also runs in the deploy build and requires Node 22.13+ in that line.
// Keep legacy hosting compatibility separate from the Node 24 CI baseline.
const BUILD_NODE_RANGE = "Node.js 20.19+, 22.13+, or an even-numbered LTS line from 24+";

function isSupportedBuildNode(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [, major, minor] = match.map(Number);
  return (
    (major === 20 && minor >= 19) ||
    (major === 22 && minor >= 13) ||
    (major >= 24 && major % 2 === 0)
  );
}

function checkDeployNode(version, executable) {
  if (!isSupportedBuildNode(version)) {
    console.error(
      `Unsupported Node.js ${version}. The deployment build requires Node.js 20.19+, 22.13+, or an even-numbered LTS line 24+.`,
    );
    return 1;
  }
  console.log(`Deployment build: Node.js ${version} (${executable}).`);
  if (Number(version.split(".")[0]) !== 24) {
    console.warn(
      "Compatibility mode: Node.js 24 is the CI baseline. Other accepted versions are not covered by the current CI build/runtime checks. Prefer a maintained LTS release supplied by your host.",
    );
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = checkDeployNode(process.versions.node, process.execPath);
}

module.exports = { BUILD_NODE_RANGE, isSupportedBuildNode, checkDeployNode };
