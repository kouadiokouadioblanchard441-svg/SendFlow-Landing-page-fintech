import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appSource = await readFile(
  fileURLToPath(new URL("../src/App.tsx", import.meta.url)),
  "utf8",
);

test("admin credentials are not extracted from URLs or persisted by the client", () => {
  assert.doesNotMatch(appSource, /takePanelCredentialsFromUrl|initialPanelCredentials/);
  assert.doesNotMatch(appSource, /\/api\/admin\/auth\/panel\/verify/);
  assert.doesNotMatch(appSource, /localStorage|sessionStorage/);
});

test("admin login collects the private access values in form state and posts them", () => {
  assert.match(appSource, /const \[panelToken, setPanelToken\] = useState\(''\)/);
  assert.match(appSource, /const \[panelEmail, setPanelEmail\] = useState\(''\)/);
  assert.match(appSource, /JSON\.stringify\(\{ email, password, panelToken, panelEmail \}\)/);
  assert.match(appSource, /autoComplete="off"/);
});
