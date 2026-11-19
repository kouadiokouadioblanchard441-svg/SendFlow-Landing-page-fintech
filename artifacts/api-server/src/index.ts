import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import {
  assertApiRuntimeEnvironment,
  listenForRequests,
  type PassengerRuntime,
} from "./lib/serverListener";
import { getPleskMediaDirectory } from "./lib/publicObjectStorage";
import { initializeGeoIpDatabases } from "./lib/geoIp";
import { initializeRequestAuditStore } from "./lib/requestAudit";
import { startDailyVisitorReportScheduler } from "./lib/dailyVisitorReport";
import {
  configureTelegramWebhook,
  initializeIpBlockStore,
  isIpBlockStoreReady,
  readTelegramConfig,
} from "./lib/telegramAudit";

const passenger = (
  globalThis as typeof globalThis & { PhusionPassenger?: PassengerRuntime }
).PhusionPassenger;
const server = createServer(app);

server.on("error", (err) => {
  logger.error({ err }, "Error starting HTTP listener");
  process.exit(1);
});

async function startServer(): Promise<void> {
  try {
    assertApiRuntimeEnvironment(
      passenger,
      process.env.NODE_ENV,
      Boolean(process.env.PLESK_MEDIA_DIR?.trim()),
    );
    if (passenger) getPleskMediaDirectory();

    if (readTelegramConfig()) {
      await initializeGeoIpDatabases();
      try {
        await initializeRequestAuditStore();
        startDailyVisitorReportScheduler();
      } catch (error) {
        logger.error(
          { err: error },
          "Telegram request history is unavailable; request records will not be stored.",
        );
      }
      try {
        await initializeIpBlockStore();
      } catch (error) {
        logger.error(
          { err: error },
          "Telegram notifications are enabled, but persistent IP blocking is unavailable.",
        );
      }
      if (isIpBlockStoreReady()) {
        const configured = await configureTelegramWebhook();
        if (!configured) {
          logger.warn("Telegram webhook registration failed; bot callbacks will not arrive until configured.");
        } else {
          logger.info("Telegram webhook registered.");
        }
      } else {
        logger.warn("Telegram webhook was not registered because the IP block store is unavailable.");
      }
    }
  } catch (error) {
    logger.fatal({ err: error }, "API runtime configuration failed");
    process.exit(1);
    return;
  }

  listenForRequests(server, process.env.PORT, passenger, () => {
    logger.info(
      { transport: passenger ? "passenger" : "tcp" },
      "Server listening",
    );
  });
}

void startServer();
