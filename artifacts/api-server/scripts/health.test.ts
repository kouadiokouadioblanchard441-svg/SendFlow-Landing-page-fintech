import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import express from "express";
import { test } from "node:test";
import healthRouter from "../src/routes/health";

async function requestHealth(buildInfo?: { buildId: string }) {
  const originalCwd = process.cwd();
  const workingDirectory = await mkdtemp(path.join(tmpdir(), "sendflow-health-"));
  const app = express().use(healthRouter);
  const server = createServer(app);

  try {
    if (buildInfo) {
      await writeFile(
        path.join(workingDirectory, "build-info.json"),
        JSON.stringify(buildInfo),
      );
    }
    process.chdir(workingDirectory);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    process.chdir(originalCwd);
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

test("health returns only the status and packaged build ID", async () => {
  const buildId = "1b54389f-3d13-47e5-bf8e-594be2bf883a";
  const response = await requestHealth({ buildId });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok", buildId });
});

test("health explicitly reports a missing build ID outside a packaged build", async () => {
  const response = await requestHealth();
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok", buildId: null });
});
