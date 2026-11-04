import { isIP } from "node:net";
import { timingSafeEqual } from "node:crypto";
import { pool } from "@workspace/db";
import { logger } from "./logger";

export type PublicActivityKind = "page_view" | "click" | "form_submit";

export type AuditEvent = {
  kind: PublicActivityKind | "security";
  page: string;
  ip: string | null;
  target?: string;
  status?: number;
};

export type TelegramConfig = {
  botToken: string;
  chatId: string;
  webhookSecret: string;
  adminUserIds: Set<string>;
};

const IP_BLOCKS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS security_ip_blocks (
  ip_address varchar(45) PRIMARY KEY,
  blocked_by_telegram_user_id varchar(32) NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now()
)`;
const MAX_QUEUED_EVENTS = 240;
const MAX_BATCH_EVENTS = 12;
const MAX_TELEGRAM_MESSAGE_LENGTH = 3_500;
const BATCH_DELAY_MS = 5_000;
const queue: AuditEvent[] = [];
const recentlyReported = new Map<string, number>();
let droppedEvents = 0;
let flushTimer: NodeJS.Timeout | undefined;
let ipBlockStoreReady = false;
let telegramWebhookReady = false;

export function normalizeIpAddress(value: string): string | null {
  const trimmed = value.trim().replace(/^\[|\]$/g, "");
  const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed)?.[1];
  const ip = mappedIpv4 ?? trimmed;
  return isIP(ip) ? ip.toLowerCase() : null;
}

export function isPublicClientIp(value: string | null | undefined): value is string {
  if (!value) return false;
  const ip = normalizeIpAddress(value);
  if (!ip) return false;

  if (isIP(ip) === 4) {
    const octets = ip.split(".").map(Number);
    const [first, second] = octets;
    if (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 192 && second === 0 && octets[2] === 0) ||
      (first === 192 && second === 0 && octets[2] === 2) ||
      (first === 192 && second === 88 && octets[2] === 99) ||
      (first === 198 && (second === 18 || second === 19)) ||
      (first === 198 && second === 51 && octets[2] === 100) ||
      (first === 203 && second === 0 && octets[2] === 113) ||
      first >= 224
    ) {
      return false;
    }
    return true;
  }

  if (ip.startsWith("::ffff:")) {
    return isPublicClientIp(ip.slice("::ffff:".length));
  }
  return ip !== "::" &&
    ip !== "::1" &&
    !/^2001:db8:/i.test(ip) &&
    !/^f[cd]/i.test(ip) &&
    !/^fe[89ab]/i.test(ip) &&
    !/^ff/i.test(ip);
}

export function normalizePublicIp(value: string): string | null {
  const normalized = normalizeIpAddress(value);
  return normalized && isPublicClientIp(normalized) ? normalized : null;
}

export function readTelegramConfig(
  env: NodeJS.ProcessEnv = process.env,
): TelegramConfig | null {
  if (env.TELEGRAM_AUDIT_ENABLED?.trim().toLowerCase() !== "true") return null;

  const missing = [
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "TELEGRAM_WEBHOOK_SECRET",
    "TELEGRAM_ADMIN_USER_IDS",
  ].filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Telegram audit is enabled but required settings are missing: ${missing.join(", ")}`);
  }

  const botToken = env.TELEGRAM_BOT_TOKEN!.trim();
  const chatId = env.TELEGRAM_CHAT_ID!.trim();
  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET!.trim();
  const adminUserIds = new Set(
    env.TELEGRAM_ADMIN_USER_IDS!.split(",").map((id) => id.trim()).filter(Boolean),
  );

  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken)) {
    throw new Error("TELEGRAM_BOT_TOKEN has an invalid format.");
  }
  if (!/^-?\d+$/.test(chatId)) {
    throw new Error("TELEGRAM_CHAT_ID must be a numeric Telegram chat ID.");
  }
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET must contain only letters, numbers, underscores, or hyphens.");
  }
  if (
    adminUserIds.size === 0 ||
    [...adminUserIds].some((id) => !/^\d{1,20}$/.test(id))
  ) {
    throw new Error("TELEGRAM_ADMIN_USER_IDS must contain comma-separated numeric Telegram user IDs.");
  }

  return { botToken, chatId, webhookSecret, adminUserIds };
}

