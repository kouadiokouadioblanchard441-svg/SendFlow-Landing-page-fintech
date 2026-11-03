import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger, sanitizeRequestUrl, serializeSafeError } from "./lib/logger";
import { readRecaptchaSettings } from "./lib/recaptcha";
import { isAllowedOrigin } from "./middlewares/security";
import { requestErrorHandler } from "./middlewares/requestErrorHandler";

const app: Express = express();
app.set("trust proxy", false);
app.disable("x-powered-by");
app.use((req, res, next) => {
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
  res.setHeader("X-Content-Type-Options", "nosniff");
  const isLegacyPrivatePanelUrl = /(^|\/)panel\/[^/]+\/[^/]+\/?$/i.test(req.path);
  res.setHeader("Referrer-Policy", isLegacyPrivatePanelUrl ? "no-referrer" : "strict-origin-when-cross-origin");
  if (isLegacyPrivatePanelUrl) res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Frame-Options", "DENY");
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
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      err: serializeSafeError,
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: sanitizeRequestUrl(req.url),
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    callback(null, !origin || isAllowedOrigin(origin));
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb", parameterLimit: 100 }));
app.use("/api", router);
app.use((req, res, next) => {
  if (req.path !== "/api" && !req.path.startsWith("/api/")) {
    next();
    return;
  }
  res.status(404).json({ error: "API route not found" });
});

const pleskWebDistDir = path.join(process.cwd(), "public");
const workspaceWebDistDir = path.join(process.cwd(), "dist", "public");
const defaultWebDistDir = existsSync(pleskWebDistDir)
  ? pleskWebDistDir
  : workspaceWebDistDir;
const webDistDir = path.resolve(process.env.WEB_DIST_DIR ?? defaultWebDistDir);
app.use(express.static(webDistDir, { index: false }));
app.use((req, res, next) => {
  const isPageRequest = req.method === "GET" || req.method === "HEAD";
  const isApiRequest = req.path === "/api" || req.path.startsWith("/api/");
  const defaultIndexPath = path.join(webDistDir, "index.html");
  if (!isPageRequest || isApiRequest || !existsSync(defaultIndexPath)) {
    next();
    return;
  }

  const routeDirectory = path.resolve(webDistDir, `.${req.path}`);
  const routeIndexPath = path.join(routeDirectory, "index.html");
  const webRootPrefix = `${webDistDir}${path.sep}`;
  const indexPath =
    routeIndexPath.startsWith(webRootPrefix) && existsSync(routeIndexPath)
      ? routeIndexPath
      : defaultIndexPath;
  const nonce = res.locals.cspNonce as string;
  readFile(indexPath, "utf8")
    .then((html) => {
      res.setHeader("Cache-Control", "no-store");
      const noncedHtml = html
        .split("__SEND_FLOW_CSP_NONCE__")
        .join(nonce)
        .replace(
          /<script\b(?=[^>]*\btype=["']module["'])(?![^>]*\bnonce=)[^>]*>/gi,
          (scriptTag) => scriptTag.replace(/>$/, ` nonce="${nonce}">`),
        );
      res.type("html").send(noncedHtml);
    })
    .catch(next);
});

app.use(requestErrorHandler);

export default app;
