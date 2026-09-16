import type { Request, RequestHandler } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

function requestKey(req: Request): string {
  return req.ip || "unknown";
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();
  const MAX_BUCKETS = 10_000;

  return (req, res, next) => {
    const now = Date.now();
    const key = requestKey(req);
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + options.windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    if (buckets.size > MAX_BUCKETS) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
        if (buckets.size <= MAX_BUCKETS) break;
      }
    }

    if (bucket.count > options.max) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: options.message ?? "Trop de requêtes. Réessaie plus tard." });
      return;
    }

    next();
  };
}

function normalizeOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

const configuredOrigins = new Set(
  [
    process.env.PUBLIC_SITE_URL,
    ...(process.env.CORS_ORIGINS ?? "").split(","),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value)),
);

if (process.env.NODE_ENV !== "production") {
  const webPort = Number(process.env.WEB_PORT ?? "26095");
  if (Number.isInteger(webPort) && webPort > 0) {
    configuredOrigins.add(`http://localhost:${webPort}`);
    configuredOrigins.add(`http://127.0.0.1:${webPort}`);
  }
}

export function isAllowedOrigin(origin: string): boolean {
  return configuredOrigins.has(origin);
}
