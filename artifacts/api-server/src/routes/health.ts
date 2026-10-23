import { readFile } from "node:fs/promises";
import path from "node:path";
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

async function readBuildId(): Promise<string | null> {
  let buildInfo: string;
  try {
    buildInfo = await readFile(path.resolve(process.cwd(), "build-info.json"), "utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }

  const parsed: unknown = JSON.parse(buildInfo);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("buildId" in parsed) ||
    typeof parsed.buildId !== "string" ||
    parsed.buildId.length === 0
  ) {
    throw new Error("Invalid build-info.json");
  }
  return parsed.buildId;
}

router.get("/healthz", async (_req, res) => {
  const data = HealthCheckResponse.parse({
    status: "ok",
    buildId: await readBuildId(),
  });
  res.json(data);
});

export default router;
