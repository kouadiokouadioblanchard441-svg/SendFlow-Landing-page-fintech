import type { IncomingHttpHeaders } from "node:http";
import { getPublicSiteUrl } from "../lib/publicSiteUrl";

export function getClerkProxyHost(req: { headers: IncomingHttpHeaders }): string | undefined {
  const configuredSite = getPublicSiteUrl();
  if (configuredSite) {
    try {
      const url = new URL(configuredSite);
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      ) {
        return url.host;
      }
    } catch {
      // Invalid production configuration must not fall back to a client-supplied Host.
    }
    return undefined;
  }
  if (process.env.NODE_ENV === "production") return undefined;

  const requestHost = req.headers.host?.trim();
  if (!requestHost || /[\s/@?#\\]/.test(requestHost)) return undefined;
  try {
    return new URL(`http://${requestHost}`).host;
  } catch {
    return undefined;
  }
}
