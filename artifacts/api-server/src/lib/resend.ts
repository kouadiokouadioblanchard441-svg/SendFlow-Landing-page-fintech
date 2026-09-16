type ResendEmail = {
  from: string;
  to: string[];
  subject: string;
  html: string;
};

type ResendResponse = Record<string, unknown>;

const RESEND_API_URL = "https://api.resend.com";

async function resendRequest<T extends ResendResponse>(
  path: string,
  body: unknown,
): Promise<T> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY doit être configurée pour envoyer des emails.");
  }

  const response = await fetch(`${RESEND_API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null) as (T & {
    message?: string;
    error?: string | { message?: string };
  }) | null;
  if (!response.ok) {
    const providerError = typeof payload?.error === "object" ? payload.error?.message : payload?.error;
    const message = payload?.message || providerError || `Resend a refusé la requête (${response.status}).`;
    throw new Error(message);
  }
  return (payload ?? {}) as T;
}

export async function sendResendBatch(messages: ResendEmail[]): Promise<ResendResponse> {
  return resendRequest<ResendResponse>("/emails/batch", { messages });
}