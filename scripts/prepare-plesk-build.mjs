import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDist = path.join(repoRoot, "artifacts", "api-server", "dist");
const outputDist = path.join(repoRoot, "dist");

await rm(outputDist, { recursive: true, force: true });
await mkdir(outputDist, { recursive: true });
// Keep source maps and Pino worker files alongside the server bundle too.
await cp(sourceDist, outputDist, { recursive: true });
console.log(`Plesk build ready: ${path.relative(repoRoot, path.join(outputDist, "index.cjs"))}`);