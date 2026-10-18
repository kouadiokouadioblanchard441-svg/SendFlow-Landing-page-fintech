import path from "node:path";
import { existsSync } from "node:fs";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { isAllowedOrigin } from "./middlewares/security";

const app: Express = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  const isLegacyPrivatePanelUrl = /(^|\/)panel\/[^/]+\/[^/]+\/?$/i.test(req.path);
  res.setHeader("Referrer-Policy", isLegacyPrivatePanelUrl ? "no-referrer" : "strict-origin-when-cross-origin");
  if (isLegacyPrivatePanelUrl) res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Frame-Options", "DENY");
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
      req(req) {
        const path = req.url?.split("?")[0] ?? "";
        const privatePagePath = path.replace(/(\/panel)\/[^/]+\/[^/]+\/?$/i, "$1/[redacted]");
        const unsubscribePath = privatePagePath.replace(
          /(\/api\/newsletter\/unsubscribe)\/[^/]+\/?$/i,
          "$1/[redacted]",
        );
        return {
          id: req.id,
          method: req.method,
          url: path.startsWith("/api/admin/auth/panel/")
            ? "/api/admin/auth/panel/[redacted]"
            : unsubscribePath,
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
  const indexPath = path.join(webDistDir, "index.html");
  if (!isPageRequest || isApiRequest || !existsSync(indexPath)) {
    next();
    return;
  }
  res.sendFile(indexPath);
});

export default app;
