import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { logger } from "./logger";
import {
  getDailyPageViewSummary,
  type DailyPageViewSummary,
} from "./requestAudit";
import { sendTelegramGroupMessage } from "./telegramAudit";

const DAY_MS = 24 * 60 * 60 * 1_000;
const RETRY_INTERVAL_MS = 5 * 60 * 1_000;
const MAX_REPORT_MESSAGE_LENGTH = 3_500;
let schedulerStarted = false;
let midnightTimer: NodeJS.Timeout | undefined;
let retryTimer: NodeJS.Timeout | undefined;

export function previousUtcDate(now: Date): string {
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - 1,
  )).toISOString().slice(0, 10);
}

export function utcDateRange(date: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Daily report date must use YYYY-MM-DD.");
  }
  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) {
    throw new Error("Daily report date is invalid.");
  }
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

function cleanText(value: string | null, maxLength: number): string {
  return (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(utcDateRange(date).start);
}

function formatVisitorLine(visitor: DailyPageViewSummary["visitors"][number]): string {
  const location = [visitor.city, visitor.country]
    .map((value) => cleanText(value, 50))
    .filter(Boolean)
    .join(", ") || "lieu inconnu";
  const network = cleanText(visitor.isp || visitor.network_organization, 70) ||
    "réseau inconnu";
  const browser = [visitor.browser, visitor.platform]
    .map((value) => cleanText(value, 35))
    .filter(Boolean)
    .join("/");
  const device = cleanText(visitor.device, 20);
  const page = cleanText(visitor.page, 60);
  return [
    `• ${visitor.ip_address}`,
    location,
    network,
    browser || "navigateur inconnu",
    device || "appareil inconnu",
    page || "/",
  ].join(" · ").slice(0, 300);
}

export function formatDailyVisitorReport(
  date: string,
  summary: DailyPageViewSummary,
): string[] {
  const dateLabel = formatDate(date);
  const summaryMessage = [
    `📊 Bilan SendFlow — ${dateLabel} (UTC)`,
    `👀 Visites de pages : ${summary.totalViews}`,
    `🌐 IP distinctes : ${summary.uniqueIpCount}`,
    `❔ Visites sans IP fiable : ${summary.unknownIpViews}`,
    summary.uniqueIpCount > 0
      ? "Les détails ci-dessous regroupent les visites par IP, pas par personne."
      : "",
  ].filter(Boolean).join("\n");
  const messages = [summaryMessage];

  if (summary.visitors.length === 0) {
    if (summary.totalViews === 0) {
      messages[0] += "\nAucune visite enregistrée ce jour-là.";
    }
    return messages;
  }

  let chunk: string[] = [];
  let chunkLength = 0;
  const appendChunk = () => {
    if (chunk.length === 0) return;
    messages.push(`👥 Visiteurs par IP — ${dateLabel}\n${chunk.join("\n")}`);
    chunk = [];
    chunkLength = 0;
  };

  for (const visitor of summary.visitors) {
    const line = formatVisitorLine(visitor);
    if (chunk.length > 0 && chunkLength + line.length + 1 > MAX_REPORT_MESSAGE_LENGTH - 80) {
      appendChunk();
    }
    chunk.push(line);
    chunkLength += line.length + 1;
  }
  appendChunk();
  return messages;
}

async function claimReport(date: string, claimToken: string): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO request_audit_daily_report_deliveries
       (report_date, claim_token, claimed_at)
     VALUES ($1, $2, now())
     ON CONFLICT (report_date) DO UPDATE
       SET claim_token = EXCLUDED.claim_token, claimed_at = now()
       WHERE request_audit_daily_report_deliveries.sent_at IS NULL
         AND request_audit_daily_report_deliveries.claimed_at < now() - interval '5 minutes'
     RETURNING report_date`,
    [date, claimToken],
  );
  return result.rowCount === 1;
}

export async function sendDailyVisitorReport(date: string): Promise<boolean> {
  const { start, end } = utcDateRange(date);
  const claimToken = randomUUID();
  try {
    if (!await claimReport(date, claimToken)) return false;
    const summary = await getDailyPageViewSummary(start, end);
    const messages = formatDailyVisitorReport(date, summary);
    for (const message of messages) {
      if (!await sendTelegramGroupMessage(message)) {
        throw new Error("Telegram did not accept the daily visitor report.");
      }
    }
    const marked = await pool.query(
      `UPDATE request_audit_daily_report_deliveries
       SET sent_at = now()
       WHERE report_date = $1 AND claim_token = $2 AND sent_at IS NULL`,
      [date, claimToken],
    );
    return marked.rowCount === 1;
  } catch (error) {
    try {
      await pool.query(
        `DELETE FROM request_audit_daily_report_deliveries
         WHERE report_date = $1 AND claim_token = $2 AND sent_at IS NULL`,
        [date, claimToken],
      );
    } catch (releaseError) {
      logger.warn({ err: releaseError, reportDate: date }, "Daily visitor report claim could not be released.");
    }
    logger.warn({ err: error, reportDate: date }, "Daily visitor report could not be sent.");
    return false;
  }
}

function scheduleNextUtcMidnight(): void {
  const now = new Date();
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  midnightTimer = setTimeout(() => {
    midnightTimer = undefined;
    void sendDailyVisitorReport(previousUtcDate(new Date()));
    scheduleNextUtcMidnight();
  }, Math.max(1_000, nextMidnight - now.getTime()));
  midnightTimer.unref();
}

export function startDailyVisitorReportScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const sendYesterday = () => {
    void sendDailyVisitorReport(previousUtcDate(new Date()));
  };
  sendYesterday();
  retryTimer = setInterval(sendYesterday, RETRY_INTERVAL_MS);
  retryTimer.unref();
  scheduleNextUtcMidnight();
}

export function stopDailyVisitorReportSchedulerForTest(): void {
  schedulerStarted = false;
  if (midnightTimer) clearTimeout(midnightTimer);
  if (retryTimer) clearInterval(retryTimer);
  midnightTimer = undefined;
  retryTimer = undefined;
}
