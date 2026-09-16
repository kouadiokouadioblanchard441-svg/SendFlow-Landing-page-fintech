import { spawn } from "node:child_process";

const baseEnv = { ...process.env, NODE_ENV: "development" };
const api = spawn("pnpm", ["--filter", "@workspace/api-server", "run", "dev"], {
  env: { ...baseEnv, PORT: process.env.API_PORT ?? "8080" },
  stdio: "inherit",
});
const web = spawn("pnpm", ["--filter", "@workspace/sendflow", "run", "dev"], {
  env: {
    ...baseEnv,
    PORT: process.env.WEB_PORT ?? "26095",
    BASE_PATH: process.env.BASE_PATH ?? "/",
    API_ORIGIN: process.env.API_ORIGIN ?? "http://127.0.0.1:8080",
  },
  stdio: "inherit",
});

let shuttingDown = false;
const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  api.kill("SIGTERM");
  web.kill("SIGTERM");
  setTimeout(() => process.exit(code), 250);
};

api.on("exit", (code, signal) => {
  if (!shuttingDown) {
    console.error(`API process stopped (${signal ?? code ?? "unknown"}).`);
    shutdown(code ?? 1);
  }
});
web.on("exit", (code, signal) => {
  if (!shuttingDown) {
    console.error(`Web process stopped (${signal ?? code ?? "unknown"}).`);
    shutdown(code ?? 1);
  }
});

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());