export type PublicLocale = 'fr' | 'en';

const localizedRoutePairs = [
  { fr: '/', en: '/en/' },
  { fr: '/fonctionnalites', en: '/en/features' },
  { fr: '/securite', en: '/en/security' },
  { fr: '/download', en: '/en/download' },
  { fr: '/a-propos', en: '/en/about' },
  { fr: '/conditions-utilisation', en: '/en/terms' },
  { fr: '/confidentialite', en: '/en/privacy' },
  { fr: '/mentions-legales', en: '/en/legal-notice' },
  { fr: '/france-senegal', en: '/en/france-senegal' },
] as const;

function normalizeRoute(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] || '/';
  if (pathname === '/') return '/';
  if (pathname === '/en' || pathname === '/en/') return '/en/';
  return `/${pathname.replace(/^\/+|\/+$/g, '')}`;
}

export function getLocaleFromPath(path: string): PublicLocale {
  return normalizeRoute(path) === '/en' || normalizeRoute(path).startsWith('/en/')
    ? 'en'
    : 'fr';
}

export function getLocalizedPath(path: string, locale: PublicLocale): string {
  const normalized = normalizeRoute(path);
  const pair = localizedRoutePairs.find(({ fr, en }) => normalized === fr || normalized === en);
  if (!pair) return normalized;
  return pair[locale];
}

export function getLocalizedAlternates(path: string): Record<PublicLocale, string> | null {
  const normalized = normalizeRoute(path);
  const pair = localizedRoutePairs.find(({ fr, en }) => normalized === fr || normalized === en);
  return pair ? { fr: pair.fr, en: pair.en } : null;
}

export function navigateToLocale(path: string, locale: PublicLocale): void {
  window.location.assign(getLocalizedPath(path, locale));
}
