import { normalizeIpAddress } from "./telegramAudit";

const trustedProxyAddresses = new Set(
  (process.env.TRUSTED_PROXY_IPS ?? "")
    .split(",")
    .map((value) => normalizeIpAddress(value))
    .filter((value): value is string => Boolean(value)),
);

export function isTrustedProxyAddress(address: string): boolean {
  const normalized = normalizeIpAddress(address);
  return normalized !== null && trustedProxyAddresses.has(normalized);
}

export function getTrustedProxyAddressCount(): number {
  return trustedProxyAddresses.size;
}
