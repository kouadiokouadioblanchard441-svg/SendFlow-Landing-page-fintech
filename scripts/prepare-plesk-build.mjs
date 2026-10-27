import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
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
const buildId = randomUUID();
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
    "RewriteCond %{REQUEST_URI} !^/api(/|$) [NC]",
    "RewriteCond %{REQUEST_FILENAME} !-f",
    "RewriteCond %{REQUEST_FILENAME} !-d",
    "RewriteRule ^ index.html [L]",
    "</IfModule>",
    "<IfModule mod_setenvif.c>",
    "SetEnvIf Request_URI \"(?i)^/panel/[^/]+/[^/]+/?$\" sendflow_legacy_panel",
    "</IfModule>",
    "<IfModule mod_headers.c>",
    "Header always set X-Content-Type-Options \"nosniff\"",
    "Header always set Referrer-Policy \"strict-origin-when-cross-origin\"",
    "Header always set X-Frame-Options \"DENY\"",
    "Header always set Content-Security-Policy \"frame-ancestors 'none'\"",
    "Header always set Permissions-Policy \"camera=(), microphone=(), geolocation=()\"",
    "Header always set Referrer-Policy \"no-referrer\" env=sendflow_legacy_panel",
    "Header always set Cache-Control \"no-store\" env=sendflow_legacy_panel",
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
const seoRouteGroups = Object.values(JSON.parse(await readFile(seoRoutesPath, "utf8")))
  .filter((group) => group?.fr?.path && group?.en?.path);
const seoOriginCandidate =
  process.env.VITE_PUBLIC_SITE_URL ??
  defaultRouteHtml.match(/<link rel="canonical" href="(https?:\/\/[^"]+)"/)?.[1];
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
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`)
    .replace(/<!--\s*sendflow-canonical\s*-->/g, "")
    .replace(/<!--\s*sendflow-hreflang\s*-->/g, "")
    .replace(/<link rel="canonical"[^>]*\/?>/gi, "")
    .replace(/<link rel="alternate" hreflang="[^"]+"[^>]*\/?>/gi, "");

  html = replaceMeta(html, "name", "description", route.description);
  html = replaceMeta(html, "property", "og:title", route.title);
  html = replaceMeta(html, "property", "og:description", route.description);
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
  html = html.replace("</head>", `${canonicalAndAlternates ? `    ${canonicalAndAlternates}\n  ` : ""}</head>`);

  const schemaPattern = /(<script id="sendflow-seo-schema" type="application\/ld\+json">)([\s\S]*?)(<\/script>)/i;
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

    const breadcrumbIndex = graph.findIndex((item) => item["@type"] === "BreadcrumbList");
    if (route.path !== "/" && route.path !== "/en/") {
      const breadcrumb = {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: route.name, item: canonicalUrl },
        ],
      };
      if (breadcrumbIndex >= 0) graph[breadcrumbIndex] = breadcrumb;
      else graph.push(breadcrumb);
    } else if (breadcrumbIndex >= 0) {
      graph.splice(breadcrumbIndex, 1);
    }

    schema["@graph"] = graph;
    const serializedSchema = JSON.stringify(schema, null, 2).replaceAll("<", "\\u003c");
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
      !routeHtml.includes(`name="description" content="${escapeHtml(route.description)}"`)
    ) {
      throw new Error(`Plesk route SEO metadata was not rendered correctly: ${route.path}`);
    }
    if (seoOrigin && !routeHtml.includes(`<link rel="canonical" href="${escapeHtml(new URL(route.path, seoOrigin).href)}" />`)) {
      throw new Error(`Plesk route canonical URL was not rendered correctly: ${route.path}`);
    }
    const targetPath = route.path === "/"
      ? publicIndexPath
      : path.join(routeDirectory, "index.html");
    await writeFile(targetPath, routeHtml);
  }
}

const requiredPublicRoutePaths = seoRouteGroups.flatMap((group) =>
  ["fr", "en"]
    .map((locale) => group[locale].path)
    .filter((routePath) => routePath !== "/"),
);
for (const routePath of requiredPublicRoutePaths) {
  const routeDirectory = path.join(
    outputDist,
    "public",
    routePath.replace(/^\/+|\/+$/g, ""),
  );
  const html = await readFile(path.join(routeDirectory, "index.html"), "utf8");
  if (!/<title>[^<]+<\/title>/.test(html) || !/<meta name="description" content="[^"]+"/.test(html)) {
    throw new Error(`Plesk route is missing SEO metadata: ${routePath}`);
  }
}
console.log(
  `Plesk build ready: ${path.relative(repoRoot, path.join(outputDist, "index.cjs"))} (build ID: ${buildId})`,
);