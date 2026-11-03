import { getPublicSiteUrl } from "./publicSiteUrl";

export type RecaptchaSettings =
  | { status: "disabled" }
  | { status: "misconfigured" }
  | { status: "enabled"; siteKey: string; secretKey: string };

export type RecaptchaVerification =
  | { valid: true }
  | { valid: false; reason: "invalid" | "unavailable" };

const MINIMUM_SCORE = 0.5;
const VERIFY_TIMEOUT_MS = 5_000;

export function getConfiguredRecaptchaHostname(siteUrl = getPublicSiteUrl()): string | null {
  if (!siteUrl) return null;
  try {
    const parsed = new URL(siteUrl);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
    return parsed.hostname.toLowerCase().replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

export function readRecaptchaSettings(
  env: NodeJS.ProcessEnv = process.env,
): RecaptchaSettings {
  const siteKey = env.RECAPTCHA_SITE_KEY?.trim() ?? "";
  const secretKey = env.RECAPTCHA_SECRET_KEY?.trim() ?? "";

  if (!siteKey && !secretKey) return { status: "disabled" };
  if (!siteKey || !secretKey) return { status: "misconfigured" };
  return { status: "enabled", siteKey, secretKey };
}

export async function verifyRecaptchaToken(
  input: {
    token: string;
    secretKey: string;
    expectedAction: string;
    expectedHostname: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<RecaptchaVerification> {
  if (!input.token.trim() || !input.secretKey.trim() || !input.expectedHostname.trim()) {
    return { valid: false, reason: "invalid" };
  }

  try {
    const response = await fetchImpl("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: input.secretKey,
        response: input.token,
      }),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) return { valid: false, reason: "unavailable" };

    const result = await response.json() as {
      success?: unknown;
      action?: unknown;
      hostname?: unknown;
      score?: unknown;
    };
    const hostname = typeof result.hostname === "string"
      ? result.hostname.trim().toLowerCase().replace(/\.$/, "")
      : "";
    const expectedHostname = input.expectedHostname.trim().toLowerCase().replace(/\.$/, "");
    const score = typeof result.score === "number" ? result.score : Number.NaN;

    if (
      result.success === true
      && result.action === input.expectedAction
      && hostname === expectedHostname
      && Number.isFinite(score)
      && score >= MINIMUM_SCORE
    ) {
      return { valid: true };
    }
    return { valid: false, reason: "invalid" };
  } catch {
    return { valid: false, reason: "unavailable" };
  }
}
