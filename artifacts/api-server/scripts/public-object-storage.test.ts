import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  getPleskMediaDirectory,
  getSafePublicObjectSegments,
  openPleskPublicObject,
  storePleskPublicObject,
} from "../src/lib/publicObjectStorage.ts";

test("public object paths accept safe nested names and reject traversal or encoded paths", () => {
  assert.deepEqual(
    getSafePublicObjectSegments("public/landing/admin/image-01.webp"),
    ["public", "landing", "admin", "image-01.webp"],
  );
  for (const unsafe of [
    "../private.txt",
    "public/../private.txt",
    "public/%2e%2e/private.txt",
    "public//image.png",
    "public\\image.png",
    "/absolute/image.png",
    "public/\u0000image.png",
  ]) {
    assert.throws(() => getSafePublicObjectSegments(unsafe), /Invalid public object name/);
  }
});

test("Plesk media directory must be absolute and outside the public build", () => {
  const originalMediaDir = process.env.PLESK_MEDIA_DIR;
  const originalWebDir = process.env.WEB_DIST_DIR;
  const webDir = path.resolve(process.cwd(), "dist", "public");
  try {
    process.env.WEB_DIST_DIR = webDir;
    process.env.PLESK_MEDIA_DIR = path.resolve(process.cwd(), "private", "media");
    assert.equal(getPleskMediaDirectory(), path.resolve(process.cwd(), "private", "media"));

    process.env.PLESK_MEDIA_DIR = path.join(webDir, "media");
    assert.throws(() => getPleskMediaDirectory(), /outside the public web directory/);

    process.env.PLESK_MEDIA_DIR = "relative/media";
    assert.throws(() => getPleskMediaDirectory(), /absolute path/);
  } finally {
    if (originalMediaDir === undefined) delete process.env.PLESK_MEDIA_DIR;
    else process.env.PLESK_MEDIA_DIR = originalMediaDir;
    if (originalWebDir === undefined) delete process.env.WEB_DIST_DIR;
    else process.env.WEB_DIST_DIR = originalWebDir;
  }
});

test("Plesk media storage writes and reads files while rejecting symlink escapes", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "sendflow-media-test-"));
  const originalMediaDir = process.env.PLESK_MEDIA_DIR;
  const originalWebDir = process.env.WEB_DIST_DIR;
  const mediaDirectory = path.join(temporaryRoot, "private-media");
  try {
    process.env.PLESK_MEDIA_DIR = mediaDirectory;
    process.env.WEB_DIST_DIR = path.join(temporaryRoot, "public");
    const contents = Buffer.from("isolated local media object");
    const objectName = "public/landing/admin/test-image.png";

    await storePleskPublicObject({
      bucketName: "plesk-media",
      objectName,
      contents,
    });

    const object = await openPleskPublicObject({ bucketName: "plesk-media", objectName });
    assert.ok(object);
    assert.equal(object.size, contents.length);
    assert.deepEqual(await object.handle.readFile(), contents);
    await object.handle.close();

    const outsideDirectory = path.join(temporaryRoot, "outside");
    await mkdir(outsideDirectory);
    await writeFile(path.join(outsideDirectory, "secret.png"), "not public");
    await symlink(outsideDirectory, path.join(mediaDirectory, "public", "escape"));
    await assert.rejects(
      openPleskPublicObject({
        bucketName: "plesk-media",
        objectName: "public/escape/secret.png",
      }),
      /outside PLESK_MEDIA_DIR/,
    );
  } finally {
    if (originalMediaDir === undefined) delete process.env.PLESK_MEDIA_DIR;
    else process.env.PLESK_MEDIA_DIR = originalMediaDir;
    if (originalWebDir === undefined) delete process.env.WEB_DIST_DIR;
    else process.env.WEB_DIST_DIR = originalWebDir;
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
