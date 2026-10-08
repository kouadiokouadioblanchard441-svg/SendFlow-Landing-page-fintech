import { Readable } from 'stream';
import { Router, type IRouter, type Request, type Response } from 'express';
import {
  getPublicObjectSearchPaths,
  getSignedObjectUrl,
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