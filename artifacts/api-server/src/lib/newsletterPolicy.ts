export const NEWSLETTER_ACTIVE_STATUS = "subscribed" as const;
export const NEWSLETTER_CONSENT_TEXT_VERSION = "newsletter-v1" as const;
export const NEWSLETTER_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

export function getNewsletterConfirmationExpiry(now: Date): Date {
  return new Date(now.getTime() + NEWSLETTER_CONFIRMATION_TTL_MS);
}

export function isNewsletterConfirmationUsable(
  status: string,
  token: string | null,
  expiresAt: Date | null,
  now: Date,
): boolean {
  return status === "pending" &&
    Boolean(token) &&
    expiresAt instanceof Date &&
    expiresAt.getTime() > now.getTime();
}

export function getNewsletterConfirmationUrl(origin: string, token: string): string {
  return `${origin}/api/newsletter/confirm#${encodeURIComponent(token)}`;
}
