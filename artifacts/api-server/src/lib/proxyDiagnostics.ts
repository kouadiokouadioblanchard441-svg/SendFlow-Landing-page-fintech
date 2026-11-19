import { isPublicClientIp, normalizeIpAddress } from "./telegramAudit";

const MAX_PROXY_CHAIN_CANDIDATES = 8;

function parseIpCandidates(value: string | undefined): string[] {
  if (!value) return [];
  const candidates = value
    .split(",")
    .slice(0, MAX_PROXY_CHAIN_CANDIDATES)
    .map((candidate) => normalizeIpAddress(candidate))
    .filter((candidate): candidate is string => candidate !== null);
  return [...new Set(candidates)];
}

export type ProxyDiagnosticInput = {
  socketPeerAddress: string | null | undefined;
  expressClientAddress: string | undefined;
  trustedProxyAddressCount: number;
  xForwardedFor: string | undefined;
  xRealIp: string | undefined;
  cloudflareConnectingIp: string | undefined;
};

export function createProxyDiagnosticSnapshot(input: ProxyDiagnosticInput) {
  const socketPeerAddress = input.socketPeerAddress
    ? normalizeIpAddress(input.socketPeerAddress)
    : null;
  const expressClientAddress = input.expressClientAddress
    ? normalizeIpAddress(input.expressClientAddress)
    : null;

  return {
    trustedProxyAddressCount: input.trustedProxyAddressCount,
    socketPeerAddress,
    expressClientAddress,
    expressClientAddressIsPublic: isPublicClientIp(expressClientAddress),
    unverifiedHeaderCandidates: {
      xForwardedFor: parseIpCandidates(input.xForwardedFor),
      xRealIp: parseIpCandidates(input.xRealIp),
      cloudflareConnectingIp: parseIpCandidates(input.cloudflareConnectingIp),
    },
    note: "Forwarded-header candidates are unverified and must not be trusted until the proxy chain is confirmed.",
  };
}
