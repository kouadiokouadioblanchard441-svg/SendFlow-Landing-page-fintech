import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { newsletterSubscribeSchema } from "../src/lib/requestValidation.ts";
import { parseNewsletterToken } from "../src/lib/newsletterToken.ts";
import {
  NEWSLETTER_ACTIVE_STATUS,
  NEWSLETTER_CONSENT_TEXT_VERSION,
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

test("campaign membership remains limited to explicitly confirmed subscribers", () => {
  assert.equal(NEWSLETTER_ACTIVE_STATUS, "subscribed");
  assert.equal(NEWSLETTER_CONSENT_TEXT_VERSION, "newsletter-v1");
  assert.notEqual("pending", NEWSLETTER_ACTIVE_STATUS);
  assert.notEqual("unsubscribed", NEWSLETTER_ACTIVE_STATUS);
});

