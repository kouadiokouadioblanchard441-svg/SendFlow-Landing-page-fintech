import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { publicSeoPlugin } from './scripts/seo-plugin';

const rawPort = process.env.PORT ?? '3000';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

const isLegacyAdminPath = (requestUrl = '') => {
  const requestPath = requestUrl.split('?')[0].replace(/\/+$/, '') || '/';
  const normalizedBasePath = basePath.replace(/\/+$/, '');
  return (
    requestPath === '/admin' ||
    requestPath.startsWith('/admin/') ||
    requestPath === `${normalizedBasePath}/admin` ||
    requestPath.startsWith(`${normalizedBasePath}/admin/`)
  );
};

const blockLegacyAdminPath = () => ({
  name: 'sendflow-block-legacy-admin-path',
  enforce: 'pre' as const,
  configureServer(server: { middlewares: { use: (handler: (req: { url?: string }, res: { statusCode: number; end: (body: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      if (!isLegacyAdminPath(req.url)) {
        next();
        return;
      }
      const homePath = basePath.replace(/\/+$/, '') || '/';
      res.statusCode = 302;
      res.setHeader('Location', homePath);
      res.end();
    });
  },
  configurePreviewServer(server: { middlewares: { use: (handler: (req: { url?: string }, res: { statusCode: number; end: (body: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      if (!isLegacyAdminPath(req.url)) {
        next();
        return;
      }
      const homePath = basePath.replace(/\/+$/, '') || '/';
      res.statusCode = 302;
      res.setHeader('Location', homePath);
      res.end();
    });
  },
});
export default defineConfig(({ mode }) => ({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    blockLegacyAdminPath(),
    publicSeoPlugin(loadEnv(mode, import.meta.dirname, 'VITE_').VITE_PUBLIC_SITE_URL),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.API_ORIGIN ?? 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));
