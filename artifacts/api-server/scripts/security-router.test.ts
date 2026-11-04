import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import test from "node:test";

process.env.NEON_DATABASE_URL ??=
  "postgresql://offline-test:offline-test@127.0.0.1:1/sendflow";
process.env.APP_URL = "https://sendflow.example";

const { default: securityRouter } = await import("../src/routes/security.ts");

test("public telemetry and Telegram webhook enforce configuration and origin checks", async () => {
  const previous = {
    enabled: process.env.TELEGRAM_AUDIT_ENABLED,
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
    secret: process.env.TELEGRAM_WEBHOOK_SECRET,
    admins: process.env.TELEGRAM_ADMIN_USER_IDS,
  };
  delete process.env.TELEGRAM_AUDIT_ENABLED;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  delete process.env.TELEGRAM_ADMIN_USER_IDS;

  const app = express().use(express.json()).use("/api", securityRouter);
  const server = createServer(app);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;

    const disabledConfig = await fetch(`${origin}/api/security/telemetry/config`);
    assert.deepEqual(await disabledConfig.json(), { enabled: false });
    const disabledEvent = await fetch(`${origin}/api/security/telemetry/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "click", page: "/" }),
    });
    assert.equal(disabledEvent.status, 204);
    assert.equal(await disabledEvent.text(), "");

    Object.assign(process.env, {
      TELEGRAM_AUDIT_ENABLED: "true",
      TELEGRAM_BOT_TOKEN: "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG",
      TELEGRAM_CHAT_ID: "-100123456789",
      TELEGRAM_WEBHOOK_SECRET: "A-secure_secret-123",
      TELEGRAM_ADMIN_USER_IDS: "12345",
    });

    const crossOriginEvent = await fetch(`${origin}/api/security/telemetry/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.example",
      },
      body: JSON.stringify({ kind: "click", page: "/" }),
    });
    assert.equal(crossOriginEvent.status, 403);

    const invalidEvent = await fetch(`${origin}/api/security/telemetry/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://sendflow.example",
      },
      body: JSON.stringify({ kind: "click", page: "/panel", email: "private@example.com" }),
    });
    assert.equal(invalidEvent.status, 400);
    assert.doesNotMatch(await invalidEvent.text(), /private@example\.com/);

    const invalidWebhook = await fetch(`${origin}/api/security/telegram/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(invalidWebhook.status, 401);

    const validNoopWebhook = await fetch(`${origin}/api/security/telegram/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "A-secure_secret-123",
      },
      body: JSON.stringify({ update_id: 123 }),
    });
    assert.equal(validNoopWebhook.status, 200);
    assert.deepEqual(await validNoopWebhook.json(), { ok: true });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const [key, value] of Object.entries({
      TELEGRAM_AUDIT_ENABLED: previous.enabled,
      TELEGRAM_BOT_TOKEN: previous.token,
      TELEGRAM_CHAT_ID: previous.chat,
      TELEGRAM_WEBHOOK_SECRET: previous.secret,
      TELEGRAM_ADMIN_USER_IDS: previous.admins,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
