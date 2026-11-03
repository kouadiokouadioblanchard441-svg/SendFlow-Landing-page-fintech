import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distRoot = path.resolve(
  process.env.PLESK_DIST_DIR ?? path.join(repoRoot, "dist"),
);
const publicRoot = path.join(distRoot, "public");
const distLabel = path.relative(repoRoot, distRoot) || ".";
const PLESK_STARTUP_FILE = "index.cjs";
const errors = [];

async function requireFile(relativePath) {
  const filePath = path.join(distRoot, relativePath);
  try {
    const details = await stat(filePath);
    if (!details.isFile() || details.size === 0) {
      errors.push(
        `Required build output is empty or not a file: ${path.join(distLabel, relativePath)}`,
      );
    }
    return filePath;
  } catch {
    errors.push(
      `Required build output is missing: ${path.join(distLabel, relativePath)}`,
    );
    return null;
  }
}

async function listFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    }),
  );
  return nested.flat();
}

function addLocalReference(references, sourcePath, rawReference) {
  const value = rawReference.trim();
  if (
    value === "" ||
    value.startsWith("#") ||
    /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)
  ) {
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]);
  } catch {
    errors.push(
      `Invalid encoded asset reference in ${path.relative(publicRoot, sourcePath)}: ${value}`,
    );
    return;
  }
  const resolved = path.resolve(
    pathname.startsWith("/") ? publicRoot : path.dirname(sourcePath),
    pathname.startsWith("/") ? `.${pathname}` : pathname,
  );
  const relative = path.relative(publicRoot, resolved);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    errors.push(
      `Asset reference escapes dist/public in ${path.relative(publicRoot, sourcePath)}: ${value}`,
    );
    return;
  }
  references.push({ resolved, sourcePath, value });
}

async function verifyRuntimePackage() {
  const runtimeManifestPath = await requireFile("package.json");
  if (!runtimeManifestPath) return;

  try {
    const manifest = JSON.parse(await readFile(runtimeManifestPath, "utf8"));
    if (
      manifest.type !== "commonjs" ||
      manifest.scripts?.start !== `node ./${PLESK_STARTUP_FILE}`
    ) {
      errors.push(
        `dist/package.json must be CommonJS and start with \`node ./${PLESK_STARTUP_FILE}\`.`,
      );
    }
    if (manifest.engines?.node !== ">=20.19.0") {
      errors.push(
        "dist/package.json must declare the supported Node.js runtime minimum.",
      );
    }
    if (
      manifest.packageManager ||
      manifest.scripts?.preinstall ||
      Object.keys(manifest.scripts ?? {}).some((name) => name !== "start") ||
      [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
      ].some((name) => manifest[name] && Object.keys(manifest[name]).length > 0)
    ) {
      errors.push(
        "dist/package.json must not trigger workspace installs or preinstall checks; the compiled Passenger runtime has no external package dependencies.",
      );
    }
  } catch (error) {
    errors.push(`Cannot parse dist/package.json: ${error.message}`);
  }
}

async function verifyNodeVersionSelection() {
  const runtimeVersionPath = await requireFile(".node-version");
  if (!runtimeVersionPath) return;

  const sourceVersionPath = path.join(repoRoot, ".node-version");
  const [runtimeVersion, sourceVersion] = await Promise.all([
    readFile(runtimeVersionPath, "utf8"),
    readFile(sourceVersionPath, "utf8"),
  ]);
  if (
    !/^(20|22|24|26)$/.test(sourceVersion.trim()) ||
    runtimeVersion.trim() !== sourceVersion.trim()
  ) {
    errors.push(
      "dist/.node-version must match the repository's supported Node major so nodenv can select the runtime from the Plesk Application Root.",
    );
  }
}

async function verifyRuntimeWorkspaceIsolation() {
  const workspacePath = await requireFile("pnpm-workspace.yaml");
  if (!workspacePath) return;

  if ((await readFile(workspacePath, "utf8")).trim() !== "packages: []") {
    errors.push(
      "dist/pnpm-workspace.yaml must declare an empty workspace so Plesk package installation cannot climb into the source monorepo.",
    );
  }
}

