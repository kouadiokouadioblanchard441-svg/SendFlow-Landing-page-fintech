import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { normalizeSiteOrigin } from '../src/lib/site-origin';
import { renderSeoDocuments } from './seo-documents';

export function publicSeoPlugin(siteUrl: string | undefined): Plugin {
  const origin = normalizeSiteOrigin(siteUrl);
  let config: ResolvedConfig;
  return {
    name: 'sendflow-public-seo',
    configResolved(resolved) {
      config = resolved;
      if (config.command === 'build' && !origin) {
        config.logger.warn(
          '[SEO] VITE_PUBLIC_SITE_URL absent : URLs publiques non configurées. Après la première publication, renseignez le domaine vérifié et republiez avant Search Console.',
        );
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!origin) return html;
        return renderSeoDocuments(origin, { html, sitemap: '', robots: '' }).html;
      },
    },
    async closeBundle() {
      if (!origin || config.command !== 'build') return;
      const output = path.resolve(config.root, config.build.outDir);
      const [sitemap, robots] = await Promise.all([
        fs.readFile(path.join(config.publicDir, 'sitemap.xml'), 'utf8'),
        fs.readFile(path.join(config.publicDir, 'robots.txt'), 'utf8'),
      ]);
      const rendered = renderSeoDocuments(origin, { html: '', sitemap, robots });
      await Promise.all([
        fs.writeFile(path.join(output, 'sitemap.xml'), rendered.sitemap),
        fs.writeFile(path.join(output, 'robots.txt'), rendered.robots),
      ]);
    },
  };
}