import { createHmac } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { pool } from "@workspace/db";
import { getPublicSiteUrl } from "../lib/publicSiteUrl";

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
  const PRUNE_INTERVAL = 256;
  let requestsSincePrune = 0;

  return (req, res, next) => {
    const now = Date.now();
    const key = requestKey(req);
    const current = buckets.get(key);
    let bucket: Bucket;

    if (current && current.resetAt > now) {
      bucket = current;
      bucket.count += 1;
      // Keep the map in least-recently-used order when its hard cap is reached.
      buckets.delete(key);
      buckets.set(key, bucket);
    } else {
      if (current) buckets.delete(key);
      bucket = { count: 1, resetAt: now + options.windowMs };

      requestsSincePrune += 1;
      if (requestsSincePrune >= PRUNE_INTERVAL || buckets.size >= MAX_BUCKETS) {
        requestsSincePrune = 0;
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
        }
      }
      if (buckets.size >= MAX_BUCKETS) {
        const leastRecentlyUsedKey = buckets.keys().next().value;
        if (leastRecentlyUsedKey !== undefined) buckets.delete(leastRecentlyUsedKey);
      }
      buckets.set(key, bucket);
    }

    if (bucket.count > options.max) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: options.message ?? "Trop de requêtes. Réessaie plus tard." });
      return;
    }

    next();
  };
}

type SharedRateLimitOptions = RateLimitOptions & {
  scope: string;
};

export function createSharedRateLimiter(
  options: SharedRateLimitOptions,
): RequestHandler {
  let requestsSinceCleanup = 0;

  return async (req, res, next) => {
    const remoteAddress = req.socket?.remoteAddress;
    const secret = process.env.SESSION_SECRET;
    if (!remoteAddress || !secret) {
      res.status(503).json({
        error: "Le contrôle de connexion est temporairement indisponible.",
      });
      return;
    }

    const bucketKey = createHmac("sha256", secret)
      .update(`${options.scope}:${remoteAddress}`)
      .digest("hex");

    try {
      const result = await pool.query<{ count: number; reset_at: Date }>(
        `INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
         VALUES ($1, 1, now() + ($2::double precision * interval '1 millisecond'))
         ON CONFLICT (bucket_key) DO UPDATE
         SET count = CASE
               WHEN rate_limit_buckets.reset_at <= now() THEN 1
               ELSE rate_limit_buckets.count + 1
             END,
             reset_at = CASE
               WHEN rate_limit_buckets.reset_at <= now() THEN EXCLUDED.reset_at
               ELSE rate_limit_buckets.reset_at
             END
         RETURNING count, reset_at`,
        [bucketKey, options.windowMs],
      );
      const bucket = result.rows[0];
      if (!bucket) {
        throw new Error("The shared rate limit update returned no bucket.");
      }

      requestsSinceCleanup += 1;
      if (requestsSinceCleanup >= 1024) {
        requestsSinceCleanup = 0;
        await pool.query(
          "DELETE FROM rate_limit_buckets WHERE reset_at <= now()",
        );
      }

      if (Number(bucket.count) > options.max) {
        res.setHeader(
          "Retry-After",
          Math.max(
            1,
            Math.ceil((new Date(bucket.reset_at).getTime() - Date.now()) / 1000),
          ),
        );
        res.status(429).json({
          error: options.message ?? "Trop de requêtes. Réessaie plus tard.",
        });
        return;
      }

      next();
    } catch {
      // Never fall back to a process-local counter: that would let a caller
      // bypass the limit by reaching a different Passenger worker.
      res.status(503).json({
        error: "Le contrôle de connexion est temporairement indisponible.",
      });
    }
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
    getPublicSiteUrl(),
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

export function isAllowedMutationOrigin(origin: string | undefined): boolean {
  return typeof origin === "string" && origin.length > 0 && isAllowedOrigin(origin);
}
