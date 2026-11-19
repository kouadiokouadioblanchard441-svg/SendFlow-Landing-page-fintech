import { isIP } from "node:net";
import { createHmac, timingSafeEqual } from "node:crypto";
import { pool } from "@workspace/db";
import { logger } from "./logger";
import { getPublicSiteUrl } from "./publicSiteUrl";
import {
  REQUEST_AUDIT_RETENTION_DAYS,
  listRecentRequests,
  listRecentVisitors,
  type RecentRequest,
  type RecentVisitor,
} from "./requestAudit";

export type PublicActivityKind = "page_view" | "click" | "form_submit" | "http_request";

export type AuditEvent = {
  kind: PublicActivityKind | "security";
  page: string;
  ip: string | null;
  target?: string;
  status?: number;
  method?: string;
  country?: string | null;
  city?: string | null;
  asn?: number | null;
  networkOrganization?: string | null;
  isp?: string | null;
  connectionType?: string | null;
  mobileCountryCode?: string | null;
  mobileNetworkCode?: string | null;
  browser?: string | null;
  platform?: string | null;
  device?: string | null;
  occurredAt?: Date | string;
  isNewVisitor?: boolean;
};

export type TelegramConfig = {
  botToken: string;
  chatId: string;
  webhookSecret: string;
};

