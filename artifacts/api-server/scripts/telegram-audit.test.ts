import assert from "node:assert/strict";
import test from "node:test";

process.env.NEON_DATABASE_URL ??=
  "postgresql://offline-test:offline-test@127.0.0.1:1/sendflow";
process.env.APP_URL ??= "https://sendflow.example";

const {
  callTelegramApi,
  configureTelegramWebhook,
  deriveTelegramWebhookSecret,
  getTelegramChatMemberStatus,
  getIpBlockTableSqlForTest,
  handleTelegramUpdate,
  isAuthorizedTelegramGroupAdmin,
  isTelegramAdministratorStatus,
  isIpBlockStoreReady,
  isPublicClientIp,
  isTelegramWebhookAuthorized,
  normalizePublicIp,
  readTelegramConfig,
  safeActivityTarget,
  safePublicPagePath,
  safeSecurityRequestPath,
} = await import("../src/lib/telegramAudit.ts");

test("Telegram monitoring is off when the bot token and group ID are absent", () => {
  const config = readTelegramConfig({});
  assert.equal(config, null);
});

test("Telegram monitoring enables with only the bot token and group ID", () => {
  const botToken = "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG";
  assert.throws(
    () => readTelegramConfig({ TELEGRAM_BOT_TOKEN: botToken }),
    /TELEGRAM_CHAT_ID/,
  );
  const config = readTelegramConfig({
    TELEGRAM_BOT_TOKEN: botToken,
    TELEGRAM_CHAT_ID: "-100123456789",
  });
  assert.ok(config);
  assert.equal(config.chatId, "-100123456789");
  assert.equal(config.webhookSecret, deriveTelegramWebhookSecret(botToken));
  assert.match(config.webhookSecret, /^[A-Fa-f0-9]{64}$/);
  assert.notEqual(config.webhookSecret, botToken);
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

test("only Telegram group creators and administrators are accepted for block controls", () => {
  assert.equal(isTelegramAdministratorStatus("creator"), true);
  assert.equal(isTelegramAdministratorStatus("administrator"), true);
  assert.equal(isTelegramAdministratorStatus("member"), false);
  assert.equal(isTelegramAdministratorStatus("restricted"), false);
  assert.equal(isTelegramAdministratorStatus("left"), false);
  assert.equal(
    isAuthorizedTelegramGroupAdmin("-100123456789", "-100123456789", "administrator"),
    true,
  );
  assert.equal(
    isAuthorizedTelegramGroupAdmin("-100999999999", "-100123456789", "administrator"),
    false,
  );
  assert.equal(
    isAuthorizedTelegramGroupAdmin("-100123456789", "-100123456789", "member"),
    false,
  );
});

test("Telegram group membership checks only accept a valid getChatMember response", async () => {
  const config = readTelegramConfig({
    TELEGRAM_BOT_TOKEN: "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG",
    TELEGRAM_CHAT_ID: "-100123456789",
  });
  assert.ok(config);
  let requestedUrl = "";
  let requestBody = "";
  const status = await getTelegramChatMemberStatus(
    "12345",
    config,
    async (input, init) => {
      requestedUrl = String(input);
      requestBody = String(init?.body);
      return new Response(JSON.stringify({
        ok: true,
        result: { status: "administrator" },
      }), { status: 200 });
    },
  );
  assert.equal(status, "administrator");
  assert.ok(requestedUrl.endsWith("/getChatMember"));
  assert.deepEqual(JSON.parse(requestBody), {
    chat_id: "-100123456789",
    user_id: "12345",
  });

  const malformedStatus = await getTelegramChatMemberStatus(
    "99999",
    config,
    async () => new Response(JSON.stringify({ ok: false }), { status: 200 }),
  );
  assert.equal(malformedStatus, null);
});

test("visitor command answers only authorized group admins with stored visitor data", async () => {
  const previous = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
  };
  const botToken = "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG";
  Object.assign(process.env, {
    TELEGRAM_BOT_TOKEN: botToken,
    TELEGRAM_CHAT_ID: "-100123456789",
  });
  try {
    let sentMessage: Record<string, unknown> | undefined;
    const request: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/getChatMember")) {
        return new Response(JSON.stringify({
          ok: true,
          result: { status: "administrator" },
        }), { status: 200 });
      }
      if (url.endsWith("/sendMessage")) {
        sentMessage = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      throw new Error("Unexpected Telegram API method");
    };
    const result = await handleTelegramUpdate({
      message: {
        text: "/visiteurs",
        chat: { id: -100123456789, type: "supergroup" },
        from: { id: 12345 },
      },
    }, {
      request,
      listVisitors: async () => ({
        rows: [{
          ip_address: "8.8.8.8",
          country_code: "CI",
          country: "Côte d’Ivoire",
          region: null,
          city: "Abidjan",
          asn: 12345,
          network_organization: "Example ASN",
          last_seen: "2026-11-19T10:00:00.000Z",
        }],
        total: 1,
      }),
    });
    assert.equal(result, "handled");
    assert.equal(sentMessage?.chat_id, "-100123456789");
    assert.match(String(sentMessage?.text), /8\.8\.8\.8/);

    sentMessage = undefined;
    const memberResult = await handleTelegramUpdate({
      message: {
        text: "/visiteurs",
        chat: { id: -100123456789, type: "supergroup" },
        from: { id: 99999 },
      },
    }, {
      request: async (input) => {
        assert.ok(String(input).endsWith("/getChatMember"));
        return new Response(JSON.stringify({
          ok: true,
          result: { status: "member" },
        }), { status: 200 });
      },
      listVisitors: async () => {
        throw new Error("A regular member must not read visitor history");
      },
    });
    assert.equal(memberResult, "ignored");
    assert.equal(sentMessage, undefined);
  } finally {
    for (const [key, value] of Object.entries({
      TELEGRAM_BOT_TOKEN: previous.token,
      TELEGRAM_CHAT_ID: previous.chat,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("private Telegram commands and button callbacks are ignored without any reply", async () => {
  const previous = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
  };
  Object.assign(process.env, {
    TELEGRAM_BOT_TOKEN: "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG",
    TELEGRAM_CHAT_ID: "-100123456789",
  });
  try {
    let apiCallCount = 0;
    const request: typeof fetch = async () => {
      apiCallCount += 1;
      throw new Error("Private Telegram updates must never trigger a reply");
    };
    for (const command of ["/visiteurs", "/requetes"]) {
      const result = await handleTelegramUpdate({
        message: {
          text: command,
          chat: { id: 123456789, type: "private" },
          from: { id: 123456789 },
        },
      }, {
        request,
        listVisitors: async () => {
          throw new Error("Private commands must not read visitor data");
        },
        listRequests: async () => {
          throw new Error("Private commands must not read request data");
        },
      });
      assert.equal(result, "ignored");
    }

    const callbackResult = await handleTelegramUpdate({
      callback_query: {
        id: "private-callback",
        data: "block:8.8.8.8",
        from: { id: 123456789 },
        message: { chat: { id: 123456789, type: "private" } },
      },
    }, { request });
    assert.equal(callbackResult, "ignored");
    assert.equal(apiCallCount, 0);
  } finally {
    for (const [key, value] of Object.entries({
      TELEGRAM_BOT_TOKEN: previous.token,
      TELEGRAM_CHAT_ID: previous.chat,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Telegram webhook configures itself with the derived secret and public SendFlow URL", async () => {
  const previous = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
    publicSiteUrl: process.env.PUBLIC_SITE_URL,
  };
  const botToken = "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG";
  Object.assign(process.env, {
    TELEGRAM_BOT_TOKEN: botToken,
    TELEGRAM_CHAT_ID: "-100123456789",
    PUBLIC_SITE_URL: "https://sendflow.africa",
  });
  try {
    const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const registered = await configureTelegramWebhook(async (input, init) => {
      const method = String(input).split("/").at(-1) ?? "";
      const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
      calls.push({ method, payload });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    assert.equal(registered, true);
    assert.deepEqual(calls.find((call) => call.method === "setWebhook")?.payload, {
      url: "https://sendflow.africa/api/security/telegram/webhook",
      secret_token: deriveTelegramWebhookSecret(botToken),
      allowed_updates: ["callback_query", "message"],
    });
    assert.deepEqual(calls.find((call) => call.method === "setMyCommands")?.payload, {
      commands: [
        { command: "visiteurs", description: "Voir les visiteurs des 90 derniers jours" },
        { command: "requetes", description: "Parcourir les requêtes Node/Express" },
      ],
      scope: { type: "chat_administrators", chat_id: "-100123456789" },
    });
    assert.doesNotMatch(JSON.stringify(calls), /123456789:abcdefghijklmnopqrstuvwxyzABCDEFG/);
  } finally {
    for (const [key, value] of Object.entries({
      TELEGRAM_BOT_TOKEN: previous.token,
      TELEGRAM_CHAT_ID: previous.chat,
      PUBLIC_SITE_URL: previous.publicSiteUrl,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Telegram request failures never include the bot token or upstream body in logs/errors", async () => {
  const config = {
    botToken: "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG",
    chatId: "-100123456789",
    webhookSecret: deriveTelegramWebhookSecret("123456789:abcdefghijklmnopqrstuvwxyzABCDEFG"),
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
