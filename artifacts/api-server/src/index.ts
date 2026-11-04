import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import {
  assertApiRuntimeEnvironment,
  listenForRequests,
  type PassengerRuntime,
} from "./lib/serverListener";
import { getPleskMediaDirectory } from "./lib/publicObjectStorage";
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
      try {
        await initializeIpBlockStore();
      } catch (error) {
        logger.error(
          { err: error },
          "Telegram notifications are enabled, but persistent IP blocking is unavailable.",
        );
      }
      if (
        process.env.TELEGRAM_AUTO_CONFIGURE_WEBHOOK?.trim().toLowerCase() === "true" &&
        isIpBlockStoreReady()
      ) {
        const configured = await configureTelegramWebhook();
        if (!configured) {
          logger.warn("Telegram webhook registration failed; bot callbacks will not arrive until configured.");
        } else {
          logger.info("Telegram webhook registered.");
        }
      } else if (process.env.TELEGRAM_AUTO_CONFIGURE_WEBHOOK?.trim().toLowerCase() === "true") {
        logger.warn("Telegram webhook was not registered because the IP block store is unavailable.");
      } else {
        logger.info("Telegram notifications are enabled; webhook controls require explicit webhook configuration.");
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
