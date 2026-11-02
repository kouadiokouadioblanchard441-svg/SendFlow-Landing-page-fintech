import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

test("API misses stay JSON while page routes use the public HTML fallback", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "sendflow-app-fallback-"));
  const publicRoot = path.join(temporaryRoot, "public");
  const originalWebDistDir = process.env.WEB_DIST_DIR;
  const rootHtml =
    '<html><style nonce="__SEND_FLOW_CSP_NONCE__">body{color:black}</style><script type="module" nonce="__SEND_FLOW_CSP_NONCE__">app</script></html>';
  await mkdir(path.join(publicRoot, "features"), { recursive: true });
  await writeFile(path.join(publicRoot, "index.html"), rootHtml);
  await writeFile(
    path.join(publicRoot, "features", "index.html"),
    '<html><script type="module" crossorigin src="/assets/features.js"></script></html>',
  );
  process.env.WEB_DIST_DIR = publicRoot;
  process.env.NEON_DATABASE_URL =
    "postgresql://offline-test:offline-test@127.0.0.1:1/sendflow";

  let server: ReturnType<typeof createServer> | undefined;
  try {
    const { default: app } = await import("../src/app");
    server = createServer(app);
    await new Promise<void>((resolve, reject) => {
      server?.once("error", reject);
      server?.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;

    for (const pathName of ["/api", "/api/unknown-route"]) {
      const response = await fetch(`${origin}${pathName}`);
      assert.equal(response.status, 404, pathName);
      assert.match(response.headers.get("content-type") ?? "", /application\/json/, pathName);
      assert.deepEqual(await response.json(), { error: "API route not found" });
    }

    const featureResponse = await fetch(`${origin}/features`);
    assert.equal(featureResponse.status, 200);
    assert.match(featureResponse.headers.get("content-type") ?? "", /text\/html/);
    const featureHtml = await featureResponse.text();
    const featureNonce = featureHtml.match(/nonce="([^"]+)"/)?.[1];
    assert.ok(featureNonce);
    assert.match(
      featureHtml,
      new RegExp(`<script type="module" crossorigin src="/assets/features\\.js" nonce="${featureNonce}"></script>`),
    );
    assert.ok(!featureHtml.includes("__SEND_FLOW_CSP_NONCE__"));
    assert.equal(featureResponse.headers.get("cache-control"), "no-store");

    const adminResponse = await fetch(`${origin}/panel`);
    assert.equal(adminResponse.status, 200);
    const adminHtml = await adminResponse.text();
    const adminNonce = adminHtml.match(/nonce="([^"]+)"/)?.[1];
    assert.ok(adminNonce);
    assert.notEqual(adminNonce, featureNonce, "each HTML response needs a fresh nonce");
    const policy = adminResponse.headers.get("content-security-policy") ?? "";
    assert.match(policy, /script-src[^;]*'nonce-[^']+'/);
    assert.match(policy, /script-src[^;]*'strict-dynamic'/);
    assert.match(policy, /script-src-attr 'none'/);
    assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
    assert.match(policy, /style-src[^;]*'unsafe-inline'/);
    assert.match(policy, /https:\/\/fonts\.googleapis\.com/);
    assert.match(policy, /https:\/\/fonts\.gstatic\.com/);
    assert.match(policy, /style-src-elem[^;]*https:\/\/fonts\.cdnfonts\.com/);
    assert.equal(
      await readFile(path.join(publicRoot, "index.html"), "utf8"),
      rootHtml,
    );
  } finally {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (originalWebDistDir === undefined) delete process.env.WEB_DIST_DIR;
    else process.env.WEB_DIST_DIR = originalWebDistDir;
    delete process.env.NEON_DATABASE_URL;
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
