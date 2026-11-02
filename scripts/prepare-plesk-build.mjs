import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceDist = path.join(repoRoot, "artifacts", "api-server", "dist");
const buildId = randomUUID();
const outputDist = path.join(repoRoot, `.sendflow-dist-stage-${buildId}`);
const publishedDist = path.join(repoRoot, "dist");

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
  path.join(outputDist, ".node-version"),
  (await readFile(path.join(repoRoot, ".node-version"), "utf8")).trim() + "\n",
);
await writeFile(
  path.join(outputDist, "build-info.json"),
  `${JSON.stringify({ buildId }, null, 2)}\n`,
);
await writeFile(
  path.join(outputDist, "public", ".htaccess"),
  [
    "<IfModule mod_rewrite.c>",
    "RewriteEngine On",
    "RewriteRule ^favicon\\.ico$ favicon.svg [L]",
    "# Keep API requests for the Passenger application; never rewrite them to the SPA.",
    "RewriteRule ^api(?:/|$) - [L,NC]",
    "RewriteCond %{REQUEST_URI} !^/api(/|$) [NC]",
    "RewriteCond %{REQUEST_FILENAME} !-f",
    "RewriteCond %{REQUEST_FILENAME} !-d",
    "RewriteRule ^ index.html [L]",
    "</IfModule>",
    "<IfModule mod_setenvif.c>",
    'SetEnvIf Request_URI "(?i)^/panel/[^/]+/[^/]+/?$" sendflow_legacy_panel',
    "</IfModule>",
    "<IfModule mod_headers.c>",
    'Header always set X-Content-Type-Options "nosniff"',
    'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    'Header always set Referrer-Policy "strict-origin-when-cross-origin"',
    'Header always set X-Frame-Options "DENY"',
    "Header always set Content-Security-Policy \"frame-ancestors 'none'\"",
    'Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"',
    'Header always set Referrer-Policy "no-referrer" env=sendflow_legacy_panel',
    'Header always set Cache-Control "no-store" env=sendflow_legacy_panel',
    "</IfModule>",
    "",
  ].join("\n"),
);

const publicIndexPath = path.join(outputDist, "public", "index.html");
const defaultRouteHtml = await readFile(publicIndexPath, "utf8");
const seoRoutesPath = path.join(
  repoRoot,
  "artifacts",
  "sendflow",
  "src",
  "lib",
  "public-seo-routes.json",
);
const seoRouteGroups = Object.values(
  JSON.parse(await readFile(seoRoutesPath, "utf8")),
).filter((group) => group?.fr?.path && group?.en?.path);
const sitemapPath = path.join(repoRoot, "artifacts", "sendflow", "public", "sitemap.xml");
const sitemapSource = await readFile(sitemapPath, "utf8");
const sitemapPaths = new Set(
  [...sitemapSource.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, rawLocation]) => {
    const location = rawLocation.trim();
    try {
      return new URL(location).pathname;
    } catch {
      return location;
    }
  }),
);
for (const group of seoRouteGroups) {
  for (const locale of ["fr", "en"]) {
    if (!sitemapPaths.has(group[locale].path)) {
      throw new Error(
        `Plesk public route is missing from the sitemap: ${group[locale].path}.`,
      );
    }
  }
}
const seoOriginCandidate =
  process.env.VITE_PUBLIC_SITE_URL ??
  defaultRouteHtml.match(
    /<link rel="canonical" href="(https?:\/\/[^"]+)"/,
  )?.[1];
let seoOrigin = null;
try {
  const parsedOrigin = new URL(seoOriginCandidate);
  if (parsedOrigin.protocol === "https:") seoOrigin = parsedOrigin.origin;
} catch {
  // Local builds without a configured canonical origin still receive route-specific titles.
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const replaceMeta = (html, attribute, key, value) => {
  const pattern = new RegExp(
    `<meta(?=[^>]*\\b${attribute}="${escapeRegex(key)}")[^>]*>`,
    "i",
  );
  const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}" />`;
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
};

