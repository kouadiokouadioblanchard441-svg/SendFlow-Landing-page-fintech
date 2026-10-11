import { normalizeSiteOrigin } from '../src/lib/site-origin.ts';

export function absoluteSeoUrl(origin: string, value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) {
    throw new Error(`Chemin SEO invalide : ${value}`);
  }
  return new URL(value, origin).href;
}

/** Source files stay domain-independent; only compiled output gets the verified origin. */
export function renderSeoDocuments(
  siteUrl: string,
  sources: { html: string; sitemap: string; robots: string },
) {
  const origin = normalizeSiteOrigin(siteUrl);
  if (!origin) throw new Error('VITE_PUBLIC_SITE_URL est requis pour générer les URLs SEO absolues.');
  let html = sources.html.replace(
    /(<meta\s+(?:property="og:(?:url|image)"|name="twitter:image")\s+content=")([^"]+)(")/g,
    (_, prefix, value, suffix) => `${prefix}${absoluteSeoUrl(origin, value)}${suffix}`,
  );
  html = html.replace(
    /(<script id="sendflow-seo-schema" type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
    (_, open, json, close) => {
      const schema = JSON.parse(json, (_key, value) =>
        typeof value === 'string' && value.startsWith('/') ? absoluteSeoUrl(origin, value) : value,
      );
      return `${open}\n${JSON.stringify(schema, null, 2)}\n${close}`;
    },
  );
  html = html.replace('<!-- sendflow-canonical -->', `<link rel="canonical" href="${origin}/" />`);
  html = html.replace(
    '<!-- sendflow-hreflang -->',
    [
      `<link rel="alternate" hreflang="fr" href="${origin}/" />`,
      `<link rel="alternate" hreflang="en" href="${origin}/en/" />`,
      `<link rel="alternate" hreflang="x-default" href="${origin}/" />`,
    ].join('\n    '),
  );
  const sitemap = sources.sitemap.replace(/<loc>([^<]+)<\/loc>/g, (_, value) =>
    `<loc>${absoluteSeoUrl(origin, value.trim())}</loc>`,
  );
  const robots = sources.robots.replace(/^Sitemap:\s*.+$/m, `Sitemap: ${origin}/sitemap.xml`);
  return { html, sitemap, robots };
}