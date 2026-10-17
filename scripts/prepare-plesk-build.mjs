import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDist = path.join(repoRoot, "artifacts", "api-server", "dist");
const outputDist = path.join(repoRoot, "dist");

await rm(outputDist, { recursive: true, force: true });
await mkdir(outputDist, { recursive: true });
// Keep Pino worker files alongside the server bundle.
await cp(sourceDist, outputDist, { recursive: true });
await writeFile(
  path.join(outputDist, "package.json"),
  `${JSON.stringify(
    {
      name: "sendflow-plesk-runtime",
      private: true,
      type: "commonjs",
      engines: { node: ">=20.19.0" },
      scripts: { start: "node ./index.cjs" },
    },
    null,
    2,
  )}\n`,
);
console.log(`Plesk build ready: ${path.relative(repoRoot, path.join(outputDist, "index.cjs"))}`);