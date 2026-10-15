/** Accept only a public HTTPS origin, never a path, credential or preview domain. */
export function normalizeSiteOrigin(value: string | undefined): string | undefined {
  const configured = value?.trim();
  if (!configured) return undefined;

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error('VITE_PUBLIC_SITE_URL doit être une origine HTTPS valide.');
  }

  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    url.username || url.password || url.search || url.hash ||
    url.pathname !== '/' || url.port ||
    host === 'localhost' || !host.includes('.') ||
    host.endsWith('.localhost') || host.endsWith('.local') ||
    // TODO : Vérifier toute migration de cette exclusion sans affaiblir le contrôle de l’origine.
    host.endsWith('.replit.dev') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')
  ) {
    throw new Error('VITE_PUBLIC_SITE_URL doit contenir uniquement le domaine HTTPS public vérifié, sans chemin ni domaine de prévisualisation.');
  }
  return url.origin;
}