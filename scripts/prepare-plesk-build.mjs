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
await writeFile(
  path.join(outputDist, "public", ".htaccess"),
  [
    "<IfModule mod_rewrite.c>",
    "RewriteEngine On",
    "RewriteRule ^favicon\\.ico$ favicon.svg [L]",
    "RewriteCond %{REQUEST_URI} !^/api(/|$) [NC]",
    "RewriteCond %{REQUEST_FILENAME} !-f",
    "RewriteCond %{REQUEST_FILENAME} !-d",
    "RewriteRule ^ index.html [L]",
    "</IfModule>",
    "<IfModule mod_headers.c>",
    "Header always set X-Content-Type-Options \"nosniff\"",
    "Header always set Referrer-Policy \"strict-origin-when-cross-origin\"",
    "Header always set X-Frame-Options \"DENY\"",
    "Header always set Content-Security-Policy \"frame-ancestors 'none'\"",
    "</IfModule>",
    "",
  ].join("\n"),
);

const publicRoutePaths = [
  "download",
  "fonctionnalites",
  "securite",
  "a-propos",
  "conditions-utilisation",
  "confidentialite",
  "mentions-legales",
  "france-senegal",
  "en",
  "en/features",
  "en/security",
  "en/download",
  "en/about",
  "en/terms",
  "en/privacy",
  "en/legal-notice",
  "en/france-senegal",
];
const publicIndexPath = path.join(outputDist, "public", "index.html");
for (const routePath of publicRoutePaths) {
  const routeDirectory = path.join(outputDist, "public", routePath);
  await mkdir(routeDirectory, { recursive: true });
  await cp(publicIndexPath, path.join(routeDirectory, "index.html"));
}
console.log(`Plesk build ready: ${path.relative(repoRoot, path.join(outputDist, "index.cjs"))}`);