const renderRouteSeo = (sourceHtml, route, locale, group) => {
  const canonicalUrl = seoOrigin
    ? new URL(route.path, seoOrigin).href
    : route.path;
  const homePath = group.homePath ?? (locale === "fr" ? "/" : "/en/");
  const homeUrl = seoOrigin ? new URL(homePath, seoOrigin).href : homePath;
  let html = sourceHtml
    .replace(/<html lang="[^"]*">/i, `<html lang="${locale}">`)
    .replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(route.title)}</title>`,
    )
    .replace(/<!--\s*sendflow-canonical\s*-->/g, "")
    .replace(/<!--\s*sendflow-hreflang\s*-->/g, "")
    .replace(/<link rel="canonical"[^>]*\/?>/gi, "")
    .replace(/<link rel="alternate" hreflang="[^"]+"[^>]*\/?>/gi, "");

  html = replaceMeta(html, "name", "description", route.description);
  html = replaceMeta(html, "property", "og:title", route.title);
  html = replaceMeta(html, "property", "og:description", route.description);
  html = replaceMeta(
    html,
    "property",
    "og:locale",
    locale === "fr" ? "fr_FR" : "en_US",
  );
  html = replaceMeta(html, "name", "twitter:title", route.title);
  html = replaceMeta(html, "name", "twitter:description", route.description);
  if (seoOrigin) {
    html = replaceMeta(html, "property", "og:url", canonicalUrl);
  } else {
    html = html.replace(/<meta(?=[^>]*\bproperty="og:url")[^>]*>\s*/i, "");
  }

  const canonicalAndAlternates = seoOrigin
    ? [
        `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
        `<link rel="alternate" hreflang="fr" href="${escapeHtml(new URL(group.fr.path, seoOrigin).href)}" />`,
        `<link rel="alternate" hreflang="en" href="${escapeHtml(new URL(group.en.path, seoOrigin).href)}" />`,
        `<link rel="alternate" hreflang="x-default" href="${escapeHtml(new URL(group.fr.path, seoOrigin).href)}" />`,
      ].join("\n    ")
    : "";
  html = html.replace(
    "</head>",
    `${canonicalAndAlternates ? `    ${canonicalAndAlternates}\n  ` : ""}</head>`,
  );

  const schemaPattern =
    /(<script id="sendflow-seo-schema" type="application\/ld\+json">)([\s\S]*?)(<\/script>)/i;
  const schemaMatch = html.match(schemaPattern);
  if (schemaMatch) {
    const schema = JSON.parse(schemaMatch[2]);
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    const siteUrl = seoOrigin ? new URL("/", seoOrigin).href : "/";
    const organizationId = `${siteUrl}#organization`;
    const websiteId = `${siteUrl}#website`;
    const organization = graph.find((item) => item["@type"] === "Organization");
    const website = graph.find((item) => item["@type"] === "WebSite");
    const webpage = graph.find((item) => item["@type"] === "WebPage");
    if (organization) {
      organization["@id"] = organizationId;
      organization.url = siteUrl;
    }
    if (website) {
      website["@id"] = websiteId;
      website.url = siteUrl;
      website.inLanguage = locale;
    }
    if (webpage) {
      webpage["@id"] = `${canonicalUrl}#webpage`;
      webpage.name = route.title;
      webpage.description = route.description;
      webpage.url = canonicalUrl;
      webpage.inLanguage = locale;
      webpage.isPartOf = { "@id": websiteId };
    }

    const serviceIndex = graph.findIndex((item) => item["@type"] === "Service");
    if (route.service) {
      const service = {
        "@type": "Service",
        "@id": `${canonicalUrl}#service`,
        name: route.service.name,
        serviceType: route.service.serviceType,
        url: canonicalUrl,
        provider: { "@id": organizationId },
      };
      if (serviceIndex >= 0) graph[serviceIndex] = service;
      else graph.push(service);
    } else if (serviceIndex >= 0) {
      graph.splice(serviceIndex, 1);
    }

    const breadcrumbIndex = graph.findIndex(
      (item) => item["@type"] === "BreadcrumbList",
    );
    if (route.path !== "/" && route.path !== "/en/") {
      const breadcrumb = {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: locale === "fr" ? "Accueil" : "Home",
            item: homeUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: route.name,
            item: canonicalUrl,
          },
        ],
      };
      if (breadcrumbIndex >= 0) graph[breadcrumbIndex] = breadcrumb;
      else graph.push(breadcrumb);
    } else if (breadcrumbIndex >= 0) {
      graph.splice(breadcrumbIndex, 1);
    }

    schema["@graph"] = graph;
    const serializedSchema = JSON.stringify(schema, null, 2).replaceAll(
      "<",
      "\\u003c",
    );
    html = html.replace(schemaPattern, `$1\n      ${serializedSchema}\n    $3`);
  }

  return html;
};

