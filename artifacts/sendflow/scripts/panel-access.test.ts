import assert from "node:assert/strict";
import test from "node:test";
import { takePanelCredentialsFromUrl } from "../src/lib/panelAccess.ts";

test("private credentials in the fragment are captured and immediately removed from the URL", () => {
  const result = takePanelCredentialsFromUrl(
    new URL("https://sendflow.example/base/panel?tracking=1#token=private-token&email=admin%40example.com"),
  );

  assert.deepEqual(result.credentials, { token: "private-token", email: "admin@example.com" });
  assert.equal(result.sanitizedUrl, "https://sendflow.example/base/panel");
});

test("legacy path credentials are captured for compatibility and canonicalized", () => {
  const result = takePanelCredentialsFromUrl(
    new URL("https://sendflow.example/panel/private-token/admin%40example.com?x=1"),
  );

  assert.deepEqual(result.credentials, { token: "private-token", email: "admin@example.com" });
  assert.equal(result.sanitizedUrl, "https://sendflow.example/panel");
});

test("ordinary public URLs are unchanged", () => {
  const url = new URL("https://sendflow.example/fonctionnalites?source=home");
  const result = takePanelCredentialsFromUrl(url);

  assert.equal(result.credentials, null);
  assert.equal(result.sanitizedUrl, url.href);
});
