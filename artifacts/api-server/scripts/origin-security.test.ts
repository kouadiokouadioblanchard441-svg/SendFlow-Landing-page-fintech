import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import { getPublicSiteUrl } from "../src/lib/publicSiteUrl.ts";

const previousNodeEnv = process.env.NODE_ENV;
const previousDatabaseUrl = process.env.NEON_DATABASE_URL;
const previousPublicSiteUrl = process.env.PUBLIC_SITE_URL;
const previousAppUrl = process.env.APP_URL;
const previousPublicUrl = process.env.PUBLIC_URL;
const previousVitePublicSiteUrl = process.env.VITE_PUBLIC_SITE_URL;
const previousSessionSecret = process.env.SESSION_SECRET;
process.env.NODE_ENV = "production";
delete process.env.PUBLIC_SITE_URL;
process.env.APP_URL = "https://sendflow.example";
process.env.NEON_DATABASE_URL ??=
  "postgresql://offline-test:offline-test@127.0.0.1:1/sendflow";
process.env.SESSION_SECRET ??= "offline-test-session-secret";

const { createRateLimiter, createSharedRateLimiter, isAllowedMutationOrigin } =
  await import("../src/middlewares/security.ts");
const {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookie,
  requireAdmin,
  setAdminSessionCookie,
} =
  await import("../src/middlewares/adminAuth.ts");
const { db, pool } = await import("@workspace/db");
const { default: adminAuthRouter } =
  await import("../src/routes/adminAuth.ts");
const { default: landingRouter } =
  await import("../src/routes/landing.ts");

test("unsafe admin requests require the configured public origin", () => {
  assert.equal(isAllowedMutationOrigin(undefined), false);
  assert.equal(isAllowedMutationOrigin(""), false);
  assert.equal(isAllowedMutationOrigin("null"), false);
  assert.equal(isAllowedMutationOrigin("https://attacker.example"), false);
  assert.equal(isAllowedMutationOrigin("https://sendflow.example"), true);
});

test("VITE_PUBLIC_SITE_URL is the fallback returned by the public-site URL helper", () => {
  delete process.env.PUBLIC_SITE_URL;
  delete process.env.APP_URL;
  delete process.env.PUBLIC_URL;
  process.env.VITE_PUBLIC_SITE_URL = "https://sendflow.example";
  assert.equal(getPublicSiteUrl(), "https://sendflow.example");
});

