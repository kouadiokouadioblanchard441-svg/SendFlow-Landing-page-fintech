import { useQuery } from "@tanstack/react-query";

export type RecaptchaPublicConfig = {
  enabled: boolean;
  siteKey: string | null;
};

type GoogleRecaptcha = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: GoogleRecaptcha;
  }
}

const RECAPTCHA_SCRIPT_ID = "sendflow-recaptcha-script";
let activeSiteKey: string | null = null;
let scriptLoadPromise: Promise<void> | null = null;

export function useRecaptchaConfig(enabled: boolean) {
  return useQuery<RecaptchaPublicConfig>({
    queryKey: ["/api/recaptcha/config"],
    queryFn: async () => {
      const response = await fetch("/api/recaptcha/config");
      if (!response.ok) throw new Error("reCAPTCHA configuration is unavailable.");
      return response.json() as Promise<RecaptchaPublicConfig>;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("reCAPTCHA requires a browser."));
  if (activeSiteKey === siteKey && window.grecaptcha) return Promise.resolve();
  if (activeSiteKey === siteKey && scriptLoadPromise) return scriptLoadPromise;

  removeRecaptchaScript();
  activeSiteKey = siteKey;
  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const nonceSource = document.querySelector<HTMLScriptElement>("script[nonce]");
    script.id = RECAPTCHA_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    if (nonceSource?.nonce) script.nonce = nonceSource.nonce;
    script.onload = () => resolve();
    script.onerror = () => {
      removeRecaptchaScript();
      reject(new Error("reCAPTCHA could not be loaded."));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export async function executeRecaptchaToken(siteKey: string, action: string): Promise<string> {
  await loadRecaptchaScript(siteKey);
  const recaptcha = window.grecaptcha;
  if (!recaptcha) throw new Error("reCAPTCHA is not ready.");

  return new Promise<string>((resolve, reject) => {
    recaptcha.ready(() => {
      void recaptcha.execute(siteKey, { action }).then((token) => {
        if (token) resolve(token);
        else reject(new Error("reCAPTCHA returned an empty token."));
      }).catch(reject);
    });
  });
}

export function removeRecaptchaScript() {
  if (typeof document !== "undefined") {
    document.getElementById(RECAPTCHA_SCRIPT_ID)?.remove();
    document.querySelectorAll(".grecaptcha-badge, iframe[src*='recaptcha']").forEach((element) => element.remove());
  }
  if (typeof window !== "undefined") delete window.grecaptcha;
  activeSiteKey = null;
  scriptLoadPromise = null;
}
