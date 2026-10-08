import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { normalizeSiteOrigin } from '../src/lib/site-origin.ts';

// Supply only the production URL confirmed by the publishing service.
const origin = normalizeSiteOrigin(process.argv.slice(2).find(arg => arg !== '--') || process.env.VITE_PUBLIC_SITE_URL);
if (!origin) {
  throw new Error('Fournissez le domaine publié vérifié : pnpm --filter @workspace/sendflow run seo:verify -- https://DOMAINE-PUBLIE');
}

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
await Promise.all(locations.map(async location => {
  assert.equal(new URL(location).origin, origin);
  await fetchPublic(new URL(location).pathname);
}));
const imageResponse = await fetchPublic('/sendflow-favicon.png');
assert.ok(imageResponse.headers.get('content-type')?.startsWith('image/'), 'Image Open Graph inaccessible');
console.log(`SEO statique vérifié sur ${origin} : canonique d’accueil, Open Graph, données structurées, robots.txt, sitemap et ${locations.length} pages accessibles.`);
console.log('Vérifiez aussi les canoniques des pages après exécution de JavaScript, avant Search Console.');

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}