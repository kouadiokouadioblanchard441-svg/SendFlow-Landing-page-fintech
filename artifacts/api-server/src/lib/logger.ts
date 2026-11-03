import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const sensitiveAssignment =
  /\b(authorization|cookie|password|passwd|secret|token|private[-_]?key|api[-_]?key|database[-_]?url|connection(?:string|[-_]string)?|session[-_]?secret)\s*[:=]\s*(?:(?:bearer|basic)\s+)?("[^"]*"|'[^']*'|[^\s,;]+)/gi;

export function sanitizeLogText(value: string): string {
  return value
    .replace(
      /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/gi,
      "[REDACTED PRIVATE KEY]",
    )
    .replace(
      /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'`]+/gi,
      "$1://[REDACTED]",
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(sensitiveAssignment, "$1=[REDACTED]")
    .replace(
      /([?&](?:token|secret|key|code|password|signature)=)[^&#\s]+/gi,
      "$1[REDACTED]",
    )
    .slice(0, 8_000);
}

export function serializeSafeError(value: unknown) {
  const error =
    value && typeof value === "object"
      ? (value as { name?: unknown; message?: unknown; stack?: unknown })
      : undefined;
  const type =
    typeof error?.name === "string" && error.name.trim()
      ? sanitizeLogText(error.name)
      : "Error";
  const message =
    typeof error?.message === "string"
      ? sanitizeLogText(error.message)
      : sanitizeLogText(String(value));
  const stack =
    typeof error?.stack === "string"
      ? sanitizeLogText(error.stack.split(/\r?\n/).slice(1).join("\n"))
      : undefined;

  return { type, message, ...(stack ? { stack } : {}) };
}

export function sanitizeRequestUrl(rawUrl: string | undefined): string {
  const path = rawUrl?.split("?")[0] ?? "";
  if (path.startsWith("/api/admin/auth/panel/")) {
    return "/api/admin/auth/panel/[redacted]";
  }

  return path
    .replace(/(\/panel)(?:\/[^/]+)+\/?$/i, "$1/[redacted]")
    .replace(/(\/api\/newsletter\/unsubscribe)\/[^/]+\/?$/i, "$1/[redacted]")
    .replace(/(\/api\/newsletter\/confirm)\/[^/]+\/?$/i, "$1/[redacted]");
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  serializers: {
    err: serializeSafeError,
  },
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
