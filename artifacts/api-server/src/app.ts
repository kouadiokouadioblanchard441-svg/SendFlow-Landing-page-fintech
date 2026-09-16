import path from "node:path";
import { existsSync } from "node:fs";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        const path = req.url?.split("?")[0] ?? "";
        return {
          id: req.id,
          method: req.method,
          url: path.startsWith("/api/admin/auth/panel/")
            ? "/api/admin/auth/panel/[redacted]"
            : path,
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
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

const webDistDir = path.resolve(process.env.WEB_DIST_DIR ?? path.join(process.cwd(), "dist", "public"));
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