async function verifyPublicAssets() {
  const publicFiles = await listFiles(publicRoot);
  if (publicFiles.length === 0) {
    errors.push("dist/public is missing or empty.");
    return;
  }

  const assetFiles = await listFiles(path.join(publicRoot, "assets"));
  const javascriptFiles = assetFiles.filter((filePath) =>
    filePath.endsWith(".js"),
  );
  if (javascriptFiles.length < 2) {
    errors.push(
      "Expected split production JavaScript chunks under dist/public/assets.",
    );
  }

  for (const filePath of assetFiles) {
    if (filePath.endsWith(".map")) {
      errors.push(
        `Production source map should not be published: ${path.relative(distRoot, filePath)}`,
      );
    }
    if (filePath.endsWith(".js")) {
      const { size } = await stat(filePath);
      if (size > 500 * 1024) {
        errors.push(
          `JavaScript chunk exceeds Vite's 500 KiB warning threshold: ${path.relative(distRoot, filePath)} (${Math.ceil(size / 1024)} KiB).`,
        );
      }
    }
  }

  const seoRoutes = JSON.parse(
    await readFile(
      path.join(
        repoRoot,
        "artifacts",
        "sendflow",
        "src",
        "lib",
        "public-seo-routes.json",
      ),
      "utf8",
    ),
  );
  const routePaths = [
    "/",
    ...Object.values(seoRoutes).flatMap((group) => [
      group.fr.path,
      group.en.path,
    ]),
  ];
  for (const routePath of routePaths) {
    const routeFile = path.join(
      publicRoot,
      routePath.replace(/^\/+|\/+$/g, ""),
      "index.html",
    );
    try {
      await access(routeFile);
    } catch {
      errors.push(
        `Generated public route is missing: ${routePath} (expected ${path.relative(distRoot, routeFile)}).`,
      );
    }
  }

  const references = [];
  for (const htmlPath of publicFiles.filter((filePath) =>
    filePath.endsWith(".html"),
  )) {
    const html = await readFile(htmlPath, "utf8");
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
      addLocalReference(references, htmlPath, match[1]);
    }
  }
  for (const cssPath of assetFiles.filter((filePath) =>
    filePath.endsWith(".css"),
  )) {
    const css = await readFile(cssPath, "utf8");
    for (const match of css.matchAll(
      /url\(\s*(?:"([^"]+)"|'([^']+)'|([^'")]+))\s*\)/gi,
    )) {
      addLocalReference(references, cssPath, match[1] ?? match[2] ?? match[3]);
    }
  }
  for (const jsPath of javascriptFiles) {
    const javascript = await readFile(jsPath, "utf8");
    const imports =
      /\b(?:import|export)[^'"]*?\bfrom\s*["'](\.{1,2}\/[^"']+\.js)["']|\bimport\s*["'](\.{1,2}\/[^"']+\.js)["']|\bimport\(\s*["'](\.{1,2}\/[^"']+\.js)["']\s*\)/g;
    for (const match of javascript.matchAll(imports)) {
      addLocalReference(references, jsPath, match[1] ?? match[2] ?? match[3]);
    }
  }
  for (const reference of references) {
    try {
      await access(reference.resolved);
    } catch {
      errors.push(
        `Broken local asset reference in ${path.relative(publicRoot, reference.sourcePath)}: ${reference.value}`,
      );
    }
  }
}

async function verifyApacheFallback() {
  const htaccessPath = await requireFile("public/.htaccess");
  if (!htaccessPath) return;
  const htaccess = await readFile(htaccessPath, "utf8");
  const rules = new Set(htaccess.split(/\r?\n/));
  if (!/^RewriteRule \^api\(\/\|\$\) - \[L,NC\]$/m.test(htaccess)) {
    errors.push(
      `${distLabel}/public/.htaccess must explicitly leave /api requests for Passenger.`,
    );
  }
  if (!rules.has("RewriteRule ^panel/[^/]+/[^/]+/?$ /panel [R=302,L,NC]")) {
    errors.push(
      `${distLabel}/public/.htaccess must redirect retired credential-bearing admin paths to /panel.`,
    );
  }
  if (!/^RewriteRule \^ index\.html \[L\]$/m.test(htaccess)) {
    errors.push(
      `${distLabel}/public/.htaccess must route unknown public pages to index.html.`,
    );
  }
  if (/\(\?:|\(\?i\)/.test(htaccess)) {
    errors.push(
      `${distLabel}/public/.htaccess must use portable Apache rewrite and SetEnvIf patterns.`,
    );
  }
  const seoRoutes = JSON.parse(
    await readFile(
      path.join(
        repoRoot,
        "artifacts",
        "sendflow",
        "src",
        "lib",
        "public-seo-routes.json",
      ),
      "utf8",
    ),
  );
  for (const routePath of [
    ...new Set(
      Object.values(seoRoutes).flatMap((group) => [
        group.fr.path,
        group.en.path,
      ]),
    ),
  ]) {
    if (routePath === "/") continue;
    const relativePath = routePath.replace(/^\/+|\/+$/g, "");
    const rulePath = relativePath
      .split("/")
      .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("/");
    const expectedRule = `RewriteRule ^${rulePath}/?$ ${relativePath}/index.html [L]`;
    if (!rules.has(expectedRule)) {
      errors.push(
        `${distLabel}/public/.htaccess is missing direct routing for ${routePath}.`,
      );
    }
  }
}

try {
  const requiredFiles = [
    PLESK_STARTUP_FILE,
    "build-info.json",
    "pino-worker.cjs",
    "pino-file.cjs",
    "pino-pretty.cjs",
    "thread-stream-worker.cjs",
    "public/index.html",
    "public/robots.txt",
    "public/sitemap.xml",
  ];
  const outputs = await Promise.all(requiredFiles.map(requireFile));
  const serverBundle = outputs[0];
  if (serverBundle) {
    const syntaxCheck = spawnSync(process.execPath, ["--check", serverBundle], {
      encoding: "utf8",
    });
    if (syntaxCheck.status !== 0) {
      errors.push(
        `dist/index.cjs failed Node.js syntax validation: ${syntaxCheck.stderr.trim()}`,
      );
    }
  }
  await verifyRuntimePackage();
  await verifyNodeVersionSelection();
  await verifyRuntimeWorkspaceIsolation();
  await verifyPublicAssets();
  await verifyApacheFallback();

  if (errors.length > 0) {
    console.error("Plesk production build verification failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    const buildInfo = JSON.parse(
      await readFile(path.join(distRoot, "build-info.json"), "utf8"),
    );
    const assetCount = (await listFiles(path.join(publicRoot, "assets")))
      .length;
    console.log(
      `Plesk output verified: Passenger startup ${distLabel}/${PLESK_STARTUP_FILE}, Document Root ${distLabel}/public, ${assetCount} frontend assets, ${buildInfo.buildId ?? "no build ID"}.`,
    );
  }
} catch (error) {
  console.error(
    `Plesk production build verification could not complete: ${error.message}`,
  );
  process.exitCode = 1;
}