export function isTelegramWebhookAuthorized(
  suppliedSecret: string | undefined,
  expectedSecret: string,
): boolean {
  if (!suppliedSecret || suppliedSecret.length !== expectedSecret.length) return false;
  return timingSafeEqual(Buffer.from(suppliedSecret), Buffer.from(expectedSecret));
}

export function isAuthorizedTelegramAdmin(
  userId: string,
  chatId: string,
  config: Pick<TelegramConfig, "adminUserIds" | "chatId">,
): boolean {
  return config.chatId === chatId && config.adminUserIds.has(userId);
}

export function safePublicPagePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 200) return null;
  if (!value.startsWith("/") || value.startsWith("//") || /[\u0000-\u001f\\]/.test(value)) return null;
  const path = value.split(/[?#]/, 1)[0] || "/";
  if (
    path === "/api" ||
    path.startsWith("/api/") ||
    /(^|\/)(?:panel|admin)(?:\/|$)/i.test(path)
  ) {
    return null;
  }
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,36}(?=\/|$)/gi, "/[id]")
    .replace(/\/[^/]*@[^/]*(?=\/|$)/g, "/[redacted]")
    .replace(/\/\+?\d[\d(). -]{6,}(?=\/|$)/g, "/[redacted]")
    .replace(/\/[a-zA-Z0-9._~-]{24,}(?=\/|$)/g, "/[redacted]")
    .replace(/\/\d{4,}(?=\/|$)/g, "/[id]");
}

export function safeSecurityRequestPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//") || /[\u0000-\u001f\\]/.test(value)) return null;
  const path = value.split(/[?#]/, 1)[0] || "/";
  if (/^\/api\/admin(?:\/|$)/i.test(path)) return "/api/admin/[redacted]";
  if (/(^|\/)panel(?:\/|$)/i.test(path)) return "/panel/[redacted]";
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,36}(?=\/|$)/gi, "/[id]")
    .replace(/\/[^/]*@[^/]*(?=\/|$)/g, "/[redacted]")
    .replace(/\/\+?\d[\d(). -]{6,}(?=\/|$)/g, "/[redacted]")
    .replace(/\/[a-zA-Z0-9._~-]{24,}(?=\/|$)/g, "/[redacted]")
    .replace(/\/\d{4,}(?=\/|$)/g, "/[id]");
}

export function safeActivityTarget(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) return undefined;
  return value;
}

export async function initializeIpBlockStore(): Promise<void> {
  try {
    await pool.query(IP_BLOCKS_TABLE_SQL);
    ipBlockStoreReady = true;
  } catch (error) {
    ipBlockStoreReady = false;
    throw error;
  }
}

export function isIpBlockStoreReady(): boolean {
  return ipBlockStoreReady;
}

export function isTelegramWebhookReady(): boolean {
  return telegramWebhookReady;
}

export async function isIpBlocked(ipAddress: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM security_ip_blocks WHERE ip_address = $1 LIMIT 1",
    [ipAddress],
  );
  return result.rowCount === 1;
}

export async function setIpBlocked(
  ipAddress: string,
  telegramUserId: string,
  blocked: boolean,
): Promise<void> {
  if (blocked) {
    await pool.query(
      `INSERT INTO security_ip_blocks (ip_address, blocked_by_telegram_user_id)
       VALUES ($1, $2)
       ON CONFLICT (ip_address) DO NOTHING`,
      [ipAddress, telegramUserId],
    );
    return;
  }
  await pool.query("DELETE FROM security_ip_blocks WHERE ip_address = $1", [ipAddress]);
}

