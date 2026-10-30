import { access, mkdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "dist");
const outputDirectory = path.join(repoRoot, "generated-artifacts");
const buildInfoPath = path.join(distRoot, "build-info.json");

function runTar(args) {
  const result = spawnSync("tar", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`Could not run tar: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `tar exited with status ${result.status}`);
  }
  return result.stdout;
}

async function requireNonEmptyFile(relativePath) {
  const filePath = path.join(distRoot, relativePath);
  const details = await stat(filePath).catch(() => null);
  if (!details?.isFile() || details.size === 0) {
    throw new Error(`Required Plesk release file is missing or empty: dist/${relativePath}`);
  }
}

async function verifyArchive(archivePath, expectedBuildId) {
  const listing = runTar(["-tzf", archivePath]);
  const entries = listing.split(/\r?\n/).filter(Boolean);
  const requiredEntries = [
    "dist/index.cjs",
    "dist/package.json",
    "dist/build-info.json",
    "dist/public/index.html",
    "dist/public/.htaccess",
  ];

  for (const requiredEntry of requiredEntries) {
    if (!entries.includes(requiredEntry)) {
      throw new Error(`Plesk release archive is missing ${requiredEntry}`);
    }
  }
  for (const entry of entries) {
    if (
      entry.startsWith("/") ||
      entry.split("/").includes("..") ||
      /(^|\/)\.env(?:\.|$)/i.test(entry) ||
      /(^|\/)(?:\.git|node_modules)(?:\/|$)/i.test(entry)
    ) {
      throw new Error(`Unexpected private or unsafe path in Plesk release archive: ${entry}`);
    }
  }

  const archivedBuildInfo = JSON.parse(
    runTar(["-xOf", archivePath, "dist/build-info.json"]),
  );
  if (archivedBuildInfo.buildId !== expectedBuildId) {
    throw new Error("Plesk release archive build ID does not match the current dist build.");
  }
}

const buildInfo = JSON.parse(await readFile(buildInfoPath, "utf8"));
if (
  typeof buildInfo.buildId !== "string" ||
  !/^[A-Za-z0-9-]{1,80}$/.test(buildInfo.buildId)
) {
  throw new Error("dist/build-info.json must contain a safe, non-empty buildId.");
}

for (const relativePath of [
  "index.cjs",
  "package.json",
  "build-info.json",
  "pino-worker.cjs",
  "pino-file.cjs",
  "pino-pretty.cjs",
  "thread-stream-worker.cjs",
  "public/index.html",
  "public/.htaccess",
]) {
  await requireNonEmptyFile(relativePath);
}

await mkdir(outputDirectory, { recursive: true });
const archiveName = `sendflow-plesk-${buildInfo.buildId}.tar.gz`;
const archivePath = path.join(outputDirectory, archiveName);

try {
  await access(archivePath);
  await verifyArchive(archivePath, buildInfo.buildId);
  console.log(
    `Plesk release archive already exists and is valid: ${path.relative(repoRoot, archivePath)}`,
  );
} catch (error) {
  if (error?.code !== "ENOENT") throw error;

  runTar(["-czf", archivePath, "-C", repoRoot, "dist"]);
  await verifyArchive(archivePath, buildInfo.buildId);
  console.log(
    `Plesk release package created: ${path.relative(repoRoot, archivePath)} (build ID: ${buildInfo.buildId})`,
  );
}
