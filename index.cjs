const fs = require("node:fs");
const path = require("node:path");

const builtServer = path.join(__dirname, "dist", "index.cjs");

if (!fs.existsSync(builtServer)) {
  console.error(
    "SendFlow production build is missing. Run `pnpm run deploy:plesk` before starting the application.",
  );
  process.exit(1);
}

process.chdir(path.dirname(builtServer));
require(builtServer);
