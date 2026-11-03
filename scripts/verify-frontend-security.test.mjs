import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanFrontendBuild } from "./verify-frontend-security.mjs";

async function withBuild(files, callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sendflow-front-security-"));
  try {
    for (const [relativePath, contents] of Object.entries(files)) {
      const filePath = path.join(directory, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, contents);
    }
    await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("frontend scanner permits public site configuration and public reCAPTCHA site keys", async () => {
  await withBuild({
    "index.html": '<html><meta name="site" content="https://sendflow.africa"></html>',
    "assets/app.js": 'const siteKey="public-site-key";',
  }, async (directory) => {
    const result = await scanFrontendBuild(directory);
    assert.equal(result.filesScanned, 2);
  });
});

test("frontend scanner rejects server-only environment names without printing values", async () => {
  await withBuild({
    "assets/app.js": 'const name="SESSION_SECRET"; const value="do-not-print";',
  }, async (directory) => {
    await assert.rejects(scanFrontendBuild(directory), (error) => {
      assert.match(error.message, /server-only environment variable/);
      assert.doesNotMatch(error.message, /do-not-print/);
      return true;
    });
  });
});

test("frontend scanner rejects credential formats and private key material", async () => {
  for (const content of [
    'const url="postgresql://user:pass@db.example/db";',
    '-----BEGIN PRIVATE KEY----- synthetic-data',
    'const key="re_abcdefghijklmnopqrstuvwxyz123456";',
  ]) {
    await withBuild({ "assets/app.js": content }, async (directory) => {
      await assert.rejects(scanFrontendBuild(directory));
    });
  }
});

test("frontend scanner rejects source maps and sourceMappingURL references", async () => {
  await withBuild({ "assets/app.js": "const app=true;\n//# sourceMappingURL=app.js.map" }, async (directory) => {
    await assert.rejects(scanFrontendBuild(directory), /source map/i);
  });
  await withBuild({ "assets/app.js.map": "{}" }, async (directory) => {
    await assert.rejects(scanFrontendBuild(directory), /source map/i);
  });
});
