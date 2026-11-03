import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultBuildRoot = path.join(repoRoot, "artifacts", "sendflow", "dist", "public");
const textExtensions = new Set([".html", ".js", ".mjs", ".cjs", ".css", ".json", ".svg", ".txt", ".xml", ".webmanifest"]);

const forbiddenPatterns = [
  {
    label: "server-only environment variable",
    pattern: /\b(?:NEON_DATABASE_URL|DATABASE_URL|RESEND_API_KEY|RESEND_FROM_EMAIL|SESSION_SECRET|RECAPTCHA_SECRET_KEY|ADMIN_PANEL_TOKEN|ADMIN_BOOTSTRAP_PASSWORD|STRIPE_SECRET_KEY|PRIVATE_API_KEY)\b/i,
  },
  {
    label: "private-key block",
    pattern: /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/i,
  },
  {
    label: "database connection URL with credentials",
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s/"'`]+:[^\s@"'`]+@/i,
  },
  {
    label: "Resend API token",
    pattern: /\bre_[A-Za-z0-9_-]{24,}\b/,
  },
  {
    label: "Stripe secret key",
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  },
  {
    label: "AWS access key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    label: "embedded source map",
    pattern: /sourceMappingURL\s*=/i,
  },
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  }));
  return nested.flat();
}

export async function scanFrontendBuild(buildRoot = defaultBuildRoot) {
  const root = path.resolve(buildRoot);
  const details = await stat(root).catch(() => null);
  if (!details?.isDirectory()) {
    throw new Error("Production frontend output directory is missing.");
  }

  const files = await listFiles(root);
  if (files.length === 0) throw new Error("Production frontend output directory is empty.");

  let scanned = 0;
  for (const filePath of files) {
    const relativePath = path.relative(root, filePath);
    if (path.extname(filePath).toLowerCase() === ".map") {
      throw new Error(`Source map is present in the production frontend: ${relativePath}`);
    }
    if (!textExtensions.has(path.extname(filePath).toLowerCase())) continue;

    const source = await readFile(filePath, "utf8");
    scanned += 1;
    for (const { label, pattern } of forbiddenPatterns) {
      if (pattern.test(source)) {
        throw new Error(`Found ${label} in production frontend file: ${relativePath}`);
      }
    }
  }

  if (scanned === 0) throw new Error("No readable production frontend files were scanned.");
  return { filesScanned: scanned };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await scanFrontendBuild(
      process.env.SENDFLOW_FRONTEND_BUILD_DIR ?? defaultBuildRoot,
    );
    console.log(
      `Frontend security check passed (${result.filesScanned} files scanned; no server-secret patterns or source maps found).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Frontend security check failed.");
    process.exitCode = 1;
  }
}
