import assert from "node:assert/strict";
import test from "node:test";
import { getClerkProxyHost } from "../src/middlewares/clerkProxyHost.ts";

function withEnvironment(
  values: Record<string, string | undefined>,
  run: () => void,
): void {
  const original = new Map(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("production Clerk proxy trusts only a valid configured public host", () => {
  withEnvironment(
    { NODE_ENV: "production", PUBLIC_SITE_URL: "https://sendflow.example" },
    () => {
      assert.equal(
        getClerkProxyHost({ headers: { host: "attacker.example" } }),
        "sendflow.example",
      );

      process.env.PUBLIC_SITE_URL = "https://user:password@sendflow.example";
      assert.equal(
        getClerkProxyHost({ headers: { host: "attacker.example" } }),
        undefined,
      );

      delete process.env.PUBLIC_SITE_URL;
      assert.equal(
        getClerkProxyHost({ headers: { host: "attacker.example" } }),
        undefined,
      );
    },
  );
});

test("production Clerk proxy accepts APP_URL when PUBLIC_SITE_URL is unset", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      PUBLIC_SITE_URL: undefined,
      APP_URL: "https://sendflow.example",
    },
    () => {
      assert.equal(
        getClerkProxyHost({ headers: { host: "attacker.example" } }),
        "sendflow.example",
      );
    },
  );
});

test("development Clerk proxy accepts a valid request host and rejects malformed hosts", () => {
  withEnvironment(
    { NODE_ENV: "development", PUBLIC_SITE_URL: undefined },
    () => {
      assert.equal(
        getClerkProxyHost({ headers: { host: "localhost:3000" } }),
        "localhost:3000",
      );
      assert.equal(
        getClerkProxyHost({ headers: { host: "attacker.example/path" } }),
        undefined,
      );
    },
  );
});
