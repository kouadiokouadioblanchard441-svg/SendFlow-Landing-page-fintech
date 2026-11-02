"use strict";

const assert = require("node:assert/strict");
const {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const helperPath = path.join(__dirname, "plesk-pnpm.sh");

function createFakeCommand(directory, name, contents) {
  const commandPath = path.join(directory, name);
  writeFileSync(commandPath, `#!/bin/sh\nset -eu\n${contents}\n`);
  chmodSync(commandPath, 0o755);
  return commandPath;
}

function runResolver(toolDirectory) {
  const bashExecutable = (process.env.PATH ?? "")
    .split(path.delimiter)
    .map((directory) => path.join(directory, "bash"))
    .find(existsSync);
  assert.ok(bashExecutable, "bash must be available to test the shell helper");

  return spawnSync(
    bashExecutable,
    [
      "-c",
      'set -e; source "$1"; resolve_plesk_pnpm "$2"; printf "PLESK_PNPM_SOURCE=%s\\nPLESK_PNPM_COMMAND=%s\\n" "${PLESK_PNPM_SOURCE:-unknown}" "${PLESK_PNPM[*]}"',
      "plesk-pnpm-test",
      helperPath,
      repoRoot,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: toolDirectory,
      },
    },
  );
}

function withToolDirectory(callback) {
  const temporaryRoot = mkdtempSync(
    path.join(os.tmpdir(), "sendflow-plesk-pnpm-test-"),
  );
  const toolDirectory = path.join(temporaryRoot, "bin");
  mkdirSync(toolDirectory);
  symlinkSync(process.execPath, path.join(toolDirectory, "node"));
  try {
    callback(toolDirectory, temporaryRoot);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

test("Corepack receives the exact pnpm version from packageManager", () => {
  withToolDirectory((toolDirectory) => {
    createFakeCommand(
      toolDirectory,
      "corepack",
      'test "$1" = "pnpm@10.26.1"; test "$2" = "--version"; echo "10.26.1"',
    );
    createFakeCommand(
      toolDirectory,
      "npx",
      'echo "npx must not be used when Corepack works" >&2; exit 91',
    );
    createFakeCommand(
      toolDirectory,
      "pnpm",
      'echo "global pnpm must not be used" >&2; exit 92',
    );

    const result = runResolver(toolDirectory);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Using pinned pnpm 10\.26\.1 via Corepack/);
    assert.match(result.stdout, /PLESK_PNPM_COMMAND=corepack pnpm@10\.26\.1/);
    assert.doesNotMatch(result.stderr, /global pnpm|npx must not be used/);
  });
});

test("npx bootstraps the exact pin when Corepack is absent", () => {
  withToolDirectory((toolDirectory, temporaryRoot) => {
    const globalPnpmCalled = path.join(temporaryRoot, "global-pnpm-called");
    createFakeCommand(
      toolDirectory,
      "npx",
      `test "$1" = "--yes"; test "$2" = "pnpm@10.26.1"; test "$3" = "--version"; echo "10.26.1"`,
    );
    createFakeCommand(
      toolDirectory,
      "pnpm",
      `touch "${globalPnpmCalled}"; echo "12.15.0"`,
    );

    const result = runResolver(toolDirectory);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Using pinned pnpm 10\.26\.1 via npx/);
    assert.match(result.stdout, /PLESK_PNPM_COMMAND=npx --yes pnpm@10\.26\.1/);
    assert.equal(existsSync(globalPnpmCalled), false);
  });
});

test("refuses the Plesk global pnpm 12 instead of bypassing the pin", () => {
  withToolDirectory((toolDirectory) => {
    createFakeCommand(toolDirectory, "pnpm", 'echo "12.15.0"');

    const result = runResolver(toolDirectory);
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /requires pnpm 10\.26\.1; Plesk provided pnpm 12\.15\.0/,
    );
    assert.match(result.stderr, /Refusing to install with the incompatible version/);
  });
});

test("accepts a global pnpm only when it exactly matches the pin", () => {
  withToolDirectory((toolDirectory) => {
    createFakeCommand(toolDirectory, "pnpm", 'echo "10.26.1"');

    const result = runResolver(toolDirectory);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Using pinned pnpm 10\.26\.1 from PATH/);
    assert.match(result.stdout, /PLESK_PNPM_COMMAND=pnpm/);
  });
});