for (const group of seoRouteGroups) {
  for (const locale of ["fr", "en"]) {
    const route = {
      ...group[locale],
      service: group.service?.[locale],
    };
    const routeDirectory = path.join(
      outputDist,
      "public",
      route.path.replace(/^\/+|\/+$/g, ""),
    );
    if (route.path !== "/") await mkdir(routeDirectory, { recursive: true });
    const routeHtml = renderRouteSeo(defaultRouteHtml, route, locale, group);
    if (
      !routeHtml.includes(`<title>${escapeHtml(route.title)}</title>`) ||
      !routeHtml.includes(
        `name="description" content="${escapeHtml(route.description)}"`,
      )
    ) {
      throw new Error(
        `Plesk route SEO metadata was not rendered correctly: ${route.path}`,
      );
    }
    if (
      seoOrigin &&
      !routeHtml.includes(
        `<link rel="canonical" href="${escapeHtml(new URL(route.path, seoOrigin).href)}" />`,
      )
    ) {
      throw new Error(
        `Plesk route canonical URL was not rendered correctly: ${route.path}`,
      );
    }
    if (seoOrigin) {
      for (const [alternateLocale, alternatePath] of [
        ["fr", group.fr.path],
        ["en", group.en.path],
        ["x-default", group.fr.path],
      ]) {
        const alternateUrl = escapeHtml(new URL(alternatePath, seoOrigin).href);
        if (
          !routeHtml.includes(
            `<link rel="alternate" hreflang="${alternateLocale}" href="${alternateUrl}" />`,
          )
        ) {
          throw new Error(
            `Plesk route language alternate was not rendered correctly: ${route.path} (${alternateLocale}).`,
          );
        }
      }
    }
    const targetPath =
      route.path === "/"
        ? publicIndexPath
        : path.join(routeDirectory, "index.html");
    await writeFile(targetPath, routeHtml);
  }
}

