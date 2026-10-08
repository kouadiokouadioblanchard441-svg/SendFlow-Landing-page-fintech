import { constants } from "node:fs";
import { mkdir, open, realpath, type FileHandle } from "node:fs/promises";
import path from "node:path";

const OBJECT_STORAGE_ENDPOINT = 'http://127.0.0.1:1106';
const PLESK_MEDIA_BUCKET = "plesk-media";
const PLESK_MEDIA_SEARCH_PATH = `/${PLESK_MEDIA_BUCKET}/public`;

export type SignedObjectMethod = 'GET' | 'PUT';

export function isPleskMediaStorageEnabled(): boolean {
  return Boolean(process.env.PLESK_MEDIA_DIR?.trim());
}

export function getPleskMediaDirectory(): string | null {
  const configured = process.env.PLESK_MEDIA_DIR?.trim();
  if (!configured) return null;
  if (!path.isAbsolute(configured)) {
    throw new Error("PLESK_MEDIA_DIR must be an absolute path");
  }

  const mediaDirectory = path.resolve(configured);
  if (mediaDirectory === path.parse(mediaDirectory).root) {
    throw new Error("PLESK_MEDIA_DIR cannot be the filesystem root");
  }
  assertOutsideWebRoot(mediaDirectory);
  return mediaDirectory;
}

function assertOutsideWebRoot(mediaDirectory: string): void {
  const webDirectory = path.resolve(
    process.env.WEB_DIST_DIR ?? path.join(process.cwd(), "dist", "public"),
  );
  const relative = path.relative(webDirectory, mediaDirectory);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error("PLESK_MEDIA_DIR must be outside the public web directory");
  }
}

export function getSafePublicObjectSegments(objectName: string): string[] {
  if (
    typeof objectName !== "string" ||
    objectName.length === 0 ||
    objectName.length > 512 ||
    objectName.startsWith("/") ||
    objectName.includes("\\") ||
    objectName.includes("%") ||
    /[\u0000-\u001f\u007f]/.test(objectName)
  ) {
    throw new Error("Invalid public object name");
  }

  const segments = objectName.split("/");
  if (
    segments.length > 24 ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Invalid public object name");
  }
  return segments;
}

export function getPublicObjectSearchPaths(): string[] {
  if (isPleskMediaStorageEnabled()) {
    getPleskMediaDirectory();
    return [PLESK_MEDIA_SEARCH_PATH];
  }

  const paths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (paths.length === 0) {
    throw new Error('PUBLIC_OBJECT_SEARCH_PATHS is not configured');
  }

  return paths;
}

export function parseStoragePath(storagePath: string): {
  bucketName: string;
  objectName: string;
} {
  const normalized = storagePath.startsWith('/')
    ? storagePath
    : `/${storagePath}`;
  const parts = normalized.split('/');
  const bucketName = parts[1];
  const objectName = parts.slice(2).join('/');

  if (!bucketName || !objectName) {
    throw new Error(`Invalid public storage path: ${storagePath}`);
  }

  return { bucketName, objectName };
}

export async function getSignedObjectUrl({
  bucketName,
  objectName,
  method,
}: {
  bucketName: string;
  objectName: string;
  method: SignedObjectMethod;
}): Promise<string> {
  if (isPleskMediaStorageEnabled()) {
    throw new Error("Signed URLs are not used with Plesk filesystem media storage");
  }

  const response = await fetch(
    `${OBJECT_STORAGE_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucket_name: bucketName,
        object_name: objectName,
        method,
        expires_at: new Date(Date.now() + 900_000).toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to sign object URL: ${response.status}`);
  }

  const body = (await response.json()) as { signed_url?: string };
  if (!body.signed_url) {
    throw new Error('Object storage returned no signed URL');
  }

  return body.signed_url;
}

export async function storePleskPublicObject({
  bucketName,
  objectName,
  contents,
}: {
  bucketName: string;
  objectName: string;
  contents: Buffer;
}): Promise<void> {
  if (!isPleskMediaStorageEnabled() || bucketName !== PLESK_MEDIA_BUCKET) {
    throw new Error("Plesk filesystem media storage is not configured");
  }
  const configuredRoot = getPleskMediaDirectory();
  if (!configuredRoot) throw new Error("PLESK_MEDIA_DIR is not configured");

  await mkdir(configuredRoot, { recursive: true, mode: 0o750 });
  const root = await realpath(configuredRoot);
  assertOutsideWebRoot(root);
  const segments = getSafePublicObjectSegments(objectName);
  const parentPath = path.join(root, ...segments.slice(0, -1));
  await mkdir(parentPath, { recursive: true, mode: 0o750 });
  const realParent = await realpath(parentPath);
  const relativeParent = path.relative(root, realParent);
  if (relativeParent.startsWith("..") || path.isAbsolute(relativeParent)) {
    throw new Error("Public object path escaped PLESK_MEDIA_DIR");
  }

  const targetPath = path.join(realParent, segments[segments.length - 1]);
  const noFollow = constants.O_NOFOLLOW ?? 0;
  const file = await open(
    targetPath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow,
    0o640,
  );
  try {
    await file.writeFile(contents);
  } catch (error) {
    await file.close();
    throw error;
  }
  await file.close();
}

export async function openPleskPublicObject({
  bucketName,
  objectName,
}: {
  bucketName: string;
  objectName: string;
}): Promise<{ handle: FileHandle; size: number; lastModified: Date } | null> {
  if (!isPleskMediaStorageEnabled() || bucketName !== PLESK_MEDIA_BUCKET) return null;
  const configuredRoot = getPleskMediaDirectory();
  if (!configuredRoot) return null;
  const segments = getSafePublicObjectSegments(objectName);

  let root: string;
  try {
    root = await realpath(configuredRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  assertOutsideWebRoot(root);

  const candidate = path.resolve(root, ...segments);
  const relativeCandidate = path.relative(root, candidate);
  if (relativeCandidate.startsWith("..") || path.isAbsolute(relativeCandidate)) {
    throw new Error("Public object path escaped PLESK_MEDIA_DIR");
  }

  let realCandidate: string;
  try {
    realCandidate = await realpath(candidate);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const relativeRealCandidate = path.relative(root, realCandidate);
  if (relativeRealCandidate.startsWith("..") || path.isAbsolute(relativeRealCandidate)) {
    throw new Error("Public object resolved outside PLESK_MEDIA_DIR");
  }

  const noFollow = constants.O_NOFOLLOW ?? 0;
  const handle = await open(realCandidate, constants.O_RDONLY | noFollow);
  const stats = await handle.stat();
  if (!stats.isFile()) {
    await handle.close();
    return null;
  }
  return { handle, size: stats.size, lastModified: stats.mtime };
}