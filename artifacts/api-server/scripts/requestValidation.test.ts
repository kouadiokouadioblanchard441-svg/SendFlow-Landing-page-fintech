import assert from "node:assert/strict";
import test from "node:test";
import {
  adminLoginSchema,
  countryOperatorAssignmentSchema,
  imageBytesMatchMimeType,
  landingResourceSchemas,
  mediaUploadHeadersSchema,
  newsletterCampaignSchema,
  parseLandingResourcePayload,
} from "../src/lib/requestValidation.ts";

test("CMS creation requires complete, typed fields and rejects server-owned properties", () => {
  const feature = {
    slug: "secure-transfers",
    group: "payments",
    orderIndex: 1,
    titleFr: "Transferts sécurisés",
    titleEn: "Secure transfers",
    bodyFr: "Description",
    bodyEn: "Description",
  };

  assert.ok(parseLandingResourcePayload("features", feature, "create"));
  assert.equal(parseLandingResourcePayload("features", { ...feature, isVisible: "false" }, "create"), null);
  assert.equal(parseLandingResourcePayload("features", { ...feature, id: 12 }, "create"), null);
  assert.equal(parseLandingResourcePayload("features", { ...feature, titleFr: "x".repeat(5_001) }, "create"), null);
  assert.equal(parseLandingResourcePayload("features", { ...feature, titleEn: undefined }, "create"), null);
});

test("CMS patches are partial but cannot be empty or contain unknown fields", () => {
  assert.deepEqual(parseLandingResourcePayload("features", { isVisible: false }, "patch"), { isVisible: false });
  assert.equal(parseLandingResourcePayload("features", {}, "patch"), null);
  assert.equal(parseLandingResourcePayload("features", { isVisible: 0 }, "patch"), null);
  assert.equal(parseLandingResourcePayload("features", { isVisible: true, role: "admin" }, "patch"), null);
});

test("media paths reject encoded traversal segments", () => {
  const valid = {
    slug: "brand-mark",
    kind: "image",
    sourcePath: "brand.png",
    storagePath: "landing/admin/123.png",
    publicUrl: "/api/storage/public-objects/landing/admin/123.png",
    mimeType: "image/png",
  };
  assert.ok(parseLandingResourcePayload("media", valid, "create"));
  assert.equal(parseLandingResourcePayload("media", { ...valid, storagePath: "landing/%2e%2e/private.png" }, "create"), null);
  assert.equal(parseLandingResourcePayload("media", { ...valid, publicUrl: "/api/storage/public-objects/%2e%2e/private.png" }, "create"), null);
});

test("CMS content type is restricted to the supported values", () => {
  const valid = {
    contentKey: "app.download",
    locale: "fr",
    group: "download",
    contentType: "url",
    value: "https://example.org/app",
  };
  assert.equal(landingResourceSchemas.content.safeParse(valid).success, true);
  assert.equal(landingResourceSchemas.content.safeParse({ ...valid, contentType: "javascript" }).success, false);
  assert.equal(landingResourceSchemas.content.safeParse({ ...valid, value: "x".repeat(20_001) }).success, false);
});

test("country coordinates and colors are bounded before persistence", () => {
  const schema = landingResourceSchemas.countries;
  const validCountry = {
    code: "CI",
    nameFr: "Côte d'Ivoire",
    nameEn: "Côte d'Ivoire",
    flag: "🇨🇮",
    tone: "#f1f5f9",
    orderIndex: 1,
  };
  assert.equal(schema.safeParse(validCountry).success, true);
  assert.equal(schema.safeParse({ ...validCountry, heroPositionX: 101 }).success, false);
  assert.equal(schema.safeParse({ ...validCountry, tone: "url(javascript:alert(1))" }).success, false);
  assert.equal(landingResourceSchemas.operators.safeParse({
    slug: "operator",
    name: "Operator",
    background: "#1769ff",
    foreground: "#ffffff",
  }).success, true);
  assert.equal(landingResourceSchemas.operators.safeParse({
    slug: "operator",
    name: "Operator",
    background: "url(javascript:alert(1))",
    foreground: "#ffffff",
  }).success, false);
});

test("authentication and campaign fields reject malformed values and oversize input", () => {
  const login = {
    email: " ADMIN@example.com ",
    password: "a-strong-password",
    panelToken: "panel-token",
    panelEmail: "owner@example.com",
  };
  assert.equal(adminLoginSchema.safeParse(login).success, true);
  assert.equal(adminLoginSchema.safeParse({ ...login, extra: "unexpected" }).success, false);
  assert.equal(adminLoginSchema.safeParse({ ...login, password: "x".repeat(1_025) }).success, false);
  assert.equal(newsletterCampaignSchema.safeParse({
    subject: "Hello",
    previewText: "",
    bodyHtml: "<p>News</p>",
  }).success, true);
  assert.equal(newsletterCampaignSchema.safeParse({
    subject: "x".repeat(181),
    bodyHtml: "<p>News</p>",
  }).success, false);
});

test("association IDs must be positive integers, unique, and bounded", () => {
  assert.equal(countryOperatorAssignmentSchema.safeParse({ operatorIds: [1, 2] }).success, true);
  assert.equal(countryOperatorAssignmentSchema.safeParse({ operatorIds: ["1"] }).success, false);
  assert.equal(countryOperatorAssignmentSchema.safeParse({ operatorIds: [1, 1] }).success, false);
  assert.equal(countryOperatorAssignmentSchema.safeParse({ operatorIds: [-1] }).success, false);
});

test("image upload validates file signatures rather than trusting the MIME header", () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(imageBytesMatchMimeType("image/png", png), true);
  assert.equal(imageBytesMatchMimeType("image/jpeg", jpeg), true);
  assert.equal(imageBytesMatchMimeType("image/webp", webp), true);
  assert.equal(imageBytesMatchMimeType("image/png", jpeg), false);
  assert.equal(imageBytesMatchMimeType("image/svg+xml", new TextEncoder().encode("<svg/>")), false);
  assert.equal(mediaUploadHeadersSchema.safeParse({ name: "logo.webp", mimeType: "image/webp" }).success, true);
  assert.equal(mediaUploadHeadersSchema.safeParse({ name: "../logo.webp", mimeType: "image/webp" }).success, false);
  assert.equal(mediaUploadHeadersSchema.safeParse({ name: "logo.svg", mimeType: "image/svg+xml" }).success, false);
});
