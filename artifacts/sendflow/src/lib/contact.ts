export type ContactDetails = {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

export function getTelHref(phone?: string | null): string | null {
  const value = phone?.trim() ?? '';
  if (!value) return null;
  const normalized = value.replace(/[^\d+]/g, '');
  return normalized ? `tel:${normalized}` : null;
}

export function getWhatsAppHref(phone?: string | null): string | null {
  const digits = phone?.replace(/\D/g, '') ?? '';
  return digits ? `https://wa.me/${digits}` : null;
}

export function getWhatsAppChannelHref(url?: string | null): string | null {
  const value = url?.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const isWhatsAppHost = parsed.hostname === 'wa.me'
      || parsed.hostname === 'whatsapp.com'
      || parsed.hostname.endsWith('.whatsapp.com');
    return parsed.protocol === 'https:' && isWhatsAppHost ? parsed.href : null;
  } catch {
    return null;
  }
}

export function getWhatsAppSupportHref(phone?: string | null, fallbackUrl?: string | null): string | null {
  return getWhatsAppHref(phone) ?? getWhatsAppChannelHref(fallbackUrl);
}