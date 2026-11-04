import type { RequestHandler } from "express";
import { logger } from "../lib/logger";
import {
  isIpBlocked,
  isIpBlockStoreReady,
  isPublicClientIp,
  normalizePublicIp,
  readTelegramConfig,
} from "../lib/telegramAudit";

export function createIpBlockMiddleware(
  checkBlocked: typeof isIpBlocked = isIpBlocked,
  isReady: () => boolean = isIpBlockStoreReady,
): RequestHandler {
  return async (req, res, next): Promise<void> => {
    let enabled = false;
    try {
      enabled = readTelegramConfig() !== null;
    } catch {
      res.status(503).json({ error: "Le contrôle de sécurité est mal configuré." });
      return;
    }
    if (!enabled) {
      next();
      return;
    }
    if (!isReady()) {
      next();
      return;
    }

    const ipAddress = isPublicClientIp(req.ip) ? normalizePublicIp(req.ip) : null;
    if (!ipAddress) {
      // A private address here is usually the local Plesk/Passenger proxy.
      // Do not block it or mistake it for the visitor; configure an exact trusted
      // proxy address before enabling client-IP blocking on that host.
      next();
      return;
    }

    try {
      if (await checkBlocked(ipAddress)) {
        res.status(403).json({ error: "Accès refusé." });
        return;
      }
    } catch (error) {
      logger.error({ err: error }, "IP block list lookup failed");
      res.status(503).json({ error: "Le contrôle de sécurité est temporairement indisponible." });
      return;
    }
    next();
  };
}

export const ipBlockMiddleware = createIpBlockMiddleware();
