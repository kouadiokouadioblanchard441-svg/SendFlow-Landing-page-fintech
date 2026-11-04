import assert from "node:assert/strict";
import test from "node:test";

process.env.NEON_DATABASE_URL ??=
  "postgresql://offline-test:offline-test@127.0.0.1:1/sendflow";
process.env.APP_URL ??= "https://sendflow.example";

const {
  callTelegramApi,
  getIpBlockTableSqlForTest,
  isAuthorizedTelegramAdmin,
  isIpBlockStoreReady,
  isPublicClientIp,
  isTelegramWebhookAuthorized,
  normalizePublicIp,
  readTelegramConfig,
  safeActivityTarget,
  safePublicPagePath,
  safeSecurityRequestPath,
} = await import("../src/lib/telegramAudit.ts");

test("Telegram monitoring is off unless explicitly enabled", () => {
  const config = readTelegramConfig({
    TELEGRAM_AUDIT_ENABLED: "false",
  });
  assert.equal(config, null);
});

test("enabled monitoring requires complete, valid server configuration", () => {
  assert.throws(
    () => readTelegramConfig({ TELEGRAM_AUDIT_ENABLED: "true" }),
    /TELEGRAM_BOT_TOKEN/,
  );
  const config = readTelegramConfig({
    TELEGRAM_AUDIT_ENABLED: "true",
    TELEGRAM_BOT_TOKEN: "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG",
    TELEGRAM_CHAT_ID: "-100123456789",
    TELEGRAM_WEBHOOK_SECRET: "A-secure_secret-123",
    TELEGRAM_ADMIN_USER_IDS: "12345, 67890",
  });
  assert.ok(config);
  assert.deepEqual([...config.adminUserIds], ["12345", "67890"]);
  assert.equal(config.chatId, "-100123456789");
});

test("IP handling rejects private and malformed addresses before block buttons are created", () => {
  assert.equal(isPublicClientIp("8.8.8.8"), true);
  assert.equal(isPublicClientIp("203.0.113.8"), false);
  assert.equal(isPublicClientIp("2001:db8::1"), false);
  assert.equal(isPublicClientIp("10.0.0.2"), false);
  assert.equal(isPublicClientIp("192.168.1.5"), false);
  assert.equal(isPublicClientIp("::1"), false);
  assert.equal(isPublicClientIp("not-an-ip"), false);
  assert.equal(normalizePublicIp("::ffff:8.8.8.8"), "8.8.8.8");
  assert.equal(normalizePublicIp("::ffff:203.0.113.8"), null);
  assert.equal(normalizePublicIp("::ffff:127.0.0.1"), null);
});

test("telemetry paths exclude private routes, queries, fragments, and token-like segments", () => {
  assert.equal(safePublicPagePath("/securite?token=not-for-telegram#top"), "/securite");
  assert.equal(safePublicPagePath("/panel"), null);
  assert.equal(safePublicPagePath("/api/healthz"), null);
  assert.equal(
    safePublicPagePath(`/newsletter/${"a".repeat(40)}`),
    "/newsletter/[redacted]",
  );
  assert.equal(safePublicPagePath("//attacker.example/path"), null);
  assert.equal(safeSecurityRequestPath("/api/healthz?secret=hidden"), "/api/healthz");
  assert.equal(safeSecurityRequestPath("/api/admin/auth/panel/private-code"), "/api/admin/[redacted]");
  assert.equal(safeSecurityRequestPath("/account/jane.doe@example.com"), "/account/[redacted]");
  assert.equal(safeSecurityRequestPath("/verify/+2250700000000"), "/verify/[redacted]");
  assert.equal(safeActivityTarget("button-nav-register"), "button-nav-register");
  assert.equal(safeActivityTarget("value with spaces"), undefined);
  assert.equal(safeActivityTarget("x".repeat(81)), undefined);
});

test("Telegram webhook secret comparison rejects absent, wrong, and unequal-length values", () => {
  assert.equal(isTelegramWebhookAuthorized(undefined, "long-secret"), false);
  assert.equal(isTelegramWebhookAuthorized("wrong-secret", "long-secret"), false);
  assert.equal(isTelegramWebhookAuthorized("long-secret", "long-secret"), true);
});

test("only allowlisted Telegram users in the configured chat can control IP blocks", () => {
  const config = {
    chatId: "-100123456789",
    adminUserIds: new Set(["12345"]),
  };
  assert.equal(isAuthorizedTelegramAdmin("12345", "-100123456789", config), true);
  assert.equal(isAuthorizedTelegramAdmin("12345", "-100999999999", config), false);
  assert.equal(isAuthorizedTelegramAdmin("99999", "-100123456789", config), false);
});

test("Telegram request failures never include the bot token or upstream body in logs/errors", async () => {
  const config = {
    botToken: "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG",
    chatId: "-100123456789",
    webhookSecret: "A-secure_secret-123",
    adminUserIds: new Set(["12345"]),
  };
  let calledUrl = "";
  const succeeded = await callTelegramApi(
    "sendMessage",
    { chat_id: config.chatId, text: "test" },
    config,
    async (input) => {
      calledUrl = String(input);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  );
  assert.equal(succeeded, true);
  assert.ok(calledUrl.includes(config.botToken));

  const failed = await callTelegramApi(
    "sendMessage",
    { chat_id: config.chatId, text: "test" },
    config,
    async () => new Response("upstream contains no surfaced details", { status: 500 }),
  );
  assert.equal(failed, false);
});

test("IP block schema is additive and persistent", () => {
  const migration = getIpBlockTableSqlForTest().toLowerCase();
  assert.match(migration, /create table if not exists security_ip_blocks/);
  assert.match(migration, /ip_address varchar\(45\) primary key/);
  assert.match(migration, /blocked_at timestamptz/);
  assert.equal(isIpBlockStoreReady(), false);
});
