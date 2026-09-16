import { ReplitConnectors } from "@replit/connectors-sdk";

type ResendEmail = {
  from: string;
  to: string[];
  subject: string;
  html: string;
};

type ResendResponse = Record<string, unknown>;

async function resendRequest<T extends ResendResponse>(
  path: string,
  body: unknown,
): Promise<T> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("resend", path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null) as (T & { message?: string; error?: string }) | null;
  if (!response.ok) {
    const message = payload?.message || payload?.error || `Resend a refusé la requête (${response.status}).`;
    throw new Error(message);
  }
  return (payload ?? {}) as T;
}

export async function sendResendBatch(messages: ResendEmail[]): Promise<ResendResponse> {
  return resendRequest<ResendResponse>("/emails/batch", { messages });
}