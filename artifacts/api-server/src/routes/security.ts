import { Router, type IRouter } from "express";
import { RecordSecurityTelemetryEventBody } from "@workspace/api-zod";
import { isAllowedMutationOrigin, createRateLimiter } from "../middlewares/security";
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

const router: IRouter = Router();
const eventLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  message: "Trop d’événements envoyés. Réessaie plus tard.",
});
const activitySchema = RecordSecurityTelemetryEventBody.strict();

router.get("/security/telemetry/config", (_req, res): void => {
  try {
    res.json({ enabled: readTelegramConfig() !== null });
  } catch {
    res.json({ enabled: false });
  }
});

router.post("/security/telemetry/events", eventLimiter, (req, res): void => {
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
  enqueueAuditEvent({
    kind: parsed.data.kind,
    page,
    ip: ipAddress,
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
