import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import {
  assertApiRuntimeEnvironment,
  listenForRequests,
  type PassengerRuntime,
} from "./lib/serverListener";
import { getPleskMediaDirectory } from "./lib/publicObjectStorage";

const passenger = (
  globalThis as typeof globalThis & { PhusionPassenger?: PassengerRuntime }
).PhusionPassenger;
assertApiRuntimeEnvironment(
  passenger,
  process.env.NODE_ENV,
  Boolean(process.env.PLESK_MEDIA_DIR?.trim()),
);
if (passenger) getPleskMediaDirectory();

const server = createServer(app);

server.on("error", (err) => {
  logger.error({ err }, "Error starting HTTP listener");
  process.exit(1);
});

listenForRequests(server, process.env.PORT, passenger, () => {
  logger.info(
    { transport: passenger ? "passenger" : "tcp" },
    "Server listening",
  );
});