const IP_BLOCKS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS security_ip_blocks (
  ip_address varchar(45) PRIMARY KEY,
  blocked_by_telegram_user_id varchar(32) NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now()
)`;
const MAX_QUEUED_EVENTS = 240;
const MAX_BATCH_EVENTS = 10;
const MAX_TELEGRAM_MESSAGE_LENGTH = 3_500;
const BATCH_DELAY_MS = 5_000;
const UNAVAILABLE_CLIENT_IP =
  "IP indisponible — Node ne reçoit pas d’adresse publique fiable via Plesk";
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
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken && !chatId) return null;

  if (!botToken || !chatId) {
    const missing = [
      !botToken && "TELEGRAM_BOT_TOKEN",
      !chatId && "TELEGRAM_CHAT_ID",
    ].filter((name): name is string => Boolean(name));
    throw new Error(`Telegram audit is enabled but required settings are missing: ${missing.join(", ")}`);
  }

  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken)) {
    throw new Error("TELEGRAM_BOT_TOKEN has an invalid format.");
  }
  if (!/^-?\d+$/.test(chatId)) {
    throw new Error("TELEGRAM_CHAT_ID must be a numeric Telegram chat ID.");
  }

  return {
    botToken,
    chatId,
    webhookSecret: deriveTelegramWebhookSecret(botToken),
  };
}

export function deriveTelegramWebhookSecret(botToken: string): string {
  return createHmac("sha256", botToken)
    .update("sendflow-telegram-webhook-v1")
    .digest("hex");
}

export function isTelegramWebhookAuthorized(
  suppliedSecret: string | undefined,
  expectedSecret: string,
): boolean {
  if (!suppliedSecret || suppliedSecret.length !== expectedSecret.length) return false;
  return timingSafeEqual(Buffer.from(suppliedSecret), Buffer.from(expectedSecret));
}

export function isTelegramAdministratorStatus(status: unknown): boolean {
  return status === "creator" || status === "administrator";
}

export function isAuthorizedTelegramGroupAdmin(
  callbackChatId: string,
  configuredChatId: string,
  memberStatus: unknown,
): boolean {
  return callbackChatId === configuredChatId &&
    isTelegramAdministratorStatus(memberStatus);
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

export async function getTelegramChatMemberStatus(
  userId: string,
  config: TelegramConfig,
  request: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await request(
      `https://api.telegram.org/bot${config.botToken}/getChatMember`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: config.chatId, user_id: userId }),
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) {
      logger.warn({ statusCode: response.status, method: "getChatMember" }, "Telegram API request failed");
      return null;
    }
    const result = await response.json() as {
      ok?: unknown;
      result?: { status?: unknown };
    };
    if (result.ok !== true || typeof result.result?.status !== "string") {
      logger.warn({ method: "getChatMember" }, "Telegram API rejected a membership check");
      return null;
    }
    return result.result.status;
  } catch {
    logger.warn({ method: "getChatMember" }, "Telegram membership check could not be completed");
    return null;
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

export function formatAuditEvent(event: AuditEvent): string {
  const timestamp = event.occurredAt
    ? formatAuditTime(event.occurredAt)
    : formatAuditTime(new Date());
  const location = [event.city, event.country].filter(Boolean).join(", ");
  const network = event.isp || event.networkOrganization || "";
  const browser = [
    event.browser,
    event.platform ? `(${event.platform})` : "",
  ].filter(Boolean).join(" ");
  if (event.kind === "page_view" && event.isNewVisitor) {
    return [
      "🆕 Nouvelle IP — visite vitrine",
      `🌐 Nouvelle IP : ${event.ip ?? UNAVAILABLE_CLIENT_IP}`,
      `📍 Localisation : ${location || "indisponible (IP ou base GeoIP non reconnue)"}`,
      `🏢 FAI : ${network || "non déterminé par la base réseau"}`,
      `💻 Navigateur déclaré : ${browser || "indéterminé"}`,
      `📱 Appareil estimé : ${event.device || "indéterminé"}`,
      `🕒 Date : ${timestamp}`,
      `⚠️ Première apparition connue sur la vitrine dans les ${REQUEST_AUDIT_RETENTION_DAYS} jours conservés.`,
      `📄 Page : ${event.page.slice(0, 120)}`,
    ].join("\n");
  }

  const parts = [
    event.kind === "security"
      ? "Alerte sécurité"
      : event.kind === "http_request"
        ? `${event.method ?? "HTTP"} ${event.page.slice(0, 70)}`
        : `${event.kind} ${event.page.slice(0, 70)}`,
    event.target ? `action=${event.target}` : "",
    event.status ? `HTTP ${event.status}` : "",
    event.ip ? `IP ${event.ip}` : UNAVAILABLE_CLIENT_IP,
    location.slice(0, 70),
    network ? `réseau/FAI ${network.slice(0, 50)}` : "",
    event.connectionType ? `connexion ${event.connectionType.slice(0, 30)}` : "",
    browser ? `navigateur déclaré ${browser.slice(0, 60)}` : "",
    event.device ? `appareil estimé ${event.device.slice(0, 30)}` : "",
    `date ${timestamp}`,
    event.mobileCountryCode && event.mobileNetworkCode
      ? `MCC/MNC ${event.mobileCountryCode}/${event.mobileNetworkCode}`
      : "",
    !event.isp && event.asn ? `ASN ${event.asn}` : "",
  ].filter(Boolean);
  return parts.join(" · ").slice(0, 300);
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
    const line = formatAuditEvent(event);
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

export function parseTelegramAuditCommand(
  text: unknown,
): { command: "visiteurs" | "requetes"; page: number } | null {
  if (typeof text !== "string") return null;
  const match = /^\/(visiteurs|requetes)(?:@[A-Za-z0-9_]+)?(?:\s+([1-9]\d{0,7}))?\s*$/i.exec(text.trim());
  if (!match) return null;
  return {
    command: match[1].toLowerCase() as "visiteurs" | "requetes",
    page: Math.min(10_000, Number(match[2] ?? "1")),
  };
}

function formatAuditTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "date inconnue";
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${formatted} UTC`;
}

function visitorLocation(visitor: RecentVisitor): string {
  const location = [visitor.city, visitor.region, visitor.country]
    .filter((part): part is string => Boolean(part))
    .join(", ")
    .slice(0, 160);
  const network = [
    visitor.isp ? `opérateur/FAI ${visitor.isp}` : "",
    visitor.connection_type ? `connexion ${visitor.connection_type}` : "",
    visitor.mobile_country_code && visitor.mobile_network_code
      ? `MCC/MNC ${visitor.mobile_country_code}/${visitor.mobile_network_code}`
      : "",
    !visitor.isp && visitor.asn ? `ASN ${visitor.asn}` : "",
    !visitor.isp && visitor.network_organization ? visitor.network_organization : "",
  ].filter(Boolean).join(" ").slice(0, 140);
  const client = [
    visitor.browser,
    visitor.platform ? `(${visitor.platform})` : "",
    visitor.device ? `· ${visitor.device}` : "",
  ].filter(Boolean).join(" ");
  return [location || "localisation indisponible", network, client].filter(Boolean).join(" · ");
}

export function formatVisitorReport(
  rows: RecentVisitor[],
  total: number,
  page: number,
  pageSize = 6,
): string {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const entries = rows.map((visitor) =>
    `• ${visitor.ip_address} · ${visitorLocation(visitor)} · première visite ${formatAuditTime(visitor.first_seen)} · vu ${formatAuditTime(visitor.last_seen)}`);
  return [
    `Visiteurs uniques (${REQUEST_AUDIT_RETENTION_DAYS} jours) · page ${page}/${totalPages} · total ${total}`,
    ...(entries.length ? entries : ["Aucun visiteur connu pour cette page."]),
    "Commande : /visiteurs 2 pour la page suivante.",
  ].join("\n").slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);
}

export function formatRequestReport(
  rows: RecentRequest[],
  total: number,
  page: number,
  pageSize = 6,
): string {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const entries = rows.map((request) => {
    const location = [request.city, request.country].filter(Boolean).join(", ");
    const network = [
      request.isp ? `opérateur/FAI ${request.isp}` : "",
      request.connection_type ? `connexion ${request.connection_type}` : "",
      request.mobile_country_code && request.mobile_network_code
        ? `MCC/MNC ${request.mobile_country_code}/${request.mobile_network_code}`
        : "",
      !request.isp && request.asn ? `ASN ${request.asn}` : "",
      !request.isp && request.network_organization ? request.network_organization : "",
    ].filter(Boolean).join(" ").slice(0, 140);
    const client = [
      request.browser,
      request.platform ? `(${request.platform})` : "",
      request.device ? `· ${request.device}` : "",
    ].filter(Boolean).join(" ");
    return [
      `• ${formatAuditTime(request.created_at)} · ${request.method} ${request.route.slice(0, 120)} · ${request.status}`,
      request.ip_address ? `IP ${request.ip_address}` : UNAVAILABLE_CLIENT_IP,
      location,
      network,
      client,
    ].filter(Boolean).join(" · ");
  });
  return [
    `Requêtes Node/Express (${REQUEST_AUDIT_RETENTION_DAYS} jours) · page ${page}/${totalPages} · total ${total}`,
    ...(entries.length ? entries : ["Aucune requête connue pour cette page."]),
    "Commande : /requetes 2 pour la page suivante.",
  ].join("\n").slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);
}

type TelegramUpdateDependencies = {
  request?: typeof fetch;
  listVisitors?: typeof listRecentVisitors;
  listRequests?: typeof listRecentRequests;
};

async function handleAuditCommand(
  message: unknown,
  config: TelegramConfig,
  dependencies: TelegramUpdateDependencies,
): Promise<"ignored" | "handled"> {
  if (typeof message !== "object" || message === null) return "ignored";
  const data = message as {
    text?: unknown;
    from?: { id?: unknown } | null;
    chat?: { id?: unknown; type?: unknown } | null;
  };
  const command = parseTelegramAuditCommand(data.text);
  const userId = typeof data.from?.id === "number" ? String(data.from.id) : "";
  const chatId =
    typeof data.chat?.id === "number" || typeof data.chat?.id === "string"
      ? String(data.chat.id)
      : "";
  if (
    !command ||
    !["group", "supergroup"].includes(String(data.chat?.type)) ||
    chatId !== config.chatId ||
    !/^\d{1,20}$/.test(userId)
  ) return "ignored";
  const status = await getTelegramChatMemberStatus(userId, config, dependencies.request);
  if (!isAuthorizedTelegramGroupAdmin(chatId, config.chatId, status)) return "ignored";

  const pageSize = 6;
  const report = command.command === "visiteurs"
    ? await (dependencies.listVisitors ?? listRecentVisitors)(command.page, pageSize).then(({ rows, total }) =>
      formatVisitorReport(rows, total, command.page, pageSize))
    : await (dependencies.listRequests ?? listRecentRequests)(command.page, pageSize).then(({ rows, total }) =>
      formatRequestReport(rows, total, command.page, pageSize));
  await callTelegramApi("sendMessage", {
    chat_id: config.chatId,
    text: report,
    disable_web_page_preview: true,
  }, config, dependencies.request);
  return "handled";
}

export async function handleTelegramUpdate(
  update: unknown,
  dependencies: TelegramUpdateDependencies = {},
): Promise<"ignored" | "handled"> {
  const config = readTelegramConfig();
  if (!config || typeof update !== "object" || update === null) return "ignored";
  const updateData = update as { callback_query?: unknown; message?: unknown };
  if (updateData.message !== undefined) {
    return handleAuditCommand(updateData.message, config, dependencies);
  }
  const callback = updateData.callback_query;
  if (typeof callback !== "object" || callback === null) return "ignored";

  const query = callback as {
    id?: unknown;
    data?: unknown;
    from?: { id?: unknown } | null;
    message?: { chat?: { id?: unknown; type?: unknown } | null } | null;
  };
  const callbackId = typeof query.id === "string" ? query.id : "";
  const userId = typeof query.from?.id === "number" ? String(query.from.id) : "";
  const callbackChatId =
    typeof query.message?.chat?.id === "number" || typeof query.message?.chat?.id === "string"
      ? String(query.message.chat.id)
      : "";
  const callbackChatType = String(query.message?.chat?.type ?? "");
  if (
    !["group", "supergroup"].includes(callbackChatType) ||
    callbackChatId !== config.chatId
  ) return "ignored";
  const action = parseCallback(query.data);
  const memberStatus = callbackId &&
      action &&
      /^\d{1,20}$/.test(userId)
    ? await getTelegramChatMemberStatus(userId, config, dependencies.request)
    : null;
  if (
    !callbackId ||
    !action ||
    !isAuthorizedTelegramGroupAdmin(callbackChatId, config.chatId, memberStatus)
  ) {
    if (callbackId) {
      await callTelegramApi("answerCallbackQuery", {
        callback_query_id: callbackId,
        text: "Action non autorisée.",
        show_alert: true,
      }, config, dependencies.request);
    }
    return "ignored";
  }

  await setIpBlocked(action.ipAddress, userId, action.blocked);
  const actionLabel = action.blocked ? "bloquée" : "débloquée";
  await callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackId,
    text: `Adresse IP ${actionLabel}.`,
  }, config, dependencies.request);
  await callTelegramApi("sendMessage", {
    chat_id: config.chatId,
    text: `SendFlow · IP ${action.ipAddress} ${actionLabel} par un administrateur autorisé. Le blocage s’applique aux requêtes reçues par Node.`,
    reply_markup: {
      inline_keyboard: [[{
        text: action.blocked ? `Débloquer ${action.ipAddress}` : `Bloquer ${action.ipAddress}`,
        callback_data: `${action.blocked ? "unblock" : "block"}:${action.ipAddress}`,
      }]],
    },
  }, config, dependencies.request);
  return "handled";
}

export async function configureTelegramWebhook(
  request: typeof fetch = fetch,
): Promise<boolean> {
  const config = readTelegramConfig();
  if (!config) return false;
  const baseUrl = getPublicSiteUrl() ??
    (process.env.NODE_ENV === "production" ? "https://sendflow.africa" : undefined);
  if (!baseUrl) {
    logger.warn("Telegram webhook was not registered because the public site URL is not configured.");
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    logger.warn("Telegram webhook was not registered because the public site URL is invalid.");
    return false;
  }
  if (parsed.protocol !== "https:") {
    logger.warn("Telegram webhook was not registered because the public site URL is not HTTPS.");
    return false;
  }
  const webhookUrl = new URL("/api/security/telegram/webhook", parsed.origin).toString();
  const registered = await callTelegramApi("setWebhook", {
    url: webhookUrl,
    secret_token: config.webhookSecret,
    allowed_updates: ["callback_query", "message"],
  }, config, request);
  if (registered) {
    await callTelegramApi("setMyCommands", {
      commands: [
        { command: "visiteurs", description: "Voir les visiteurs des 90 derniers jours" },
        { command: "requetes", description: "Parcourir les requêtes Node/Express" },
      ],
      scope: { type: "chat_administrators", chat_id: config.chatId },
    }, config, request);
  }
  telegramWebhookReady = registered;
  return registered;
}

export function getIpBlockTableSqlForTest(): string {
  return IP_BLOCKS_TABLE_SQL;
}
