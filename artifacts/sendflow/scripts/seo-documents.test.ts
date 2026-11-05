import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import { normalizeSiteOrigin } from '../src/lib/site-origin.ts';
import { absoluteSeoUrl, renderSeoDocuments } from './seo-documents.ts';
import { getLocaleFromPath, getLocalizedAlternates, getLocalizedPath } from '../src/lib/localized-routes.ts';

const root = new URL('../', import.meta.url);
const [html, sitemap, robots, routeSeoJson, viteConfig, seoSource, pricingPageSource, appSource, feeCardsSource, feeLogosSource, developerApiPageSource, landingVisibilitySource, apiSpec] = await Promise.all(
  [
    'index.html',
    'public/sitemap.xml',
    'public/robots.txt',
    'src/lib/public-seo-routes.json',
    'vite.config.ts',
    'src/lib/seo.ts',
    'src/pages/pricing.tsx',
    'src/App.tsx',
    'src/components/OperatorFeesSection.tsx',
    'src/lib/operator-fee-logos.ts',
    'src/pages/developer-api.tsx',
    '../api-server/src/lib/landingVisibility.ts',
    '../../lib/api-spec/openapi.yaml',
  ].map((file) => fs.readFile(new URL(file, root), 'utf8')),
);
const publicSeoRoutes = JSON.parse(routeSeoJson);
// Reserved example domain used only in tests, never configured for the application.
const origin = 'https://sendflow.example';

