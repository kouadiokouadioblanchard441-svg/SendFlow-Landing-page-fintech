export type PanelCredentials = {
  token: string;
  email: string;
};

export function takePanelCredentialsFromUrl(url: URL): {
  credentials: PanelCredentials | null;
  sanitizedUrl: string;
} {
  const panelPath = /^(.*\/panel)(?:\/([^/]+)\/([^/]+))?\/?$/i.exec(url.pathname);
  if (!panelPath) {
    return { credentials: null, sanitizedUrl: url.href };
  }

  let legacyCredentials: PanelCredentials | null = null;
  if (panelPath[2] && panelPath[3]) {
    try {
      legacyCredentials = {
        token: decodeURIComponent(panelPath[2]),
        email: decodeURIComponent(panelPath[3]),
      };
    } catch {
      legacyCredentials = null;
    }
  }

  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  const fragmentToken = fragment.get("token");
  const fragmentEmail = fragment.get("email");
  const credentials = fragmentToken && fragmentEmail
    ? { token: fragmentToken, email: fragmentEmail }
    : legacyCredentials;

  const sanitized = new URL(url.href);
  sanitized.pathname = panelPath[1];
  sanitized.search = "";
  sanitized.hash = "";
  return { credentials, sanitizedUrl: sanitized.href };
}
