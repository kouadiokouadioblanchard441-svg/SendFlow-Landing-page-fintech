import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { normalizeSiteOrigin } from '../src/lib/site-origin.ts';

type PublicSeoRoute = {
  path: string;
  name: string;
  title: string;
  description: string;
};
type PublicSeoRouteGroup = {
  fr: PublicSeoRoute;
  en: PublicSeoRoute;
};

// Supply only the production URL confirmed by the publishing service.
const origin = normalizeSiteOrigin(process.argv.slice(2).find(arg => arg !== '--') || process.env.VITE_PUBLIC_SITE_URL);
if (!origin) {
  throw new Error('Fournissez le domaine publié vérifié : pnpm --filter @workspace/sendflow run seo:verify -- https://DOMAINE-PUBLIE');
}

const routeConfig = JSON.parse(
  await fs.readFile(new URL('../src/lib/public-seo-routes.json', import.meta.url), 'utf8'),
) as Record<string, PublicSeoRouteGroup>;
const routeGroups = Object.values(routeConfig);
const routes = routeGroups.flatMap(group => [
  {
    ...group.fr,
    locale: 'fr',
    alternates: { fr: group.fr.path, en: group.en.path, 'x-default': group.fr.path },
  },
  {
    ...group.en,
    locale: 'en',
    alternates: { fr: group.fr.path, en: group.en.path, 'x-default': group.fr.path },
  },
]);

async function fetchPublic(path: string) {
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${path} doit répondre HTTP 200`);
  assert.equal(new URL(response.url).origin, origin, `${path} redirige vers un autre domaine`);
  return response;
}

const [home, robots, sitemap] = await Promise.all(
  ['/', '/robots.txt', '/sitemap.xml'].map(async path => (await fetchPublic(path)).text()),
);
assert.match(home, new RegExp(`<link\\s+rel="canonical"\\s+href="${escapeRegex(origin)}/"`), 'Canonique absolue manquante dans le HTML');
assert.match(home, new RegExp(`property="og:url"\\s+content="${escapeRegex(origin)}/"`), 'og:url doit utiliser le domaine public');
const image = home.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
assert.equal(image, `${origin}/sendflow-favicon.png`, 'og:image doit être absolue');
assert.match(home, new RegExp(`name="twitter:image"\\s+content="${escapeRegex(origin)}/sendflow-favicon\\.png"`));
const schema = JSON.parse(home.match(/application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? 'null');
assert.equal(schema?.['@graph']?.[0]?.url, `${origin}/`, 'URL de l’organisation incorrecte');
assert.ok(robots.split(/\r?\n/).includes(`Sitemap: ${origin}/sitemap.xml`), 'Ligne Sitemap absolue manquante');
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const template = await fs.readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const expected = [...template.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => `${origin}${match[1]}`);
assert.deepEqual(locations, expected, 'Le sitemap doit contenir toutes les pages publiques avec des URLs absolues');
assert.equal(new Set(locations).size, locations.length, 'Le sitemap ne doit contenir aucune URL en double');
assert.deepEqual(
  [...locations.map(location => new URL(location).pathname)].sort(),
  [...routes.map(route => route.path)].sort(),
  'Le sitemap doit contenir exactement toutes les routes publiques configurées',
);

await Promise.all(routes.map(async route => {
  const response = await fetchPublic(route.path);
  assert.ok(
    response.headers.get('content-type')?.includes('text/html'),
    `${route.path} doit servir une page HTML`,
  );
  const html = await response.text();
  const canonicalUrl = `${origin}${route.path}`;
  assert.ok(html.includes(`<title>${escapeHtml(route.title)}</title>`), `${route.path} a un titre incorrect`);
  assert.equal(
    readMetaContent(html, 'name', 'description'),
    escapeHtml(route.description),
    `${route.path} a une description incorrecte`,
  );
  assert.equal(
    readMetaContent(html, 'name', 'robots'),
    'index, follow',
    `${route.path} doit autoriser l’indexation`,
  );
  assert.equal(
    readMetaContent(html, 'property', 'og:title'),
    escapeHtml(route.title),
    `${route.path} a un titre Open Graph incorrect`,
  );
  assert.equal(
    readMetaContent(html, 'property', 'og:url'),
    escapeHtml(canonicalUrl),
    `${route.path} a une URL Open Graph incorrecte`,
  );
  assert.equal(
    readLinkHref(html, 'canonical'),
    canonicalUrl,
    `${route.path} doit se déclarer canonique`,
  );
  for (const [locale, path] of Object.entries(route.alternates)) {
    assert.equal(
      readLinkHref(html, 'alternate', locale),
      `${origin}${path}`,
      `${route.path} a un lien hreflang ${locale} incorrect`,
    );
  }
  const fallback = `<noscript data-sendflow-seo-fallback="true"><main class="sf-seo-noscript"><h1>${escapeHtml(route.name)}</h1><p>${escapeHtml(route.description)}</p></main></noscript>`;
  assert.ok(html.includes(fallback), `${route.path} doit avoir un contenu de secours lisible sans JavaScript`);
}));
const imageResponse = await fetchPublic('/sendflow-favicon.png');
assert.ok(imageResponse.headers.get('content-type')?.startsWith('image/'), 'Image Open Graph inaccessible');
console.log(`SEO vérifié sur ${origin} : robots.txt, sitemap et ${routes.length} routes avec titres, descriptions, canoniques, hreflang et fallback sans JavaScript.`);
console.log('La présence dans Google doit ensuite être confirmée dans Search Console.');

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function readMetaContent(html: string, attribute: string, key: string) {
  const match = html.match(
    new RegExp(
      `<meta(?=[^>]*\\b${attribute}="${escapeRegex(key)}")[^>]*\\bcontent="([^"]*)"[^>]*>`,
      'i',
    ),
  );
  return match?.[1];
}

function readLinkHref(html: string, rel: string, hreflang?: string) {
  const linkPattern = hreflang
    ? new RegExp(
      `<link(?=[^>]*\\brel="alternate")(?=[^>]*\\bhreflang="${escapeRegex(hreflang)}")[^>]*\\bhref="([^"]*)"[^>]*>`,
      'i',
    )
    : new RegExp(
      `<link(?=[^>]*\\brel="${escapeRegex(rel)}")[^>]*\\bhref="([^"]*)"[^>]*>`,
      'i',
    );
  return html.match(linkPattern)?.[1];
}

function readMetaContent(html: string, attribute: string, key: string) {
  const match = html.match(
    new RegExp(
      `<meta(?=[^>]*\\b${attribute}="${escapeRegex(key)}")[^>]*\\bcontent="([^"]*)"[^>]*>`,
      'i',
    ),
  );
  return match?.[1];
}

function readLinkHref(html: string, rel: string, hreflang?: string) {
  const linkPattern = hreflang
    ? new RegExp(
      `<link(?=[^>]*\\brel="alternate")(?=[^>]*\\bhreflang="${escapeRegex(hreflang)}")[^>]*\\bhref="([^"]*)"[^>]*>`,
      'i',
    )
    : new RegExp(
      `<link(?=[^>]*\\brel="${escapeRegex(rel)}")[^>]*\\bhref="([^"]*)"[^>]*>`,
      'i',
    );
  return html.match(linkPattern)?.[1];
}