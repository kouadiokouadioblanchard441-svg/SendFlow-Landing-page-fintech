const packageJson = require("../package.json");

function getPinnedPnpmVersion(packageManager = packageJson.packageManager) {
  const match = /^pnpm@(\d+\.\d+\.\d+)$/.exec(packageManager ?? "");
  return match?.[1] ?? null;
}

function validatePackageManagerUserAgent(userAgent, expectedVersion = getPinnedPnpmVersion()) {
  if (!expectedVersion) {
    return {
      ok: false,
      message: "package.json must pin pnpm with an exact packageManager version.",
    };
  }

  const match = /^pnpm\/([^\s]+)/.exec(userAgent ?? "");
  if (!match) {
    return {
      ok: false,
      message: `Use pnpm ${expectedVersion}; other package managers are not supported.`,
    };
  }

  if (match[1] !== expectedVersion) {
    return {
      ok: false,
      message: `This project requires pnpm ${expectedVersion}; the current installer is pnpm ${match[1]}.`,
    };
  }

  return { ok: true, version: match[1] };
}

if (require.main === module) {
  const result = validatePackageManagerUserAgent(process.env.npm_config_user_agent);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
}

module.exports = { getPinnedPnpmVersion, validatePackageManagerUserAgent };
