#!/usr/bin/env node
"use strict";

const path = require("node:path");

function validatePleskRuntimeConfig(env = process.env, projectRoot = process.cwd()) {
  const configuredMediaDirectory = env.PLESK_MEDIA_DIR?.trim();
  if (!configuredMediaDirectory) {
    throw new Error(
      "PLESK_MEDIA_DIR is required for Plesk builds; set an absolute persistent media directory outside the public build and ensure the Node application user can write to it. This prevents fallback to Replit-managed object storage.",
    );
  }

  if (!path.isAbsolute(configuredMediaDirectory)) {
    throw new Error("PLESK_MEDIA_DIR must be an absolute path.");
  }

  const mediaDirectory = path.resolve(configuredMediaDirectory);
  if (mediaDirectory === path.parse(mediaDirectory).root) {
    throw new Error("PLESK_MEDIA_DIR cannot be the filesystem root.");
  }

  const defaultPublicDirectory = path.join(projectRoot, "dist", "public");
  const publicDirectory = path.resolve(
    env.WEB_DIST_DIR?.trim() || defaultPublicDirectory,
  );
  const relativePath = path.relative(publicDirectory, mediaDirectory);
  const isInsidePublicDirectory =
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath));

  if (isInsidePublicDirectory) {
    throw new Error(
      "PLESK_MEDIA_DIR must be outside the public web directory to prevent public access to uploaded media.",
    );
  }

  return { mediaDirectory, publicDirectory };
}

if (require.main === module) {
  try {
    const { mediaDirectory } = validatePleskRuntimeConfig();
    console.log(`Plesk media directory configuration verified: ${mediaDirectory}`);
  } catch (error) {
    console.error(`Invalid Plesk runtime configuration: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { validatePleskRuntimeConfig };
