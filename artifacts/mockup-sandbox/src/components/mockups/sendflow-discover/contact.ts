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