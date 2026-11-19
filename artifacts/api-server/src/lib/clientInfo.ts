export type ClientInfo = {
  browser: string | null;
  platform: string | null;
  device: string | null;
};

const EMPTY_CLIENT_INFO: ClientInfo = {
  browser: null,
  platform: null,
  device: null,
};

export function parseClientInfo(userAgent: unknown): ClientInfo {
  if (typeof userAgent !== "string" || userAgent.length === 0) {
    return { ...EMPTY_CLIENT_INFO };
  }

  const value = userAgent.slice(0, 512);
  const bot = /\b(Googlebot|Bingbot|DuckDuckBot|Applebot|YandexBot|facebookexternalhit|Twitterbot)\b/i.exec(value);
  if (bot) {
    return { browser: `Bot (${bot[1]})`, platform: null, device: "Bot" };
  }

  let browser: string | null = null;
  if (/\bEdgA?\//i.test(value) || /\bEdgiOS\//i.test(value)) browser = "Edge";
  else if (/\bSamsungBrowser\//i.test(value)) browser = "Samsung Internet";
  else if (/\bOPR\//i.test(value) || /\bOpera\b/i.test(value)) browser = "Opera";
  else if (/\bFirefox\//i.test(value) || /\bFxiOS\//i.test(value)) browser = "Firefox";
  else if (/\bChrome\//i.test(value) || /\bCriOS\//i.test(value)) browser = "Chrome";
  else if (/\bSafari\//i.test(value)) browser = "Safari";

  let platform: string | null = null;
  if (/\bAndroid\b/i.test(value)) platform = "Android";
  else if (/\b(iPhone|iPad|iPod)\b/i.test(value)) platform = "iOS";
  else if (/\bWindows NT\b/i.test(value)) platform = "Windows";
  else if (/\bMac OS X\b/i.test(value)) platform = "macOS";
  else if (/\bCrOS\b/i.test(value)) platform = "ChromeOS";
  else if (/\bLinux\b/i.test(value)) platform = "Linux";

  let device: string | null = null;
  if (/\b(iPad|Tablet|Kindle|Silk)\b/i.test(value)) device = "Tablette";
  else if (/\b(iPhone|iPod)\b/i.test(value) || /\bAndroid\b/i.test(value) && /\bMobile\b/i.test(value)) {
    device = "Mobile";
  } else if (platform) {
    device = "Ordinateur";
  }

  return {
    browser,
    platform,
    device,
  };
}
