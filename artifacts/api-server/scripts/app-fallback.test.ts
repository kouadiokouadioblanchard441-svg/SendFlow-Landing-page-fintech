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
  await mkdir(path.join(publicRoot, "features"), { recursive: true });
  await writeFile(path.join(publicRoot, "index.html"), "<html>SendFlow SPA</html>");
  await writeFile(
    path.join(publicRoot, "features", "index.html"),
    "<html>SendFlow features</html>",
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
    assert.equal(await featureResponse.text(), "<html>SendFlow features</html>");
    assert.equal(
      await readFile(path.join(publicRoot, "index.html"), "utf8"),
      "<html>SendFlow SPA</html>",
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
