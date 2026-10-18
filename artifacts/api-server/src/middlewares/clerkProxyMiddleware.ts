import { ServerResponse, type IncomingHttpHeaders } from "node:http";
import type { RequestHandler } from "express";
import { createProxyServer } from "http-proxy";
import { logger } from "../lib/logger";
import { getClerkProxyHost } from "./clerkProxyHost";
import { getPublicSiteUrl } from "../lib/publicSiteUrl";

export { getClerkProxyHost } from "./clerkProxyHost";

const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";
const clerkProxy = createProxyServer({
  target: CLERK_FAPI,
  changeOrigin: true,
  proxyTimeout: 30_000,
  timeout: 30_000,
});

clerkProxy.on("proxyReq", (proxyReq, req) => {
  let protocol = "https";
  try {
    const configuredSite = getPublicSiteUrl();
    if (configuredSite) {
      const parsed = new URL(configuredSite);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        protocol = parsed.protocol.slice(0, -1);
      }
    }
  } catch {
    // Keep the secure default when PUBLIC_SITE_URL is malformed.
  }
  const host = getClerkProxyHost(req) || "";
  proxyReq.setHeader("Clerk-Proxy-Url", `${protocol}://${host}${CLERK_PROXY_PATH}`);
  proxyReq.setHeader("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY ?? "");
});

clerkProxy.on("error", (error, _req, response) => {
  logger.warn(
    { errorType: error instanceof Error ? error.name : "UnknownError" },
    "Clerk proxy request failed",
  );
  if (!(response instanceof ServerResponse)) return;
  if (response.headersSent) {
    response.destroy();
    return;
  }
  response.writeHead(502, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end("Authentication service unavailable");
});

export function clerkProxyMiddleware(): RequestHandler {
  if (process.env.NODE_ENV !== "production" || !process.env.CLERK_SECRET_KEY) {
    return (_req, _res, next) => next();
  }

  return (req, res) => {
    if (!getClerkProxyHost(req)) {
      res.status(503).json({ error: "Authentication proxy is not configured" });
      return;
    }
    clerkProxy.web(req, res);
  };
}