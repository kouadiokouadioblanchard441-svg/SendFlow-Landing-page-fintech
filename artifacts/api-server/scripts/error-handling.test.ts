import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { test } from "node:test";
import {
  sanitizeLogText,
  sanitizeRequestUrl,
  serializeSafeError,
} from "../src/lib/logger";
import { requestErrorHandler } from "../src/middlewares/requestErrorHandler";

test("request paths redact one- and two-part private panel URLs", () => {
  assert.equal(sanitizeRequestUrl("/panel/private-token"), "/panel/[redacted]");
  assert.equal(
    sanitizeRequestUrl("/panel/private-token/admin%40sendflow.africa"),
    "/panel/[redacted]",
  );
  assert.equal(
    sanitizeRequestUrl("/api/admin/auth/panel/verify?token=private-token"),
    "/api/admin/auth/panel/[redacted]",
  );
  assert.equal(
    sanitizeRequestUrl("/api/newsletter/unsubscribe/private-token?x=1"),
    "/api/newsletter/unsubscribe/[redacted]",
  );
});

test("error serialization keeps type and stack while redacting credentials", () => {
  const error = new Error(
    "Request failed: authorization=Bearer bearer-secret SESSION_SECRET=session-secret " +
      "NEON_DATABASE_URL=postgresql://user:db-secret@db.example/sendflow",
  );
  const serialized = serializeSafeError(error);
  const output = JSON.stringify(serialized);

  assert.equal(serialized.type, "Error");
  assert.match(serialized.stack ?? "", /error-handling\.test\.ts/);
  for (const secret of [
    "bearer-secret",
    "session-secret",
    "db-secret",
    "user:db-secret",
  ]) {
    assert.ok(!output.includes(secret), `log leaked ${secret}`);
  }
  assert.match(output, /\[REDACTED\]/);
  assert.equal(
    sanitizeLogText("PRIVATE_KEY=abc"),
    "PRIVATE_KEY=[REDACTED]",
  );
});

test("uncaught request errors return generic 500 responses and log safely", async () => {
  const records: Record<string, unknown>[] = [];
  const testLogger = pino(
    {
      serializers: {
        err: serializeSafeError,
        req(req: { id?: string; method?: string; url?: string }) {
          return {
            id: req.id,
            method: req.method,
            url: sanitizeRequestUrl(req.url),
          };
        },
      },
    },
    {
      write(line) {
        records.push(JSON.parse(line) as Record<string, unknown>);
      },
    },
  );
  const app = express();
  app.use(
    pinoHttp({
      logger: testLogger,
      serializers: {
        err: serializeSafeError,
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: sanitizeRequestUrl(req.url),
          };
        },
      },
    }),
  );
  app.get("/api/failure", (_req, _res, next) => {
    next(
      new Error(
        "authorization=Bearer api-secret postgresql://user:db-secret@db.example/sendflow",
      ),
    );
  });
  app.get("/securite/failure", (_req, _res, next) => {
    next(new Error("SESSION_SECRET=private-session-secret"));
  });
  app.use(requestErrorHandler);

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;

    const apiResponse = await fetch(`${origin}/api/failure`);
    assert.equal(apiResponse.status, 500);
    assert.deepEqual(await apiResponse.json(), {
      error: "Internal server error",
    });

    const pageResponse = await fetch(`${origin}/securite/failure`);
    assert.equal(pageResponse.status, 500);
    assert.equal(await pageResponse.text(), "Internal server error");

    const output = JSON.stringify(records);
    for (const secret of [
      "api-secret",
      "db-secret",
      "user:db-secret",
      "private-session-secret",
    ]) {
      assert.ok(!output.includes(secret), `logs leaked ${secret}`);
    }
    assert.match(output, /Unhandled request error/);
    assert.match(output, /stack/);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
