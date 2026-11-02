import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import app from "../src/app.ts";
import { readRecaptchaSettings, verifyRecaptchaToken } from "../src/lib/recaptcha.ts";

test("reCAPTCHA stays disabled unless both keys are configured", () => {
  assert.deepEqual(readRecaptchaSettings({}), { status: "disabled" });
  assert.deepEqual(readRecaptchaSettings({ RECAPTCHA_SITE_KEY: "site" }), { status: "misconfigured" });
  assert.deepEqual(readRecaptchaSettings({ RECAPTCHA_SECRET_KEY: "secret" }), { status: "misconfigured" });
  assert.deepEqual(readRecaptchaSettings({
    RECAPTCHA_SITE_KEY: " site ",
    RECAPTCHA_SECRET_KEY: " secret ",
  }), { status: "enabled", siteKey: "site", secretKey: "secret" });
});

test("reCAPTCHA verification requires a successful score, expected action, and request hostname", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchMock: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({
      success: true,
      score: 0.9,
      action: "newsletter_subscribe",
      hostname: "sendflow.africa",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await verifyRecaptchaToken({
    token: "one-time-token",
    secretKey: "test-secret",
    expectedAction: "newsletter_subscribe",
    expectedHostname: "sendflow.africa",
  }, fetchMock);

  assert.deepEqual(result, { valid: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://www.google.com/recaptcha/api/siteverify");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.match(String(calls[0]?.init?.headers && new Headers(calls[0].init.headers).get("Content-Type")), /application\/x-www-form-urlencoded/);
  const body = new URLSearchParams(String(calls[0]?.init?.body));
  assert.equal(body.get("secret"), "test-secret");
  assert.equal(body.get("response"), "one-time-token");
});

test("reCAPTCHA verification rejects low scores, wrong actions, and wrong hostnames", async () => {
  const cases = [
    { score: 0.2, action: "newsletter_subscribe", hostname: "sendflow.africa" },
    { score: 0.9, action: "login", hostname: "sendflow.africa" },
    { score: 0.9, action: "newsletter_subscribe", hostname: "attacker.example" },
  ];

  for (const result of cases) {
    const fetchMock: typeof fetch = async () => new Response(JSON.stringify({
      success: true,
      ...result,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    assert.deepEqual(await verifyRecaptchaToken({
      token: "one-time-token",
      secretKey: "test-secret",
      expectedAction: "newsletter_subscribe",
      expectedHostname: "sendflow.africa",
    }, fetchMock), { valid: false, reason: "invalid" });
  }
});

test("reCAPTCHA network errors fail closed without logging or accepting the token", async () => {
  const rejected: typeof fetch = async () => {
    throw new Error("offline");
  };
  const unavailable: typeof fetch = async () => new Response("unavailable", { status: 503 });

  for (const fetchMock of [rejected, unavailable]) {
    assert.deepEqual(await verifyRecaptchaToken({
      token: "one-time-token",
      secretKey: "test-secret",
      expectedAction: "newsletter_subscribe",
      expectedHostname: "sendflow.africa",
    }, fetchMock), { valid: false, reason: "unavailable" });
  }
});

test("reCAPTCHA does not call Google for an empty token", async () => {
  let called = false;
  const fetchMock: typeof fetch = async () => {
    called = true;
    return new Response("{}", { status: 200 });
  };
  assert.deepEqual(await verifyRecaptchaToken({
    token: " ",
    secretKey: "test-secret",
    expectedAction: "newsletter_subscribe",
    expectedHostname: "sendflow.africa",
  }, fetchMock), { valid: false, reason: "invalid" });
  assert.equal(called, false);
});

test("public config exposes only the site key and fails closed on partial keys", async () => {
  const previousSiteKey = process.env.RECAPTCHA_SITE_KEY;
  const previousSecretKey = process.env.RECAPTCHA_SECRET_KEY;
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    const origin = `http://127.0.0.1:${address.port}`;

    delete process.env.RECAPTCHA_SITE_KEY;
    delete process.env.RECAPTCHA_SECRET_KEY;
    const disabledResponse = await fetch(`${origin}/api/recaptcha/config`);
    assert.equal(disabledResponse.status, 200);
    assert.deepEqual(await disabledResponse.json(), { enabled: false, siteKey: null });
    assert.doesNotMatch(disabledResponse.headers.get("content-security-policy") ?? "", /google\.com\/recaptcha/);

    process.env.RECAPTCHA_SITE_KEY = "public-test-site-key";
    const partialResponse = await fetch(`${origin}/api/recaptcha/config`);
    assert.equal(partialResponse.status, 503);
    assert.doesNotMatch(partialResponse.headers.get("content-security-policy") ?? "", /google\.com\/recaptcha/);

    process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    const enabledResponse = await fetch(`${origin}/api/recaptcha/config`);
    assert.equal(enabledResponse.status, 200);
    assert.deepEqual(await enabledResponse.json(), {
      enabled: true,
      siteKey: "public-test-site-key",
    });
    const enabledPolicy = enabledResponse.headers.get("content-security-policy") ?? "";
    assert.match(enabledPolicy, /www\.google\.com\/recaptcha/);
    assert.match(enabledPolicy, /www\.gstatic\.com\/recaptcha/);

    const missingTokenResponse = await fetch(`${origin}/api/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.org", consent: true }),
    });
    assert.equal(missingTokenResponse.status, 400);
  } finally {
    if (previousSiteKey === undefined) delete process.env.RECAPTCHA_SITE_KEY;
    else process.env.RECAPTCHA_SITE_KEY = previousSiteKey;
    if (previousSecretKey === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
    else process.env.RECAPTCHA_SECRET_KEY = previousSecretKey;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
