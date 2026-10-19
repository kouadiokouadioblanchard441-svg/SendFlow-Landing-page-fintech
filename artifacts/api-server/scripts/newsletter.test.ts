import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { newsletterSubscribeSchema } from "../src/lib/requestValidation.ts";
import { parseNewsletterToken } from "../src/lib/newsletterToken.ts";
import {
  getNewsletterConfirmationExpiry,
  getNewsletterConfirmationUrl,
  isNewsletterConfirmationUsable,
  NEWSLETTER_ACTIVE_STATUS,
  NEWSLETTER_CONSENT_TEXT_VERSION,
  NEWSLETTER_CONFIRMATION_TTL_MS,
} from "../src/lib/newsletterPolicy.ts";

test("newsletter requests require explicit affirmative consent", () => {
  const accepted = newsletterSubscribeSchema.safeParse({
    email: " READER@example.com ",
    consent: true,
  });
  assert.equal(accepted.success, true);
  if (accepted.success) {
    assert.deepEqual(accepted.data, { email: "reader@example.com", consent: true });
  }
  assert.equal(newsletterSubscribeSchema.safeParse({
    email: "reader@example.com",
    consent: false,
  }).success, false);
  assert.equal(newsletterSubscribeSchema.safeParse({
    email: "reader@example.com",
  }).success, false);
});

test("confirmation and unsubscribe tokens accept only UUID v4 values", () => {
  const token = randomUUID();
  assert.equal(parseNewsletterToken(token), token);
  assert.equal(parseNewsletterToken("not-a-token"), null);
  assert.equal(parseNewsletterToken("00000000-0000-3000-8000-000000000000"), null);
  assert.equal(parseNewsletterToken(null), null);
});

test("confirmation token expires after 24 hours and cannot be reused", () => {
  const now = new Date("2026-10-19T12:00:00.000Z");
  const token = randomUUID();
  const expiresAt = getNewsletterConfirmationExpiry(now);
  assert.equal(NEWSLETTER_CONFIRMATION_TTL_MS, 24 * 60 * 60 * 1000);
  assert.equal(expiresAt.toISOString(), "2026-10-20T12:00:00.000Z");
  assert.equal(isNewsletterConfirmationUsable("pending", token, expiresAt, now), true);
  assert.equal(isNewsletterConfirmationUsable("pending", token, expiresAt, expiresAt), false);
  assert.equal(isNewsletterConfirmationUsable("subscribed", token, expiresAt, now), false);
  assert.equal(isNewsletterConfirmationUsable("pending", null, expiresAt, now), false);
  assert.equal(isNewsletterConfirmationUsable("pending", token, null, now), false);
});

test("confirmation token is carried in a URL fragment, not the request path", () => {
  const token = randomUUID();
  const confirmation = new URL(getNewsletterConfirmationUrl("https://sendflow.example", token));
  assert.equal(confirmation.pathname, "/api/newsletter/confirm");
  assert.equal(confirmation.hash, `#${token}`);
});

test("newsletter migrations match the additive confirmation schema", () => {
  const schema = readFileSync(new URL("../../../lib/db/src/schema/landing.ts", import.meta.url), "utf8");
  const initialMigration = readFileSync(new URL("../../../lib/db/migrations/0001_newsletter_double_opt_in.sql", import.meta.url), "utf8");
  const expiryMigration = readFileSync(new URL("../../../lib/db/migrations/0002_newsletter_confirmation_expiry.sql", import.meta.url), "utf8");
  for (const column of ["confirmationToken", "consentedAt", "consentTextVersion", "confirmationExpiresAt"]) {
    assert.ok(schema.includes(column), `schema must include ${column}`);
  }
  for (const column of ["confirmation_token", "consented_at", "consent_text_version"]) {
    assert.ok(initialMigration.includes(column), `first migration must add ${column}`);
  }
  assert.match(expiryMigration, /ADD COLUMN confirmation_expires_at timestamptz/i);
});

test("campaign membership remains limited to explicitly confirmed subscribers", () => {
  assert.equal(NEWSLETTER_ACTIVE_STATUS, "subscribed");
  assert.equal(NEWSLETTER_CONSENT_TEXT_VERSION, "newsletter-v1");
  assert.notEqual("pending", NEWSLETTER_ACTIVE_STATUS);
  assert.notEqual("unsubscribed", NEWSLETTER_ACTIVE_STATUS);
});

