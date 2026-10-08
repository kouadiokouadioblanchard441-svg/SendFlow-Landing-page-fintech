import { Readable } from 'stream';
import path from 'node:path';
import { Router, type IRouter, type Request, type Response } from 'express';
import {
  getPublicObjectSearchPaths,
  getSignedObjectUrl,
  isPleskMediaStorageEnabled,
  openPleskPublicObject,
  parseStoragePath,
} from '../lib/publicObjectStorage';
import { createRateLimiter } from '../middlewares/security';

const router: IRouter = Router();
const publicObjectRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
});

router.get(
  '/storage/public-objects/*filePath',
  publicObjectRateLimit,
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const pathSegments = filePath?.split("/") ?? [];
      if (
        !filePath ||
        filePath.length > 512 ||
        pathSegments.length > 24 ||
        filePath.startsWith("/") ||
        filePath.includes("\\") ||
        /[\u0000-\u001f\u007f]/.test(filePath) ||
        pathSegments.some((segment) => !segment || segment === "." || segment === "..")
      ) {
        res.status(400).json({ error: "Invalid file path" });
        return;
      }

      for (const searchPath of getPublicObjectSearchPaths()) {
        const { bucketName, objectName } = parseStoragePath(
          `${searchPath}/${filePath}`,
        );
        if (isPleskMediaStorageEnabled()) {
          const localObject = await openPleskPublicObject({ bucketName, objectName });
          if (!localObject) continue;

          const extension = path.extname(objectName).toLowerCase();
          const contentTypes: Record<string, string> = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
          };
          const contentType = contentTypes[extension] ?? "application/octet-stream";
          res.setHeader("Content-Type", contentType);
          res.setHeader("Content-Length", localObject.size);
          res.setHeader("Last-Modified", localObject.lastModified.toUTCString());
          res.setHeader("Cache-Control", "public, max-age=86400, immutable");
          res.setHeader("X-Content-Type-Options", "nosniff");
          if (contentType === "image/svg+xml") {
            res.setHeader("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
          }
          localObject.handle.createReadStream()
            .on("error", (error) => {
              req.log.warn({ errorType: error.name }, "Error streaming local public object");
              if (res.headersSent) res.destroy(error);
              else res.status(500).end();
            })
            .pipe(res);
          return;
        }

        const response = await fetch(
          await getSignedObjectUrl({
            bucketName,
            objectName,
            method: 'GET',
          }),
        );

        if (response.status === 404) {
          continue;
        }

        if (!response.ok || !response.body) {
          throw new Error(`Failed to read public object: ${response.status}`);
        }

        res.status(response.status);
        for (const header of ["cache-control", "content-length", "content-type", "etag", "last-modified"]) {
          const value = response.headers.get(header);
          if (value) res.setHeader(header, value);
        }
        const contentType = response.headers.get("content-type") ?? "";
        res.setHeader("X-Content-Type-Options", "nosniff");
        if (/^image\/svg\+xml(?:;|$)/i.test(contentType)) {
          res.setHeader("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
        }
        Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
        return;
      }

      res.status(404).json({ error: 'File not found' });
    } catch (error) {
      req.log.warn(
        { errorType: error instanceof Error ? error.name : "UnknownError" },
        'Error serving public object',
      );
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

export default router;