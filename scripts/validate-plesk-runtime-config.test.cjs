"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { validatePleskRuntimeConfig } = require("./validate-plesk-runtime-config.cjs");

const projectRoot = path.resolve("/srv/sendflow");

test("accepts an absolute media directory outside the generated public site", () => {
  const result = validatePleskRuntimeConfig(
    { PLESK_MEDIA_DIR: "/var/lib/sendflow/media" },
    projectRoot,
  );

  assert.equal(result.mediaDirectory, "/var/lib/sendflow/media");
  assert.equal(result.publicDirectory, path.join(projectRoot, "dist", "public"));
});

test("uses WEB_DIST_DIR when it is configured", () => {
  const result = validatePleskRuntimeConfig(
    {
      PLESK_MEDIA_DIR: "/srv/sendflow/private-media",
      WEB_DIST_DIR: "/srv/sendflow/current/public",
    },
    projectRoot,
  );

  assert.equal(result.publicDirectory, "/srv/sendflow/current/public");
});

test("rejects missing, relative, and filesystem-root media directories", () => {
  assert.throws(
    () => validatePleskRuntimeConfig({}, projectRoot),
    /PLESK_MEDIA_DIR is required/,
  );
  assert.throws(
    () => validatePleskRuntimeConfig({ PLESK_MEDIA_DIR: "private/media" }, projectRoot),
    /absolute path/,
  );
  assert.throws(
    () => validatePleskRuntimeConfig({ PLESK_MEDIA_DIR: "/" }, projectRoot),
    /filesystem root/,
  );
});

test("rejects a media directory in or equal to the public document root", () => {
  const publicDirectory = path.join(projectRoot, "dist", "public");

  for (const mediaDirectory of [
    publicDirectory,
    path.join(publicDirectory, "uploads"),
  ]) {
    assert.throws(
      () => validatePleskRuntimeConfig({ PLESK_MEDIA_DIR: mediaDirectory }, projectRoot),
      /outside the public web directory/,
    );
  }
});

test("accepts a similarly named sibling directory outside the public root", () => {
  assert.doesNotThrow(() =>
    validatePleskRuntimeConfig(
      { PLESK_MEDIA_DIR: path.join(projectRoot, "dist", "public-media") },
      projectRoot,
    ),
  );
});
