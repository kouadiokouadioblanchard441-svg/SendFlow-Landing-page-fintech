import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { listenForRequests, type PassengerRuntime } from "./lib/serverListener";

const passenger = (
  globalThis as typeof globalThis & { PhusionPassenger?: PassengerRuntime }
).PhusionPassenger;
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
