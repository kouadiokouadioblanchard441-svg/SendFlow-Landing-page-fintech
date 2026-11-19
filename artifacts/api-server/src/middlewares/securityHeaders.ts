import { randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import { readRecaptchaSettings } from "../lib/recaptcha";

export const SECURITY_HEADERS = {
  contentTypeOptions: "nosniff",
  frameOptions: "DENY",
  hsts: "max-age=31536000",
  permissionsPolicy: "camera=(), microphone=(), geolocation=()",
  referrerPolicy: "strict-origin-when-cross-origin",
} as const;

export const securityHeaders: RequestHandler = (req, res, next) => {
  const nonce = randomBytes(18).toString("base64");
  const recaptchaIsEnabled = readRecaptchaSettings().status === "enabled";
  const recaptchaScriptSources = recaptchaIsEnabled
    ? " https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/"
    : "";
  const recaptchaFrameSources = recaptchaIsEnabled
    ? " https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/"
    : "";
  const recaptchaStyleSources = recaptchaIsEnabled
    ? " https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/"
    : "";
  res.locals.cspNonce = nonce;
  res.setHeader(
    "X-Content-Type-Options",
    SECURITY_HEADERS.contentTypeOptions,
  );
  const isPrivatePanelUrl = /(^|\/)panel(?:\/|$)/i.test(req.path);
  res.setHeader(
    "Referrer-Policy",
    isPrivatePanelUrl ? "no-referrer" : SECURITY_HEADERS.referrerPolicy,
  );
  if (isPrivatePanelUrl) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  res.setHeader("X-Frame-Options", SECURITY_HEADERS.frameOptions);
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      `frame-src 'self'${recaptchaFrameSources}`,
      "object-src 'none'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${recaptchaScriptSources}`,
      `script-src-elem 'self' 'nonce-${nonce}' 'strict-dynamic'${recaptchaScriptSources}`,
      "script-src-attr 'none'",
      // Inline styles are limited to style directives because the UI uses dynamic CMS colors/positions and two inline style blocks; script directives remain nonce-only.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://fonts.cdnfonts.com${recaptchaStyleSources}`,
      "style-src-attr 'unsafe-inline'",
      "font-src 'self' data: https://fonts.gstatic.com https://fonts.cdnfonts.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      `connect-src 'self'${recaptchaScriptSources}`,
      "manifest-src 'self'",
      "worker-src 'self' blob:",
    ].join("; "),
  );
  res.setHeader("Permissions-Policy", SECURITY_HEADERS.permissionsPolicy);
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", SECURITY_HEADERS.hsts);
  }
  next();
};
