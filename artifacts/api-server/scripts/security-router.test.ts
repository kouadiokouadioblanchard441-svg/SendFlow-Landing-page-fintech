import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import test from "node:test";

process.env.NEON_DATABASE_URL ??=
  "postgresql://offline-test:offline-test@127.0.0.1:1/sendflow";
process.env.APP_URL = "https://sendflow.example";

const { default: securityRouter } = await import("../src/routes/security.ts");
const { deriveTelegramWebhookSecret } = await import("../src/lib/telegramAudit.ts");
const { createProxyDiagnosticSnapshot } = await import("../src/lib/proxyDiagnostics.ts");

test("proxy diagnostics normalize and label forwarded addresses as unverified", () => {
  const snapshot = createProxyDiagnosticSnapshot({
    socketPeerAddress: "::ffff:127.0.0.1",
    expressClientAddress: "::ffff:127.0.0.1",
    trustedProxyAddressCount: 0,
    xForwardedFor: "203.0.113.27, 10.12.0.3, not-an-ip",
    xRealIp: "198.51.100.8",
    cloudflareConnectingIp: "198.51.100.9",
  });

  assert.equal(snapshot.socketPeerAddress, "127.0.0.1");
  assert.equal(snapshot.expressClientAddress, "127.0.0.1");
  assert.equal(snapshot.expressClientAddressIsPublic, false);
  assert.equal(snapshot.trustedProxyAddressCount, 0);
  assert.deepEqual(snapshot.unverifiedHeaderCandidates, {
    xForwardedFor: ["203.0.113.27", "10.12.0.3"],
    xRealIp: ["198.51.100.8"],
    cloudflareConnectingIp: ["198.51.100.9"],
  });
  assert.match(snapshot.note, /unverified/i);
});

test("public telemetry and Telegram webhook enforce configuration and origin checks", async () => {
  const previous = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
  };
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;

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

    const unauthorizedDiagnostics = await fetch(`${origin}/api/admin/security/proxy-diagnostics`, {
      headers: {
        "X-Forwarded-For": "203.0.113.44",
        "CF-Connecting-IP": "198.51.100.44",
      },
    });
    assert.equal(unauthorizedDiagnostics.status, 401);
    assert.equal(unauthorizedDiagnostics.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(await unauthorizedDiagnostics.text(), /203\.0\.113\.44|198\.51\.100\.44/);

    const disabledConfig = await fetch(`${origin}/api/security/telemetry/config`);
    assert.deepEqual(await disabledConfig.json(), { enabled: false });
    const disabledEvent = await fetch(`${origin}/api/security/telemetry/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "click", page: "/" }),
    });
    assert.equal(disabledEvent.status, 204);
    assert.equal(await disabledEvent.text(), "");

    const botToken = "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG";
    Object.assign(process.env, {
      TELEGRAM_BOT_TOKEN: botToken,
      TELEGRAM_CHAT_ID: "-100123456789",
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
        "x-telegram-bot-api-secret-token": deriveTelegramWebhookSecret(botToken),
      },
      body: JSON.stringify({ update_id: 123 }),
    });
    assert.equal(validNoopWebhook.status, 200);
    assert.deepEqual(await validNoopWebhook.json(), { ok: true });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const [key, value] of Object.entries({
      TELEGRAM_BOT_TOKEN: previous.token,
      TELEGRAM_CHAT_ID: previous.chat,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
