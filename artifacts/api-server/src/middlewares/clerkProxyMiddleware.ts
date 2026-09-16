import type { IncomingHttpHeaders } from "node:http";
import type { RequestHandler } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";

export function getClerkProxyHost(req: { headers: IncomingHttpHeaders }): string | undefined {
  const configuredSite = process.env.PUBLIC_SITE_URL?.trim();
  if (configuredSite) {
    try {
      const url = new URL(configuredSite);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.host;
      }
    } catch {
      // Fall back to the request host so configuration errors remain visible.
    }
  }
  return req.headers.host?.trim() || undefined;
}

export function clerkProxyMiddleware(): RequestHandler {
  if (process.env.NODE_ENV !== "production" || !process.env.CLERK_SECRET_KEY) {
    return (_req, _res, next) => next();
  }

  return createProxyMiddleware({
    target: CLERK_FAPI,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
    on: {
      proxyReq(proxyReq, req) {
          let protocol = "https";
          try {
            const configuredSite = process.env.PUBLIC_SITE_URL;
            if (configuredSite) {
              protocol = new URL(configuredSite).protocol.replace(":", "");
            }
          } catch {
            // Keep the secure default when PUBLIC_SITE_URL is malformed.
          }
          const host = getClerkProxyHost(req) || "";
          proxyReq.setHeader("Clerk-Proxy-Url", `${protocol}://${host}${CLERK_PROXY_PATH}`);
          proxyReq.setHeader("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY!);
      },
    },
  }) as RequestHandler;
}