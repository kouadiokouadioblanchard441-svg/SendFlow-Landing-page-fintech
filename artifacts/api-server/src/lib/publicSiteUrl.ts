export function getPublicSiteUrl(): string | undefined {
  for (const value of [
    process.env.PUBLIC_SITE_URL,
    process.env.APP_URL,
    process.env.PUBLIC_URL,
  ]) {
    const configured = value?.trim();
    if (configured) return configured;
  }
  return undefined;
}
