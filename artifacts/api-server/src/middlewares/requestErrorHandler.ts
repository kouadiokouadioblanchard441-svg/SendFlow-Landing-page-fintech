import type { ErrorRequestHandler } from "express";

export const requestErrorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next,
) => {
  req.log.error({ err: error }, "Unhandled request error");
  if (res.headersSent) {
    next(error);
    return;
  }

  const isApiRequest = req.path === "/api" || req.path.startsWith("/api/");
  if (isApiRequest) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  res.status(500).type("text/plain").send("Internal server error");
};
