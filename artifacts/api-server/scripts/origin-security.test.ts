import assert from "node:assert/strict";
import test from "node:test";

const previousNodeEnv = process.env.NODE_ENV;
const previousPublicSiteUrl = process.env.PUBLIC_SITE_URL;
process.env.NODE_ENV = "production";
process.env.PUBLIC_SITE_URL = "https://sendflow.example";

const { createRateLimiter, isAllowedMutationOrigin } = await import("../src/middlewares/security.ts");

test("unsafe admin requests require the configured public origin", () => {
  assert.equal(isAllowedMutationOrigin(undefined), false);
  assert.equal(isAllowedMutationOrigin(""), false);
  assert.equal(isAllowedMutationOrigin("null"), false);
  assert.equal(isAllowedMutationOrigin("https://attacker.example"), false);
  assert.equal(isAllowedMutationOrigin("https://sendflow.example"), true);
});

test("the per-IP limiter bounds its bucket map under many unique addresses", () => {
  const limit = createRateLimiter({ windowMs: 60_000, max: 1 });
  let nextCalls = 0;
  let lastStatus = 0;
  const response = {
    setHeader() { return this; },
    status(status: number) {
      lastStatus = status;
      return this;
    },
    json() { return this; },
  };
  const send = (ip: string) => {
    limit(
      { ip } as never,
      response as never,
      () => { nextCalls += 1; },
    );
  };

  send("client-first");
  for (let index = 0; index < 9_999; index += 1) send(`client-${index}`);
  send("client-overflow");
  const callsBeforeRevisit = nextCalls;
  send("client-first");

  assert.equal(lastStatus, 0);
  assert.equal(nextCalls, callsBeforeRevisit + 1);
});

test.after(() => {
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousPublicSiteUrl === undefined) delete process.env.PUBLIC_SITE_URL;
  else process.env.PUBLIC_SITE_URL = previousPublicSiteUrl;
});
