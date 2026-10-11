import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import { normalizeSiteOrigin } from '../src/lib/site-origin.ts';
import { absoluteSeoUrl, renderSeoDocuments } from './seo-documents.ts';
import { getLocaleFromPath, getLocalizedAlternates, getLocalizedPath } from '../src/lib/localized-routes.ts';

const root = new URL('../', import.meta.url);
const [html, sitemap, robots] = await Promise.all(
  ['index.html', 'public/sitemap.xml', 'public/robots.txt'].map(file =>
    fs.readFile(new URL(file, root), 'utf8'),
  ),
);
// Reserved example domain used only in tests, never configured for the application.
const origin = 'https://sendflow.example';

test('a single normalized public HTTPS origin controls all SEO output', () => {
  assert.equal(normalizeSiteOrigin(`  ${origin}/  `), origin);
  assert.equal(normalizeSiteOrigin(''), undefined);
  const rendered = renderSeoDocuments(origin, { html, sitemap, robots });
  const locations = [...rendered.sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(locations.length, 18);
  assert.deepEqual(locations, [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(match => `${origin}${match[1]}`));
  assert.ok(rendered.robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  assert.ok(rendered.robots.includes('Disallow: /panel/'));
  assert.ok(rendered.html.includes(`<link rel="canonical" href="${origin}/" />`));
  assert.ok(rendered.html.includes(`<link rel="alternate" hreflang="fr" href="${origin}/" />`));
  assert.ok(rendered.html.includes(`<link rel="alternate" hreflang="en" href="${origin}/en/" />`));
  assert.ok(rendered.html.includes(`property="og:url" content="${origin}/"`));
  assert.ok(rendered.html.includes(`property="og:image" content="${origin}/sendflow-favicon.png"`));
  assert.ok(rendered.html.includes(`name="twitter:image" content="${origin}/sendflow-favicon.png"`));
  const schema = JSON.parse(rendered.html.match(/application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
  assert.equal(schema['@graph'][0]['@id'], `${origin}/#organization`);
  assert.equal(schema['@graph'][0].logo, `${origin}/sendflow-favicon.png`);
  assert.equal(schema['@graph'].find((item: { '@type': string }) => item['@type'] === 'WebPage').url, `${origin}/`);
  assert.equal(schema['@context'], 'https://schema.org');
});

test('public routes have stable reciprocal French and English URLs', () => {
  assert.equal(getLocaleFromPath('/en/features'), 'en');
  assert.equal(getLocalizedPath('/fonctionnalites', 'en'), '/en/features');
  assert.equal(getLocalizedPath('/en/features', 'fr'), '/fonctionnalites');
  assert.deepEqual(getLocalizedAlternates('/en/'), { fr: '/', en: '/en/' });
  assert.deepEqual(getLocalizedAlternates('/france-senegal'), {
    fr: '/france-senegal',
    en: '/en/france-senegal',
  });
});

test('missing or invalid origins fail explicitly', () => {
  for (const url of [
    'http://sendflow.example', 'not-a-url', 'https://localhost',
    'https://127.0.0.1', 'https://preview.replit.dev', 'https://site.example/path',
    'https://site.example?query=1', 'https://site.example#fragment',
    'https://user:password@site.example', 'https://site.example:5000',
    'https://dev.local', 'https://dev.localhost',
  ]) assert.throws(() => normalizeSiteOrigin(url), /VITE_PUBLIC_SITE_URL/);
  assert.throws(() => renderSeoDocuments('', { html, sitemap, robots }), /VITE_PUBLIC_SITE_URL/);
  assert.throws(() => absoluteSeoUrl(origin, '//another.example'), /invalide/);
});