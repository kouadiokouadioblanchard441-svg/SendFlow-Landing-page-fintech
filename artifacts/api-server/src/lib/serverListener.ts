import type { Server } from "node:http";

export interface PassengerRuntime {
  configure(options: { autoInstall: boolean }): void;
}

export function assertApiRuntimeEnvironment(
  passenger: PassengerRuntime | undefined,
  nodeEnv: string | undefined,
  pleskMediaConfigured: boolean,
): void {
  if (nodeEnv !== "production" && nodeEnv !== "development") {
    throw new Error(
      "NODE_ENV must be explicitly set to production or development before starting the API.",
    );
  }

  if (passenger && nodeEnv !== "production") {
    throw new Error(
      "Passenger requires NODE_ENV=production. Set the Plesk Node.js application mode to production.",
    );
  }

  if (passenger && !pleskMediaConfigured) {
    throw new Error(
      "Passenger requires PLESK_MEDIA_DIR. Configure a persistent absolute directory outside the public document root.",
    );
  }
}

/**
 * Passenger owns the listening socket. Only standalone Node processes require
 * a numeric PORT; validating it before detecting Passenger prevents startup.
 */
export function listenForRequests(
  server: Server,
  rawPort: string | undefined,
  passenger: PassengerRuntime | undefined,
  onListening: () => void,
): void {
  if (passenger) {
    passenger.configure({ autoInstall: false });
    server.listen("passenger", onListening);
    return;
  }

  if (!rawPort) {
    throw new Error("PORT environment variable is required outside Passenger.");
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535 outside Passenger.");
  }

  server.listen(port, "0.0.0.0", onListening);
}
