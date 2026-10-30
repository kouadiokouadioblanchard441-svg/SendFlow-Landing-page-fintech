import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "dist");
const publicRoot = path.join(distRoot, "public");
const errors = [];

async function requireFile(relativePath) {
  const filePath = path.join(distRoot, relativePath);
  try {
    const details = await stat(filePath);
    if (!details.isFile() || details.size === 0) {
      errors.push(`Required build output is empty or not a file: dist/${relativePath}`);
    }
    return filePath;
  } catch {
    errors.push(`Required build output is missing: dist/${relativePath}`);
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
    errors.push(`Invalid encoded asset reference in ${path.relative(publicRoot, sourcePath)}: ${value}`);
    return;
  }
  const resolved = path.resolve(
    pathname.startsWith("/") ? publicRoot : path.dirname(sourcePath),
    pathname.startsWith("/") ? `.${pathname}` : pathname,
  );
  const relative = path.relative(publicRoot, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    errors.push(`Asset reference escapes dist/public in ${path.relative(publicRoot, sourcePath)}: ${value}`);
    return;
  }
  references.push({ resolved, sourcePath, value });
}

async function verifyRuntimePackage() {
  const runtimeManifestPath = await requireFile("package.json");
  if (!runtimeManifestPath) return;

  try {
    const manifest = JSON.parse(await readFile(runtimeManifestPath, "utf8"));
    if (manifest.type !== "commonjs" || manifest.scripts?.start !== "node ./index.cjs") {
      errors.push("dist/package.json must be CommonJS and start with `node ./index.cjs`.");
    }
    if (manifest.engines?.node !== ">=20.19.0") {
      errors.push("dist/package.json must declare the supported Node.js runtime minimum.");
    }
  } catch (error) {
    errors.push(`Cannot parse dist/package.json: ${error.message}`);
  }
}

async function verifyPublicAssets() {
  const publicFiles = await listFiles(publicRoot);
  if (publicFiles.length === 0) {
    errors.push("dist/public is missing or empty.");
    return;
  }

  const assetFiles = await listFiles(path.join(publicRoot, "assets"));
  const javascriptFiles = assetFiles.filter((filePath) => filePath.endsWith(".js"));
  if (javascriptFiles.length < 2) {
    errors.push("Expected split production JavaScript chunks under dist/public/assets.");
  }

  for (const filePath of assetFiles) {
    if (filePath.endsWith(".map")) {
      errors.push(`Production source map should not be published: ${path.relative(distRoot, filePath)}`);
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
      path.join(repoRoot, "artifacts", "sendflow", "src", "lib", "public-seo-routes.json"),
      "utf8",
    ),
  );
  const routePaths = [
    "/",
    ...Object.values(seoRoutes).flatMap((group) => [group.fr.path, group.en.path]),
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
      errors.push(`Generated public route is missing: ${routePath} (expected ${path.relative(distRoot, routeFile)}).`);
    }
  }

  const references = [];
  for (const htmlPath of publicFiles.filter((filePath) => filePath.endsWith(".html"))) {
    const html = await readFile(htmlPath, "utf8");
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
      addLocalReference(references, htmlPath, match[1]);
    }
  }
  for (const cssPath of assetFiles.filter((filePath) => filePath.endsWith(".css"))) {
    const css = await readFile(cssPath, "utf8");
    for (const match of css.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^'")]+))\s*\)/gi)) {
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
  if (!/^RewriteRule \^api\(\?:\/\|\$\) - \[L,NC\]$/m.test(htaccess)) {
    errors.push("dist/public/.htaccess must explicitly leave /api requests for Passenger.");
  }
  if (!/^RewriteCond %\{REQUEST_URI\} !\^\/api\(\/\|\$\) \[NC\]$/m.test(htaccess)) {
    errors.push("dist/public/.htaccess must exclude /api paths from the SPA HTML fallback.");
  }
}

try {
  const requiredFiles = [
    "index.cjs",
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
      errors.push(`dist/index.cjs failed Node.js syntax validation: ${syntaxCheck.stderr.trim()}`);
    }
  }
  await verifyRuntimePackage();
  await verifyPublicAssets();
  await verifyApacheFallback();

  if (errors.length > 0) {
    console.error("Plesk production build verification failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    const buildInfo = JSON.parse(await readFile(path.join(distRoot, "build-info.json"), "utf8"));
    const assetCount = (await listFiles(path.join(publicRoot, "assets"))).length;
    console.log(
      `Plesk output verified: dist/index.cjs, ${assetCount} frontend assets, ${buildInfo.buildId ?? "no build ID"}.`,
    );
  }
} catch (error) {
  console.error(`Plesk production build verification could not complete: ${error.message}`);
  process.exitCode = 1;
}
