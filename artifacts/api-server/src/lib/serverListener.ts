import type { Server } from "node:http";

export interface PassengerRuntime {
  configure(options: { autoInstall: boolean }): void;
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