const readMetaContent = (html, attribute, key) => {
  const match = html.match(
    new RegExp(
      `<meta(?=[^>]*\\b${attribute}="${escapeRegex(key)}")[^>]*\\bcontent="([^"]*)"[^>]*>`,
      "i",
    ),
  );
  return match?.[1];
};
for (const group of seoRouteGroups) {
  for (const locale of ["fr", "en"]) {
    const route = {
      ...group[locale],
      service: group.service?.[locale],
    };
    const htmlPath = path.join(
      outputDist,
      "public",
      route.path.replace(/^\/+|\/+$/g, ""),
      "index.html",
    );
    const html = await readFile(
      route.path === "/" ? publicIndexPath : htmlPath,
      "utf8",
    );
    const expectedLocale = locale === "fr" ? "fr_FR" : "en_US";
    const expectedUrl = seoOrigin ? new URL(route.path, seoOrigin).href : route.path;
    const expectedMeta = [
      ["name", "description", route.description],
      ["property", "og:title", route.title],
      ["property", "og:description", route.description],
      ["property", "og:locale", expectedLocale],
      ["name", "twitter:title", route.title],
      ["name", "twitter:description", route.description],
    ];
    for (const [attribute, key, expected] of expectedMeta) {
      if (readMetaContent(html, attribute, key) !== escapeHtml(expected)) {
        throw new Error(
          `Plesk route ${key} is inconsistent for ${route.path} (${locale}).`,
        );
      }
    }
    if (
      !html.includes(`<html lang="${locale}">`) ||
      !html.includes(`<title>${escapeHtml(route.title)}</title>`)
    ) {
      throw new Error(
        `Plesk route title or document language is inconsistent: ${route.path} (${locale}).`,
      );
    }
    if (
      seoOrigin &&
      (readMetaContent(html, "property", "og:url") !== escapeHtml(expectedUrl) ||
        !html.includes(
          `<link rel="canonical" href="${escapeHtml(expectedUrl)}" />`,
        ))
    ) {
      throw new Error(
        `Plesk route social or canonical URL is inconsistent: ${route.path}.`,
      );
    }

    const schemaMatch = html.match(
      /<script id="sendflow-seo-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/i,
    );
    if (!schemaMatch) {
      throw new Error(`Plesk route is missing structured data: ${route.path}.`);
    }
    const graph = JSON.parse(schemaMatch[1])["@graph"];
    const webpage = graph.find((item) => item["@type"] === "WebPage");
    const website = graph.find((item) => item["@type"] === "WebSite");
    const service = graph.find((item) => item["@type"] === "Service");
    const breadcrumb = graph.find((item) => item["@type"] === "BreadcrumbList");
    const homePath = group.homePath ?? (locale === "fr" ? "/" : "/en/");
    const homeUrl = seoOrigin ? new URL(homePath, seoOrigin).href : homePath;
    if (
      webpage?.name !== route.title ||
      webpage?.description !== route.description ||
      webpage?.url !== expectedUrl ||
      webpage?.["@id"] !== `${expectedUrl}#webpage` ||
      webpage?.inLanguage !== locale ||
      website?.inLanguage !== locale ||
      website?.["@id"] !== `${seoOrigin ? new URL("/", seoOrigin).href : "/"}#website`
    ) {
      throw new Error(
        `Plesk route structured data is inconsistent: ${route.path} (${locale}).`,
      );
    }
    if (route.path === "/" || route.path === "/en/") {
      if (breadcrumb) {
        throw new Error(
          `Plesk home route should not have breadcrumb data: ${route.path}.`,
        );
      }
    } else {
      const items = breadcrumb?.itemListElement ?? [];
      if (
        items.length !== 2 ||
        items[0].name !== (locale === "fr" ? "Accueil" : "Home") ||
        items[0].item !== homeUrl ||
        items[1].name !== route.name ||
        items[1].item !== expectedUrl
      ) {
        throw new Error(
          `Plesk route breadcrumb data is inconsistent: ${route.path} (${locale}).`,
        );
      }
    }
    if (
      (route.service &&
        (service?.name !== route.service.name ||
          service?.serviceType !== route.service.serviceType ||
          service?.url !== expectedUrl)) ||
      (!route.service && service)
    ) {
      throw new Error(
        `Plesk route service data is inconsistent: ${route.path} (${locale}).`,
      );
    }
  }
}

const verification = spawnSync(
  process.execPath,
  [path.join(repoRoot, "scripts", "verify-plesk-build.mjs")],
  {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, PLESK_DIST_DIR: outputDist },
  },
);
if (verification.stdout) process.stdout.write(verification.stdout);
if (verification.stderr) process.stderr.write(verification.stderr);
if (verification.error) {
  throw new Error(
    `Could not verify staged Plesk build: ${verification.error.message}`,
  );
}
if (verification.status !== 0) {
  throw new Error(
    `Staged Plesk build verification failed with status ${verification.status}.`,
  );
}

const previousDist = path.join(repoRoot, `.sendflow-dist-backup-${buildId}`);
let previousDistMoved = false;
try {
  await rename(publishedDist, previousDist);
  previousDistMoved = true;
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

try {
  await rename(outputDist, publishedDist);
} catch (error) {
  if (previousDistMoved) {
    await rename(previousDist, publishedDist);
  }
  throw error;
}

if (previousDistMoved) {
  await rm(previousDist, { recursive: true, force: true });
}

console.log(
  `Plesk build ready: ${path.relative(repoRoot, path.join(publishedDist, "index.cjs"))} (build ID: ${buildId})`,
);
