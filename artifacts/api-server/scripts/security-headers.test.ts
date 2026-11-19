import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { test } from "node:test";
import { requestErrorHandler } from "../src/middlewares/requestErrorHandler";
import { securityHeaders } from "../src/middlewares/securityHeaders";

test("public security headers are present on success, redirects, 404, and 500 responses", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  const app = express();
  app.use(securityHeaders);
  app.use(pinoHttp({ logger: pino({ level: "silent" }) }));
  app.get("/ok", (_req, res) => res.status(200).send("ok"));
  app.get("/redirect", (_req, res) => res.redirect(302, "/ok"));
  app.get("/failure", (_req, _res, next) => next(new Error("test failure")));
  app.use((_req, res) => res.status(404).json({ error: "not found" }));
  app.use(requestErrorHandler);

  const server = createServer(app);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;

    for (const [path, expectedStatus] of [
      ["/ok", 200],
      ["/redirect", 302],
      ["/missing", 404],
      ["/failure", 500],
    ] as const) {
      const response = await fetch(`${origin}${path}`, { redirect: "manual" });
      assert.equal(response.status, expectedStatus, path);
      assert.equal(
        response.headers.get("strict-transport-security"),
        "max-age=31536000",
        path,
      );
      assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
      assert.equal(response.headers.get("x-frame-options"), "DENY", path);
      assert.equal(
        response.headers.get("referrer-policy"),
        "strict-origin-when-cross-origin",
        path,
      );
      assert.equal(
        response.headers.get("permissions-policy"),
        "camera=(), microphone=(), geolocation=()",
        path,
      );
      const csp = response.headers.get("content-security-policy") ?? "";
      assert.ok(csp.includes("frame-ancestors 'none'"), path);
      assert.ok(csp.includes("object-src 'none'"), path);
      const scriptDirectives = csp
        .split(";")
        .map((directive) => directive.trim())
        .filter((directive) => directive.startsWith("script-src"));
      assert.ok(scriptDirectives.length > 0, `${path} must have script restrictions`);
      assert.ok(
        scriptDirectives.every(
          (directive) => !/'unsafe-inline'|'unsafe-eval'/.test(directive),
        ),
        `${path} must not allow inline or eval scripts`,
      );
      assert.ok(
        !response.headers.get("strict-transport-security")?.includes("includeSubDomains"),
        `${path} must not opt all subdomains into HSTS before they are verified`,
      );
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      if (!server.listening) {
        resolve();
        return;
      }
      server.close((error) => (error ? reject(error) : resolve()));
    });
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});