test('a single normalized public HTTPS origin controls all SEO output', () => {
  assert.equal(normalizeSiteOrigin(`  ${origin}/  `), origin);
  assert.equal(normalizeSiteOrigin(''), undefined);
  const rendered = renderSeoDocuments(origin, { html, sitemap, robots });
  const locations = [...rendered.sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(locations.length, 22);
  assert.deepEqual(locations, [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(match => `${origin}${match[1]}`));
  assert.ok(rendered.robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  assert.ok(rendered.robots.includes('Disallow: /panel/'));
  assert.ok(rendered.html.includes(`<link rel="canonical" href="${origin}/" />`));
  assert.ok(rendered.html.includes(`<link rel="alternate" hreflang="fr" href="${origin}/" />`));
  assert.ok(rendered.html.includes(`<link rel="alternate" hreflang="en" href="${origin}/en" />`));
  assert.ok(rendered.html.includes(`property="og:url" content="${origin}/"`));
  assert.ok(rendered.html.includes(`property="og:image" content="${origin}/sendflow-favicon.png"`));
  assert.ok(rendered.html.includes(`name="twitter:image" content="${origin}/sendflow-favicon.png"`));
  const schema = JSON.parse(rendered.html.match(/application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
  assert.equal(schema['@graph'][0]['@id'], `${origin}/#organization`);
  assert.equal(schema['@graph'][0].logo, `${origin}/sendflow-favicon.png`);
  assert.equal(schema['@graph'].find((item: { '@type': string }) => item['@type'] === 'WebPage').url, `${origin}/`);
  assert.equal(schema['@graph'].find((item: { '@type': string }) => item['@type'] === 'WebPage').name, 'SendFlow | La plateforme de digitalisation des paiements');
  assert.match(rendered.html, /<title>SendFlow \| La plateforme de digitalisation des paiements<\/title>/);
  assert.match(rendered.html, /property="og:title" content="SendFlow \| La plateforme de digitalisation des paiements"/);
  assert.match(rendered.html, /name="twitter:title" content="SendFlow \| La plateforme de digitalisation des paiements"/);
  assert.ok(schema['@graph'].some((item: { '@type': string; serviceType?: string }) =>
    item['@type'] === 'Service' && item.serviceType?.includes('API développeur'),
  ));
  assert.equal(schema['@context'], 'https://schema.org');
});

test('HTML scripts and dynamic JSON-LD receive the response nonce', () => {
  assert.match(html, /<style nonce="__SEND_FLOW_CSP_NONCE__">/);
  assert.match(html, /<script type="module" src="\/src\/main\.tsx" nonce="__SEND_FLOW_CSP_NONCE__"><\/script>/);
  assert.match(seoSource, /document\.querySelector<HTMLScriptElement>\('script\[nonce\]'\)/);
  assert.match(seoSource, /script\.nonce = nonceSource\.nonce/);
});

test('home and feature SEO target developer payments in both languages', () => {
  assert.equal(publicSeoRoutes.home.fr.title, 'SendFlow | La plateforme de digitalisation des paiements');
  assert.equal(publicSeoRoutes.home.fr.name, 'SendFlow');
  assert.match(publicSeoRoutes.home.fr.description, /tarifs compétitifs/);
  assert.equal(publicSeoRoutes.home.en.title, 'SendFlow | The digital payments platform');
  assert.equal(publicSeoRoutes.home.en.name, 'SendFlow');
  assert.match(publicSeoRoutes.features.fr.description, /API de paiement.*développeurs/);
  assert.match(publicSeoRoutes.features.en.description, /payment API for developers/);
  assert.equal(publicSeoRoutes.home.fr.path, '/');
  assert.equal(publicSeoRoutes.home.en.path, '/en');
  assert.equal(publicSeoRoutes.developerApi.fr.path, '/api-developpeur');
  assert.equal(publicSeoRoutes.developerApi.en.path, '/en/developer-api');
  assert.equal(publicSeoRoutes.pricing.fr.path, '/tarifs');
  assert.equal(publicSeoRoutes.pricing.en.path, '/en/pricing');
  assert.match(publicSeoRoutes.pricing.fr.description, /encaissement.*transfert/);
  assert.match(publicSeoRoutes.pricing.en.description, /collection.*transfer/);
  assert.ok(sitemap.includes('<loc>/api-developpeur</loc>'));
  assert.ok(sitemap.includes('<loc>/en/developer-api</loc>'));
  assert.ok(sitemap.includes('<loc>/tarifs</loc>'));
  assert.ok(sitemap.includes('<loc>/en/pricing</loc>'));
});

test('developer API SEO targets payment documentation and links to the configured docs site', () => {
  const { fr, en, service } = publicSeoRoutes.developerApi;

  assert.equal(fr.path, '/api-developpeur');
  assert.equal(fr.name, 'Documentation de l’API de paiement Mobile Money');
  assert.equal(fr.title, 'Documentation de l’API de paiement Mobile Money | SendFlow');
  assert.ok(fr.title.length >= 50 && fr.title.length <= 60);
  assert.match(fr.description, /documentation de l’API de paiement/i);
  assert.match(fr.description, /exemple JSON/i);

  assert.equal(en.path, '/en/developer-api');
  assert.equal(en.name, 'Mobile Money Payment API Documentation');
  assert.equal(en.title, 'Mobile Money Payment API Documentation | SendFlow Africa');
  assert.match(en.description, /payment API documentation/i);

  assert.match(developerApiPageSource, /DOCUMENTATION_CTA_URL_KEY/);
  assert.match(developerApiPageSource, /getHttpsUrl/);
  assert.match(developerApiPageSource, /target="_blank"/);
  assert.match(developerApiPageSource, /rel="noopener noreferrer"/);
  assert.match(developerApiPageSource, /Documentation de l’API de paiement Mobile Money/);
  assert.equal(service.fr.serviceType, 'Documentation de l’API de paiement Mobile Money');
  assert.equal(service.en.serviceType, 'Mobile Money payment API documentation');
});

test('the pricing page reuses the home fee cards and published fee data', () => {
  assert.match(pricingPageSource, /queryKey:\s*\['\/api\/landing'\]/);
  assert.match(pricingPageSource, /import type \{ PublicOperatorFees \}/);
  assert.match(pricingPageSource, /feeView\?\.status === 'ready'/);
  assert.doesNotMatch(pricingPageSource, /OPERATOR_FEES_CONTENT_KEY/);
  assert.doesNotMatch(pricingPageSource, /parseOperatorFeesConfig/);
  assert.doesNotMatch(pricingPageSource, /hasMissingRates/);
  assert.match(appSource, /bundle\.operatorFees/);
  assert.doesNotMatch(appSource, /parseOperatorFeesConfig/);
  assert.match(landingVisibilitySource, /buildPublicOperatorFees/);
  assert.match(landingVisibilitySource, /hasExactOperatorFeeCoverage/);
  assert.match(landingVisibilitySource, /OPERATOR_FEES_CONTENT_KEY/);
  assert.match(apiSpec, /\/landing:/);
  assert.match(apiSpec, /PublicOperatorFeesReady/);
  assert.match(appSource, /import OperatorFeesSection from '@\/components\/OperatorFeesSection'/);
  assert.match(pricingPageSource, /import OperatorFeesSection/);
  assert.match(pricingPageSource, /<OperatorFeesSection language=\{language\} config=\{feeSectionConfig\} defaultOpen \/>/);
  assert.match(feeCardsSource, /button-toggle-collection-fees/);
  assert.match(feeCardsSource, /button-toggle-transfer-fees/);
  assert.match(pricingPageSource, /feeOperatorLogoBySlug\[operator\.slug\]/);
  assert.match(landingVisibilitySource, /\.sort\(\(a, b\) => a\.name\.localeCompare\(b\.name, "fr"\)\)/);
  assert.match(feeLogosSource, /orange:/);
  assert.match(feeLogosSource, /mtn:/);
  assert.match(feeLogosSource, /'moov-africa':/);
  assert.match(feeLogosSource, /wave:/);
  assert.doesNotMatch(pricingPageSource, /Retrouvez les tarifs publiés pour les opérateurs associés/);
  assert.doesNotMatch(pricingPageSource, /Une lecture claire, avant chaque mouvement/);
  assert.doesNotMatch(pricingPageSource, /className="sf-pricing-eyebrow"/);
  assert.doesNotMatch(pricingPageSource, /className="sf-pricing-country-pill"/);
  assert.doesNotMatch(pricingPageSource, /className="sf-pricing-hero-copy"/);
  assert.doesNotMatch(pricingPageSource, /Les montants affichés proviennent des tarifs publiés pour la Côte d’Ivoire/);
  assert.doesNotMatch(pricingPageSource, /Les tarifs,<br/);
  assert.doesNotMatch(pricingPageSource, /Côte d’Ivoire · XOF/);
  assert.doesNotMatch(pricingPageSource, /Deux catégories de frais/);
  assert.doesNotMatch(pricingPageSource, /className="sf-pricing-public-badge"/);
  assert.match(pricingPageSource, /className="sr-only"/);
  assert.doesNotMatch(pricingPageSource, /collection-3d\.webp/);
  assert.doesNotMatch(pricingPageSource, /transfer-3d\.webp/);
});

test('every localized public page has its own browser title beginning with its page name', () => {
  const groups = Object.values(publicSeoRoutes).filter((group: any) => group.fr?.path && group.en?.path);
  for (const locale of ['fr', 'en'] as const) {
    const titles = groups.map((group: any) => group[locale].title);
    assert.equal(new Set(titles).size, titles.length);
    for (const group of groups as any[]) {
      assert.ok(
        group[locale].title.toLocaleLowerCase().startsWith(group[locale].name.toLocaleLowerCase()),
        `${locale} title does not begin with its page name: ${group[locale].path}`,
      );
    }
  }
});

test('the sitemap contains exactly the configured localized public routes', () => {
  const routes = Object.values(publicSeoRoutes).flatMap((group: any) => [
    group.fr.path,
    group.en.path,
  ]);
  const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  assert.equal(new Set(routes).size, routes.length, 'Public routes must be unique');
  assert.equal(new Set(sitemapPaths).size, sitemapPaths.length, 'Sitemap URLs must be unique');
  assert.deepEqual([...sitemapPaths].sort(), [...routes].sort());
  assert.ok(!sitemapPaths.some((route) => /(^|\/)(admin|panel)(\/|$)/i.test(route)));
});

test('public routes have stable reciprocal French and English URLs', () => {
  assert.equal(getLocaleFromPath('/en/features'), 'en');
  assert.equal(getLocaleFromPath('/en'), 'en');
  assert.equal(getLocaleFromPath('/en/'), 'en');
  assert.equal(getLocalizedPath('/fonctionnalites', 'en'), '/en/features');
  assert.equal(getLocalizedPath('/', 'en'), '/en');
  assert.equal(getLocalizedPath('/en/features', 'fr'), '/fonctionnalites');
  assert.deepEqual(getLocalizedAlternates('/en/'), { fr: '/', en: '/en' });
  assert.deepEqual(getLocalizedAlternates('/en'), { fr: '/', en: '/en' });
  assert.deepEqual(getLocalizedAlternates('/france-senegal'), {
    fr: '/france-senegal',
    en: '/en/france-senegal',
  });
  assert.equal(getLocalizedPath('/api-developpeur', 'en'), '/en/developer-api');
  assert.equal(getLocalizedPath('/en/developer-api', 'fr'), '/api-developpeur');
  assert.deepEqual(getLocalizedAlternates('/api-developpeur'), {
    fr: '/api-developpeur',
    en: '/en/developer-api',
  });
  assert.equal(getLocalizedPath('/tarifs', 'en'), '/en/pricing');
  assert.equal(getLocalizedPath('/en/pricing', 'fr'), '/tarifs');
  assert.deepEqual(getLocalizedAlternates('/tarifs'), { fr: '/tarifs', en: '/en/pricing' });
});

test('the developer API page is not intercepted by the backend API proxy', () => {
  const proxyKey = viteConfig.match(/'(\^\/api\(\?:\/\|\$\))'\s*:/)?.[1];
  assert.ok(proxyKey, 'Vite should proxy only the /api route and its subpaths');
  const apiProxy = new RegExp(proxyKey);
  assert.equal(apiProxy.test('/api/landing'), true);
  assert.equal(apiProxy.test('/api'), true);
  assert.equal(apiProxy.test('/api-developpeur'), false);
});

test('missing or invalid origins fail explicitly', () => {
  for (const url of [
    'http://sendflow.example', 'not-a-url', 'https://localhost',
    'https://127.0.0.1', 'https://preview.local', 'https://site.example/path',
    'https://site.example?query=1', 'https://site.example#fragment',
    'https://user:password@site.example', 'https://site.example:5000',
    'https://dev.local', 'https://dev.localhost',
  ]) assert.throws(() => normalizeSiteOrigin(url), /VITE_PUBLIC_SITE_URL/);
  assert.throws(() => renderSeoDocuments('', { html, sitemap, robots }), /VITE_PUBLIC_SITE_URL/);
  assert.throws(() => absoluteSeoUrl(origin, '//another.example'), /invalide/);
});