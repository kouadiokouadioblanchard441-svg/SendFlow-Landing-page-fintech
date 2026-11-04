import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { createIpBlockMiddleware } from "../src/middlewares/ipBlock.ts";

test("IP block middleware denies a blocked public IP before routes continue", async () => {
  const previous = {
    enabled: process.env.TELEGRAM_AUDIT_ENABLED,
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
    secret: process.env.TELEGRAM_WEBHOOK_SECRET,
    admins: process.env.TELEGRAM_ADMIN_USER_IDS,
  };
  Object.assign(process.env, {
    TELEGRAM_AUDIT_ENABLED: "true",
    TELEGRAM_BOT_TOKEN: "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG",
    TELEGRAM_CHAT_ID: "-100123456789",
    TELEGRAM_WEBHOOK_SECRET: "A-secure_secret-123",
    TELEGRAM_ADMIN_USER_IDS: "12345",
  });

  try {
    const response: { statusCode?: number; body?: unknown; status(code: number): typeof response; json(value: unknown): typeof response } = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(value) {
        this.body = value;
        return this;
      },
    };
    let continued = false;
    const middleware = createIpBlockMiddleware(
      async (ip) => ip === "8.8.8.8",
      () => true,
    );
    await middleware(
      { ip: "8.8.8.8" } as Request,
      response as Response,
      () => { continued = true; },
      (error) => { throw error; },
    );
    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, { error: "Accès refusé." });
    assert.equal(continued, false);
  } finally {
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

test("IP block middleware does not mistake a private Passenger proxy for a visitor", async () => {
  const previous = {
    enabled: process.env.TELEGRAM_AUDIT_ENABLED,
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
    secret: process.env.TELEGRAM_WEBHOOK_SECRET,
    admins: process.env.TELEGRAM_ADMIN_USER_IDS,
  };
  Object.assign(process.env, {
    TELEGRAM_AUDIT_ENABLED: "true",
    TELEGRAM_BOT_TOKEN: "123456789:abcdefghijklmnopqrstuvwxyzABCDEFG",
    TELEGRAM_CHAT_ID: "-100123456789",
    TELEGRAM_WEBHOOK_SECRET: "A-secure_secret-123",
    TELEGRAM_ADMIN_USER_IDS: "12345",
  });

  try {
    let databaseChecked = false;
    let continued = false;
    const middleware = createIpBlockMiddleware(async () => {
      databaseChecked = true;
      return true;
    }, () => true);
    await middleware(
      { ip: "127.0.0.1" } as Request,
      {} as Response,
      () => { continued = true; },
      (error) => { throw error; },
    );
    assert.equal(databaseChecked, false);
    assert.equal(continued, true);
  } finally {
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
