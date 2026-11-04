export type PublicActivityKind = 'page_view' | 'click' | 'form_submit';

export type PublicActivityPayload = {
  kind: PublicActivityKind;
  page: string;
  target?: string;
};

function isPrivatePage(pathname: string): boolean {
  return /(^|\/)(?:panel|admin)(?:\/|$)/i.test(pathname);
}

export function createPublicActivityPayload(
  kind: PublicActivityKind,
  pathname: string,
  target?: string | null,
): PublicActivityPayload | null {
  const page = pathname.split(/[?#]/, 1)[0] || '/';
  if (
    !page.startsWith('/') ||
    page.startsWith('//') ||
    page.length > 200 ||
    /[\u0000-\u001f\\]/.test(page) ||
    isPrivatePage(page) ||
    page === '/api' ||
    page.startsWith('/api/')
  ) {
    return null;
  }

  const safeTarget = target && /^[a-zA-Z0-9_-]{1,80}$/.test(target)
    ? target
    : undefined;
  return {
    kind,
    page: page
      .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,36}(?=\/|$)/gi, '/[id]')
      .replace(/\/[^/]*@[^/]*(?=\/|$)/g, '/[redacted]')
      .replace(/\/\+?\d[\d(). -]{6,}(?=\/|$)/g, '/[redacted]')
      .replace(/\/[a-zA-Z0-9._~-]{24,}(?=\/|$)/g, '/[redacted]')
      .replace(/\/\d{4,}(?=\/|$)/g, '/[id]'),
    ...(safeTarget ? { target: safeTarget } : {}),
  };
}

function sendPublicActivity(payload: PublicActivityPayload): void {
  void fetch('/api/security/telemetry/events', {
    method: 'POST',
    credentials: 'same-origin',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Monitoring is optional and must not interrupt the public site.
  });
}

function getPublicTarget(element: Element): string {
  const testId = element.getAttribute('data-testid');
  return testId && /^[a-zA-Z0-9_-]{1,80}$/.test(testId)
    ? testId
    : element.tagName.toLowerCase();
}

export async function startPublicActivityTracking(): Promise<void> {
  const initialPath = window.location.pathname;
  if (isPrivatePage(initialPath)) return;

  let enabled = false;
  try {
    const response = await fetch('/api/security/telemetry/config', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return;
    const config: unknown = await response.json();
    enabled = typeof config === 'object' && config !== null &&
      'enabled' in config && config.enabled === true;
  } catch {
    return;
  }
  if (!enabled) return;

  const initialEvent = createPublicActivityPayload('page_view', window.location.pathname);
  if (initialEvent) sendPublicActivity(initialEvent);
  let lastReportedPath = window.location.pathname;
  const reportPageViewIfChanged = () => {
    const currentPath = window.location.pathname;
    if (currentPath === lastReportedPath || isPrivatePage(currentPath)) return;
    lastReportedPath = currentPath;
    const payload = createPublicActivityPayload('page_view', currentPath);
    if (payload) sendPublicActivity(payload);
  };
  window.addEventListener('popstate', reportPageViewIfChanged);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('a,button,[role="button"],input[type="checkbox"],input[type="radio"],select')
      : null;
    if (!target) return;
    const payload = createPublicActivityPayload(
      'click',
      window.location.pathname,
      getPublicTarget(target),
    );
    if (payload) sendPublicActivity(payload);
    window.setTimeout(reportPageViewIfChanged, 50);
  }, { capture: true, passive: true });

  document.addEventListener('submit', (event) => {
    if (!(event.target instanceof HTMLFormElement)) return;
    const payload = createPublicActivityPayload(
      'form_submit',
      window.location.pathname,
      getPublicTarget(event.target),
    );
    if (payload) sendPublicActivity(payload);
  }, { capture: true, passive: true });
}