test("production admin session cookies stay Secure when cleared", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const cookies: string[] = [];
  const response = {
    setHeader(_name: string, value: string) {
      cookies.push(value);
      return this;
    },
  } as never;

  try {
    setAdminSessionCookie(response, "a".repeat(43));
    clearAdminSessionCookie(response);

    assert.equal(cookies.length, 2);
    assert.match(cookies[0], new RegExp(`^${ADMIN_SESSION_COOKIE}=`));
    assert.match(cookies[0], /; Path=\//);
    assert.match(cookies[0], /HttpOnly/);
    assert.match(cookies[0], /SameSite=Lax/);
    assert.match(cookies[0], /Max-Age=604800/);
    assert.match(cookies[0], /; Secure(?:;|$)/);
    assert.match(cookies[1], new RegExp(`^${ADMIN_SESSION_COOKIE}=`));
    assert.match(cookies[1], /; Path=\//);
    assert.match(cookies[1], /Max-Age=0/);
    assert.match(cookies[1], /HttpOnly/);
    assert.match(cookies[1], /SameSite=Lax/);
    assert.match(cookies[1], /; Secure(?:;|$)/);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("every protected admin route rejects requests without a session", async () => {
  const protectedRoutes = [
    ["GET", "/admin/newsletter"],
    ["PATCH", "/admin/newsletter/subscribers/1"],
    ["DELETE", "/admin/newsletter/subscribers/1"],
    ["POST", "/admin/newsletter/campaigns"],
    ["PATCH", "/admin/newsletter/campaigns/1"],
    ["DELETE", "/admin/newsletter/campaigns/1"],
    ["POST", "/admin/newsletter/campaigns/1/send"],
    ["GET", "/admin/landing"],
    ["POST", "/admin/landing/about-carousel/initialize"],
    ["PUT", "/admin/landing/founder"],
    ["PUT", "/admin/landing/settings"],
    ["POST", "/admin/landing/media/upload"],
    ["PUT", "/admin/landing/operator-fees"],
    ["PATCH", "/admin/landing/sections/1"],
    ["POST", "/admin/landing/sections"],
    ["DELETE", "/admin/landing/sections/1"],
    ["PUT", "/admin/landing/countries/1/operators"],
    ["PATCH", "/admin/landing/content/1"],
    ["POST", "/admin/landing/content"],
    ["DELETE", "/admin/landing/faqs/1"],
    ["PATCH", "/admin/landing/media/1"],
    ["POST", "/admin/landing/sections"],
    ["DELETE", "/admin/landing/legalPages/1"],
  ] as const;
  const app = express()
    .use(adminAuthRouter)
    .use(landingRouter);
  const server = createServer(app);

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;

    for (const [method, path] of protectedRoutes) {
      const response = await fetch(`${origin}${path}`, {
        method,
        headers: {
          ...(method === "GET" ? {} : { Origin: "https://sendflow.example" }),
        },
      });
      assert.equal(response.status, 401, `${method} ${path}`);
      assert.deepEqual(await response.json(), {
        error: "Authentication required",
      }, `${method} ${path}`);
    }

    const currentUserResponse = await fetch(`${origin}/admin/auth/me`);
    assert.equal(currentUserResponse.status, 401);
    assert.deepEqual(await currentUserResponse.json(), {
      error: "Authentication required",
    });

    for (const path of [
      "/admin/auth/login",
      "/admin/auth/logout",
    ]) {
      const response = await fetch(`${origin}${path}`, {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      assert.equal(response.status, 403, `POST ${path}`);
      assert.deepEqual(await response.json(), {
        error: "Origin not allowed",
      }, `POST ${path}`);
    }
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    const retiredPanelLookup = await fetch(`${origin}/admin/auth/panel/verify`, {
      method: "POST",
      headers: {
        Origin: "https://sendflow.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: "not-in-url", email: "admin@sendflow.example" }),
    });
    assert.equal(retiredPanelLookup.status, 404);
  }
});

test("admin middleware accepts an active user with a valid session token", async () => {
  const database = db as unknown as {
    select: (...args: unknown[]) => unknown;
  };
  const originalSelect = Object.getOwnPropertyDescriptor(database, "select");
  const user = { id: 12, email: "admin@sendflow.example", isActive: true };
  database.select = () => ({
    from: () => ({
      innerJoin: () => ({
        where: () => ({
          limit: async () => [{ user }],
        }),
      }),
    }),
  });

  const request = {
    method: "GET",
    headers: { cookie: `${ADMIN_SESSION_COOKIE}=${"a".repeat(43)}` },
    get: () => undefined,
  };
  let statusCode = 200;
  let responseBody: unknown;
  let nextCalls = 0;
  const response = {
    status(status: number) {
      statusCode = status;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  };

  try {
    await requireAdmin(
      request as never,
      response as never,
      () => {
        nextCalls += 1;
      },
    );
    assert.equal(statusCode, 200);
    assert.equal(nextCalls, 1);
    assert.equal(responseBody, undefined);
  } finally {
    if (originalSelect) {
      Object.defineProperty(database, "select", originalSelect);
    } else {
      // The Drizzle method is inherited from its prototype.
      delete (database as { select?: unknown }).select;
    }
  }
});

test("protected admin mutations reject untrusted origins before session lookup", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    let statusCode = 200;
    let responseBody: unknown;
    let nextCalls = 0;
    const response = {
      status(status: number) {
        statusCode = status;
        return this;
      },
      json(body: unknown) {
        responseBody = body;
        return this;
      },
    };

    await requireAdmin(
      {
        method,
        headers: {},
        get: (header: string) =>
          header.toLowerCase() === "origin"
            ? "https://attacker.example"
            : undefined,
      } as never,
      response as never,
      () => {
        nextCalls += 1;
      },
    );

    assert.equal(statusCode, 403, method);
    assert.deepEqual(responseBody, { error: "Origin not allowed" }, method);
    assert.equal(nextCalls, 0, method);
  }
});

test("the per-IP limiter bounds its bucket map under many unique addresses", () => {
  const limit = createRateLimiter({ windowMs: 60_000, max: 1 });
  let nextCalls = 0;
  let lastStatus = 0;
  const response = {
    setHeader() {
      return this;
    },
    status(status: number) {
      lastStatus = status;
      return this;
    },
    json() {
      return this;
    },
  };
  const send = (ip: string) => {
    limit({ ip } as never, response as never, () => {
      nextCalls += 1;
    });
  };

  send("client-first");
  for (let index = 0; index < 9_999; index += 1) send(`client-${index}`);
  send("client-overflow");
  const callsBeforeRevisit = nextCalls;
  send("client-first");

  assert.equal(lastStatus, 0);
  assert.equal(nextCalls, callsBeforeRevisit + 1);
});

test("independent admin limiters share counts and ignore forwarded IP headers", async () => {
  const databasePool = pool as unknown as {
    query: (...args: unknown[]) => Promise<unknown>;
  };
  const originalQuery = Object.getOwnPropertyDescriptor(databasePool, "query");
  const buckets = new Map<string, number>();
  const seenKeys: string[] = [];
  databasePool.query = async (...args: unknown[]) => {
    const [statement, parameters] = args as [string, [string, number]];
    assert.match(statement, /INSERT INTO rate_limit_buckets/);
    assert.match(statement, /ON CONFLICT \(bucket_key\) DO UPDATE/);
    const [key] = parameters;
    seenKeys.push(key);
    const count = (buckets.get(key) ?? 0) + 1;
    buckets.set(key, count);
    return {
      rows: [{ count, reset_at: new Date(Date.now() + 60_000) }],
    };
  };

  const app = express().set("trust proxy", false);
  app.get(
    "/worker-a",
    createSharedRateLimiter({ scope: "test-shared", windowMs: 60_000, max: 1 }),
    (_req, res) => res.sendStatus(204),
  );
  app.get(
    "/worker-b",
    createSharedRateLimiter({ scope: "test-shared", windowMs: 60_000, max: 1 }),
    (_req, res) => res.sendStatus(204),
  );
  const server = createServer(app);

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;

    const first = await fetch(`${origin}/worker-a`, {
      headers: { "X-Forwarded-For": "192.0.2.1" },
    });
    const second = await fetch(`${origin}/worker-b`, {
      headers: { "X-Forwarded-For": "198.51.100.77" },
    });

    assert.equal(first.status, 204);
    assert.equal(second.status, 429);
    assert.equal(second.headers.get("retry-after") !== null, true);
    assert.equal(seenKeys.length, 2);
    assert.equal(seenKeys[0], seenKeys[1]);
    assert.match(seenKeys[0], /^[a-f0-9]{64}$/);
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (originalQuery) {
      Object.defineProperty(databasePool, "query", originalQuery);
    } else {
      delete (databasePool as { query?: unknown }).query;
    }
  }
});

test("shared admin limiter fails closed when PostgreSQL is unavailable", async () => {
  const databasePool = pool as unknown as {
    query: (...args: unknown[]) => Promise<unknown>;
  };
  const originalQuery = Object.getOwnPropertyDescriptor(databasePool, "query");
  databasePool.query = async () => {
    throw new Error("database unavailable");
  };
  const limit = createSharedRateLimiter({
    scope: "test-failure",
    windowMs: 60_000,
    max: 1,
  });
  let statusCode = 200;
  let nextCalls = 0;
  const response = {
    status(status: number) {
      statusCode = status;
      return this;
    },
    json() {
      return this;
    },
  };

  try {
    await limit(
      { socket: { remoteAddress: "127.0.0.1" } } as never,
      response as never,
      () => {
        nextCalls += 1;
      },
    );
    assert.equal(statusCode, 503);
    assert.equal(nextCalls, 0);
  } finally {
    if (originalQuery) {
      Object.defineProperty(databasePool, "query", originalQuery);
    } else {
      delete (databasePool as { query?: unknown }).query;
    }
  }
});

test.after(() => {
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousDatabaseUrl === undefined) delete process.env.NEON_DATABASE_URL;
  else process.env.NEON_DATABASE_URL = previousDatabaseUrl;
  if (previousPublicSiteUrl === undefined) delete process.env.PUBLIC_SITE_URL;
  else process.env.PUBLIC_SITE_URL = previousPublicSiteUrl;
  if (previousAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = previousAppUrl;
  if (previousPublicUrl === undefined) delete process.env.PUBLIC_URL;
  else process.env.PUBLIC_URL = previousPublicUrl;
  if (previousVitePublicSiteUrl === undefined) delete process.env.VITE_PUBLIC_SITE_URL;
  else process.env.VITE_PUBLIC_SITE_URL = previousVitePublicSiteUrl;
  if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = previousSessionSecret;
});
