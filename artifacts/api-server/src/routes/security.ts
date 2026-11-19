import { Router, type IRouter } from "express";
import { RecordSecurityTelemetryEventBody } from "@workspace/api-zod";
import { isAllowedMutationOrigin, createRateLimiter } from "../middlewares/security";
import { requireAdmin } from "../middlewares/adminAuth";
import {
  enqueueAuditEvent,
  handleTelegramUpdate,
  isPublicClientIp,
  isTelegramWebhookAuthorized,
  normalizePublicIp,
  readTelegramConfig,
  safeActivityTarget,
  safePublicPagePath,
} from "../lib/telegramAudit";
import { lookupLocalGeoIp } from "../lib/geoIp";
import { parseClientInfo } from "../lib/clientInfo";
import {
  isRequestAuditStoreReady,
  recordPageView,
  recordPageViewEvent,
} from "../lib/requestAudit";
import { createProxyDiagnosticSnapshot } from "../lib/proxyDiagnostics";
import { getTrustedProxyAddressCount } from "../lib/trustedProxies";

const router: IRouter = Router();
const eventLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  message: "Trop d’événements envoyés. Réessaie plus tard.",
});
const activitySchema = RecordSecurityTelemetryEventBody.strict();

router.get(
  "/admin/security/proxy-diagnostics",
  (req, res, next): void => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    next();
  },
  requireAdmin,
  (req, res): void => {
    res.json(createProxyDiagnosticSnapshot({
      socketPeerAddress: req.socket.remoteAddress,
      expressClientAddress: req.ip,
      trustedProxyAddressCount: getTrustedProxyAddressCount(),
      xForwardedFor: req.get("x-forwarded-for"),
      xRealIp: req.get("x-real-ip"),
      cloudflareConnectingIp: req.get("cf-connecting-ip"),
    }));
  },
);

router.get("/security/telemetry/config", (_req, res): void => {
  try {
    res.json({ enabled: readTelegramConfig() !== null });
  } catch {
    res.json({ enabled: false });
  }
});

router.post("/security/telemetry/events", eventLimiter, async (req, res): Promise<void> => {
  let config;
  try {
    config = readTelegramConfig();
  } catch {
    res.status(503).json({ error: "La supervision n’est pas configurée." });
    return;
  }
  if (!config) {
    res.sendStatus(204);
    return;
  }

  const origin = req.get("origin");
  if (!origin || !isAllowedMutationOrigin(origin)) {
    res.status(403).json({ error: "Origine non autorisée." });
    return;
  }

  const parsed = activitySchema.safeParse(req.body);
  const page = parsed.success ? safePublicPagePath(parsed.data.page) : null;
  if (!parsed.success || !page) {
    res.status(400).json({ error: "Événement invalide." });
    return;
  }

  const ipAddress = isPublicClientIp(req.ip) ? normalizePublicIp(req.ip) : null;
  const geo = lookupLocalGeoIp(ipAddress);
  const clientInfo = parseClientInfo(req.get("user-agent"));
  const occurredAt = new Date();
  let isNewVisitor = false;
  if (
    parsed.data.kind === "page_view" &&
    isRequestAuditStoreReady()
  ) {
    await recordPageViewEvent(page, ipAddress, geo, clientInfo, occurredAt);
    if (ipAddress) {
      isNewVisitor = await recordPageView(ipAddress, geo, clientInfo);
    }
  }
  enqueueAuditEvent({
    kind: parsed.data.kind,
    page,
    ip: ipAddress,
    country: geo?.country,
    city: geo?.city,
    asn: geo?.asn,
    networkOrganization: geo?.networkOrganization,
    isp: geo?.isp,
    connectionType: geo?.connectionType,
    mobileCountryCode: geo?.mobileCountryCode,
    mobileNetworkCode: geo?.mobileNetworkCode,
    browser: clientInfo.browser,
    platform: clientInfo.platform,
    device: clientInfo.device,
    occurredAt,
    isNewVisitor,
    ...(safeActivityTarget(parsed.data.target)
      ? { target: safeActivityTarget(parsed.data.target) }
      : {}),
  });
  res.sendStatus(202);
});

router.post("/security/telegram/webhook", async (req, res): Promise<void> => {
  let config;
  try {
    config = readTelegramConfig();
  } catch {
    res.sendStatus(404);
    return;
  }
  if (!config) {
    res.sendStatus(404);
    return;
  }

  if (!isTelegramWebhookAuthorized(
    req.get("x-telegram-bot-api-secret-token"),
    config.webhookSecret,
  )) {
    res.sendStatus(401);
    return;
  }

  try {
    await handleTelegramUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Telegram webhook action failed");
    res.status(503).json({ ok: false });
  }
});

export default router;