type TelegramReplyMarkup = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

export async function callTelegramApi(
  method: string,
  payload: Record<string, unknown>,
  config: TelegramConfig,
  request: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await request(
      `https://api.telegram.org/bot${config.botToken}/${method}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) {
      logger.warn({ statusCode: response.status, method }, "Telegram API request failed");
      return false;
    }
    const result = await response.json() as { ok?: unknown };
    if (result.ok !== true) {
      logger.warn({ method }, "Telegram API rejected a request");
      return false;
    }
    return true;
  } catch {
    logger.warn({ method }, "Telegram API request could not be completed");
    return false;
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    void flushAuditQueue();
  }, BATCH_DELAY_MS);
  flushTimer.unref();
}

export function enqueueAuditEvent(event: AuditEvent): void {
  try {
    if (!readTelegramConfig()) return;
  } catch (error) {
    logger.error({ err: error }, "Telegram audit configuration is invalid");
    return;
  }

  if (queue.length >= MAX_QUEUED_EVENTS) {
    if (droppedEvents === 0) {
      logger.warn("Telegram activity queue is full; excess events will be omitted.");
    }
    droppedEvents += 1;
    return;
  }
  queue.push(event);
  scheduleFlush();
}

function eventLine(event: AuditEvent): string {
  const parts = [
    event.kind === "security" ? "Alerte sécurité" : event.kind,
    event.page,
    event.target ? `action=${event.target}` : "",
    event.status ? `HTTP ${event.status}` : "",
    event.ip ? `IP ${event.ip}` : "IP indisponible via le proxy",
  ].filter(Boolean);
  return parts.join(" · ").slice(0, 220);
}

async function flushAuditQueue(): Promise<void> {
  let config: TelegramConfig | null;
  try {
    config = readTelegramConfig();
  } catch (error) {
    logger.error({ err: error }, "Telegram audit configuration is invalid");
    return;
  }
  if (!config || queue.length === 0) return;

  const batch = queue.splice(0, MAX_BATCH_EVENTS);
  const droppedAtFlush = droppedEvents;
  const lines: string[] = [];
  let messageLength = 0;
  for (const event of batch) {
    const line = eventLine(event);
    if (messageLength + line.length + 1 > MAX_TELEGRAM_MESSAGE_LENGTH) break;
    lines.push(line);
    messageLength += line.length + 1;
  }
  const omitted = batch.length - lines.length + droppedAtFlush;
  if (omitted > 0) lines.push(`Événements non affichés dans ce lot : ${omitted}`);

  const ips = isIpBlockStoreReady() && isTelegramWebhookReady()
    ? [...new Set(batch.map((event) => event.ip).filter((ip): ip is string => Boolean(ip)))].slice(0, 12)
    : [];
  const replyMarkup: TelegramReplyMarkup = {
    inline_keyboard: ips.map((ip) => [
      { text: `Bloquer ${ip}`.slice(0, 64), callback_data: `block:${ip}` },
    ]),
  };

  const sent = await callTelegramApi(
    "sendMessage",
    {
      chat_id: config.chatId,
      text: `SendFlow · activité récente\n${lines.join("\n")}`.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH),
      ...(ips.length > 0 ? { reply_markup: replyMarkup } : {}),
      disable_web_page_preview: true,
    },
    config,
  );
  if (sent) {
    droppedEvents = Math.max(0, droppedEvents - droppedAtFlush);
  } else {
    for (const event of batch.reverse()) {
      if (queue.length < MAX_QUEUED_EVENTS) queue.unshift(event);
      else droppedEvents += 1;
    }
  }
  if (queue.length > 0) scheduleFlush();
}

export function notifySecurityEvent(event: Omit<AuditEvent, "kind">): void {
  const key = `${event.status ?? 0}:${event.ip ?? "unknown"}:${event.page}`;
  const now = Date.now();
  const lastReported = recentlyReported.get(key);
  if (lastReported && now - lastReported < 60_000) return;
  recentlyReported.set(key, now);
  if (recentlyReported.size > 2_000) {
    for (const [entryKey, reportedAt] of recentlyReported) {
      if (now - reportedAt >= 60_000) recentlyReported.delete(entryKey);
    }
    while (recentlyReported.size > 2_000) {
      const oldestKey = recentlyReported.keys().next().value;
      if (oldestKey === undefined) break;
      recentlyReported.delete(oldestKey);
    }
  }
  enqueueAuditEvent({ ...event, kind: "security" });
}

function parseCallback(data: unknown): { blocked: boolean; ipAddress: string } | null {
  if (typeof data !== "string") return null;
  const match = /^(block|unblock):(.{1,45})$/.exec(data);
  if (!match) return null;
  const ipAddress = normalizePublicIp(match[2]);
  if (!ipAddress) return null;
  return { blocked: match[1] === "block", ipAddress };
}

export async function handleTelegramUpdate(update: unknown): Promise<"ignored" | "handled"> {
  const config = readTelegramConfig();
  if (!config || typeof update !== "object" || update === null) return "ignored";
  const callback = (update as { callback_query?: unknown }).callback_query;
  if (typeof callback !== "object" || callback === null) return "ignored";

  const query = callback as {
    id?: unknown;
    data?: unknown;
    from?: { id?: unknown } | null;
    message?: { chat?: { id?: unknown } | null } | null;
  };
  const callbackId = typeof query.id === "string" ? query.id : "";
  const userId = typeof query.from?.id === "number" ? String(query.from.id) : "";
  const callbackChatId =
    typeof query.message?.chat?.id === "number" || typeof query.message?.chat?.id === "string"
      ? String(query.message.chat.id)
      : "";
  const action = parseCallback(query.data);
  if (
    !callbackId ||
    !action ||
    !isAuthorizedTelegramAdmin(userId, callbackChatId, config)
  ) {
    if (callbackId) {
      await callTelegramApi("answerCallbackQuery", {
        callback_query_id: callbackId,
        text: "Action non autorisée.",
        show_alert: true,
      }, config);
    }
    return "ignored";
  }

  await setIpBlocked(action.ipAddress, userId, action.blocked);
  const actionLabel = action.blocked ? "bloquée" : "débloquée";
  await callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackId,
    text: `Adresse IP ${actionLabel}.`,
  }, config);
  await callTelegramApi("sendMessage", {
    chat_id: config.chatId,
    text: `SendFlow · IP ${action.ipAddress} ${actionLabel} par un administrateur autorisé. Le blocage s’applique aux requêtes reçues par Node.`,
    reply_markup: {
      inline_keyboard: [[{
        text: action.blocked ? `Débloquer ${action.ipAddress}` : `Bloquer ${action.ipAddress}`,
        callback_data: `${action.blocked ? "unblock" : "block"}:${action.ipAddress}`,
      }]],
    },
  }, config);
  return "handled";
}

export async function configureTelegramWebhook(): Promise<boolean> {
  const config = readTelegramConfig();
  if (!config) return false;
  const baseUrl = process.env.PUBLIC_SITE_URL?.trim();
  if (!baseUrl) throw new Error("PUBLIC_SITE_URL is required to configure the Telegram webhook.");
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:") {
    throw new Error("PUBLIC_SITE_URL must use HTTPS to configure the Telegram webhook.");
  }
  const webhookUrl = new URL("/api/security/telegram/webhook", parsed.origin).toString();
  const registered = await callTelegramApi("setWebhook", {
    url: webhookUrl,
    secret_token: config.webhookSecret,
    allowed_updates: ["callback_query"],
  }, config);
  telegramWebhookReady = registered;
  return registered;
}

export function getIpBlockTableSqlForTest(): string {
  return IP_BLOCKS_TABLE_SQL;
}
