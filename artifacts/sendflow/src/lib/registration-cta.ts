export const REGISTRATION_CTA_URL_KEY = 'cta.signup.url';
export const REGISTRATION_CTA_LABEL_KEY = 'cta.signup.label';
export const DOCUMENTATION_CTA_URL_KEY = 'cta.documentation.url';

export const REGISTRATION_CTA_DEFAULT_LABELS = {
  fr: 'Inscrivez-vous',
  en: 'Sign up',
} as const;

export function getHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const getRegistrationUrl = getHttpsUrl;
