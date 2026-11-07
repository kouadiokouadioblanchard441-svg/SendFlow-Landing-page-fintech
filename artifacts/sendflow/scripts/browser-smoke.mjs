import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.argv.slice(2).find((argument) => argument !== '--');
if (!baseUrl) {
  throw new Error('Pass the base URL of the running SendFlow server.');
}

const origin = new URL(baseUrl).origin;
const routes = [
  {
    path: '/',
    locale: 'fr',
    heading: 'L’argent circule.',
    downloadCta: { label: 'Télécharger', href: '/download' },
  },
  { path: '/fonctionnalites/', locale: 'fr', heading: 'Nos Fonctionnalités' },
  {
    path: '/en/',
    locale: 'en',
    heading: 'Money moves.',
    downloadCta: { label: 'Download', href: '/en/download' },
  },
  { path: '/en/features/', locale: 'en', heading: 'Our Features' },
];
const routeGroups = Object.values(JSON.parse(
  await readFile(new URL('../src/lib/public-seo-routes.json', import.meta.url), 'utf8'),
));
const seoRoutes = routeGroups.flatMap((group) =>
  ['fr', 'en'].map((locale) => ({
    ...group[locale],
    locale,
    alternates: {
      fr: group.fr.path,
      en: group.en.path,
      'x-default': group.fr.path,
    },
  })),
);

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});

try {
  const notFoundPage = await browser.newPage();
  const missingRouteResponse = await notFoundPage.goto(
    new URL('/page-inexistante-smoke-test', origin).href,
    { waitUntil: 'domcontentloaded' },
  );
  assert.equal(missingRouteResponse?.status(), 200, 'The SPA shell should load for an unknown route');
  await notFoundPage.getByRole('heading', { name: 'Cette page n’existe pas' }).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  assert.equal(await notFoundPage.getByText('ERREUR 404').count(), 1);
  assert.equal(
    await notFoundPage.locator('.sf-navigation-loader').count(),
    0,
    'An unknown route should not be covered by the full-screen loader on first load',
  );
  console.log('Verified the French 404 page on a direct unknown URL');
  await notFoundPage.goto(new URL('/en/page-not-found-smoke-test', origin).href, {
    waitUntil: 'domcontentloaded',
  });
  await notFoundPage.getByRole('heading', { name: 'This page can’t be found' }).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  assert.equal(await notFoundPage.getByText('ERROR 404').count(), 1);
  console.log('Verified the English 404 page on a direct unknown URL');
  await notFoundPage.close();

  for (const route of routes) {
    const page = await browser.newPage();
    const browserErrors = [];
    const failedResources = [];
    const loadedCoreResources = new Set();

    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('response', (response) => {
      const request = response.request();
      const resourceType = request.resourceType();
      if (
        response.status() >= 500 &&
        ['fetch', 'xhr'].includes(resourceType)
      ) {
        browserErrors.push(
          `HTTP ${response.status()} ${request.method()} ${response.url()}`,
        );
      }
      if (!['script', 'stylesheet'].includes(resourceType)) return;

      if (response.url().startsWith(origin) && response.ok()) {
        loadedCoreResources.add(resourceType);
      } else if (response.url().startsWith(origin) && response.status() >= 400) {
        failedResources.push(`${resourceType} ${response.status()} ${response.url()}`);
      }
    });
    page.on('requestfailed', (request) => {
      const resourceType = request.resourceType();
      if (
        request.url().startsWith(origin) &&
        ['document', 'script', 'stylesheet', 'image', 'font'].includes(resourceType)
      ) {
        failedResources.push(`${resourceType} ${request.url()} (${request.failure()?.errorText ?? 'failed'})`);
      }
    });

    const response = await page.goto(new URL(route.path, origin).href, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response?.status(), 200, `${route.path} should return HTTP 200`);
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);

    assert.equal(
      await page.locator('html').getAttribute('lang'),
      route.locale,
      `${route.path} should declare the ${route.locale} locale`,
    );
    const heading = (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim();
    assert.ok(
      heading.includes(route.heading),
      `${route.path} should show "${route.heading}" in its visible heading; received "${heading}"`,
    );

    if (route.path === '/') {
      const whatsappButton = page.locator('[data-testid^="button-floating-whatsapp"]');
      assert.equal(await whatsappButton.count(), 1, 'The homepage should show one floating WhatsApp control');
      const initialBox = await whatsappButton.boundingBox();
      assert.ok(initialBox, 'The floating WhatsApp control should be visible');
      assert.equal(
        await whatsappButton.evaluate((element) => element.draggable),
        false,
        'The WhatsApp control should not start a native browser drag',
      );
      assert.equal(
        await whatsappButton.evaluate((element) => getComputedStyle(element.parentElement).position),
        'fixed',
        'The WhatsApp control should float over the page',
      );
      const buttonAppearance = await whatsappButton.evaluate((element) => {
        const style = getComputedStyle(element);
        const logo = element.querySelector('img');
        return {
          background: style.backgroundColor,
          opacity: style.opacity,
          logoLoaded: Boolean(logo?.complete && logo.naturalWidth > 0),
        };
      });
      assert.equal(buttonAppearance.background, 'rgb(77, 204, 61)', 'The WhatsApp button should have a solid green background');
      assert.equal(buttonAppearance.opacity, '1', 'The WhatsApp button should not be transparent');
      assert.equal(buttonAppearance.logoLoaded, true, 'The official WhatsApp logo should be visible');

      await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        initialBox.x + initialBox.width / 2 - 42,
        initialBox.y + initialBox.height / 2 + 48,
        { steps: 8 },
      );
      await page.mouse.up();
      await page.waitForTimeout(50);

      const movedBox = await whatsappButton.boundingBox();
      assert.ok(movedBox, 'The WhatsApp control should remain visible after dragging');
      assert.ok(
        Math.abs(movedBox.x - initialBox.x) > 24 || Math.abs(movedBox.y - initialBox.y) > 24,
        'Dragging should change the WhatsApp control position',
      );
      const savedPosition = await page.evaluate(() => JSON.parse(
        localStorage.getItem('sendflow-home-whatsapp-position-v1') ?? 'null',
      ));
      assert.ok(savedPosition, 'Dragging should save the WhatsApp position in this browser');
      assert.equal(page.context().pages().length, 1, 'Dragging must not open the WhatsApp link');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('h1').first().waitFor({ state: 'visible', timeout: 20_000 });
      const restoredBox = await whatsappButton.boundingBox();
      assert.ok(restoredBox, 'The WhatsApp control should render after reload');
      assert.ok(
        Math.abs(restoredBox.x - movedBox.x) < 14 && Math.abs(restoredBox.y - movedBox.y) < 14,
        'The dragged position should persist after reload',
      );
      console.log('Verified draggable WhatsApp control and saved position on the homepage');
    }

    if (route.downloadCta) {
      assert.equal(
        await page.getByTestId('button-hero-register').count(),
        1,
        `${route.path} should keep the configured signup CTA in the hero`,
      );
      const downloadCta = page.getByTestId('button-download-bottom');
      await downloadCta.scrollIntoViewIfNeeded();
      const downloadLabel = (await downloadCta.innerText()).replace(/\s+/g, ' ').trim();
      assert.ok(
        downloadLabel.startsWith(route.downloadCta.label),
        `${route.path} should show the localized bottom download label; received "${downloadLabel}"`,
      );
      assert.equal(
        await downloadCta.getAttribute('href'),
        route.downloadCta.href,
        `${route.path} should link to its localized download page`,
      );
      await Promise.all([
        page.waitForURL((url) => url.pathname === route.downloadCta.href),
        downloadCta.click(),
      ]);
      await page.locator('h1').first().waitFor({ state: 'visible', timeout: 20_000 });
      console.log(`Verified bottom download navigation ${route.path} → ${route.downloadCta.href}`);
    }

    assert.ok(
      loadedCoreResources.has('script'),
      `${route.path} should load its JavaScript`,
    );
    const stylesApplied = await page.evaluate(() => [...document.styleSheets].some((sheet) => {
      try {
        return sheet.cssRules.length > 0;
      } catch {
        return Boolean(sheet.href);
      }
    }));
    assert.ok(stylesApplied, `${route.path} should apply its stylesheet`);
    assert.deepEqual(failedResources, [], `${route.path} should not fail to load page resources`);
    assert.deepEqual(browserErrors, [], `${route.path} should not produce browser errors`);
    console.log(`Verified rendered ${route.locale} route ${route.path}: ${heading}`);
    await page.close();
  }

  const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await noScriptContext.newPage();
    for (const route of seoRoutes) {
      const response = await page.goto(new URL(route.path, origin).href, {
        waitUntil: 'domcontentloaded',
      });
      assert.equal(response?.status(), 200, `${route.path} should return HTTP 200 without JavaScript`);
      assert.equal(await page.title(), route.title, `${route.path} should have its own static title`);
      assert.equal(
        await page.locator('html').getAttribute('lang'),
        route.locale,
        `${route.path} should declare its static locale`,
      );

      const headings = page.locator('h1');
      await headings.first().waitFor({ state: 'visible', timeout: 10_000 });
      assert.equal(await headings.count(), 1, `${route.path} should expose one static H1 without JavaScript`);
      assert.equal(
        (await headings.first().innerText()).trim(),
        route.name,
        `${route.path} should have a route-specific no-JavaScript heading`,
      );
      assert.equal(
        await page.locator('meta[name="description"]').getAttribute('content'),
        route.description,
        `${route.path} should have a route-specific static description`,
      );
      assert.equal(
        await page.locator('meta[name="robots"]').getAttribute('content'),
        'index, follow',
        `${route.path} should remain indexable`,
      );
      assert.equal(
        new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).pathname,
        route.path,
        `${route.path} should have a matching canonical URL`,
      );
      for (const [locale, path] of Object.entries(route.alternates)) {
        const href = await page.locator(`link[rel="alternate"][hreflang="${locale}"]`).getAttribute('href');
        assert.ok(href, `${route.path} should declare its ${locale} alternate`);
        assert.equal(new URL(href).pathname, path, `${route.path} has an incorrect ${locale} alternate`);
      }
    }
  } finally {
    await noScriptContext.close();
  }
  console.log(`Verified static SEO fallback and metadata for all ${seoRoutes.length} localized routes`);

  for (const route of seoRoutes) {
    const page = await browser.newPage();
    const response = await page.goto(new URL(route.path, origin).href, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response?.status(), 200, `${route.path} should load directly`);
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 20_000 });
    assert.equal(await page.locator('h1').count(), 1, `${route.path} should render one visible H1`);
    assert.equal(
      await page.locator('html').getAttribute('lang'),
      route.locale,
      `${route.path} should render in ${route.locale}`,
    );
    const title = (await page.title()).trim();
    assert.ok(title.length > 0, `${route.path} should render a non-empty title`);
    await page.waitForFunction(
      (expectedPath) => {
        const canonical = document.querySelector('link[rel="canonical"]');
        return canonical && new URL(canonical.href).pathname === expectedPath;
      },
      route.path,
      { timeout: 10_000 },
    );
    await page.close();
  }
  console.log(`Verified client-rendered content and direct navigation for all ${seoRoutes.length} localized routes`);

  for (const viewport of [
    { width: 320, height: 480 },
    { width: 360, height: 640 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(new URL('/', origin).href, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);

    const menuButton = page.getByTestId('button-open-menu');
    const dialog = page.getByRole('dialog', { name: 'Menu principal' });
    const closeButton = page.getByTestId('button-close-menu');
    const backdrop = page.locator('.sf-public-nav-backdrop');

    const initialScroll = await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: 420, behavior: 'auto' });
      return window.scrollY;
    });
    assert.ok(initialScroll > 0, 'The mobile menu test should start from a scrolled page');
    const initialBodyOverflow = await page.locator('body').evaluate((body) => body.style.overflow);

    await menuButton.click();
    await dialog.waitFor({ state: 'visible' });
    assert.equal(await menuButton.getAttribute('aria-expanded'), 'true', 'Opening the menu should update aria-expanded');
    assert.equal(await page.locator('body').evaluate((body) => body.style.overflow), 'hidden', 'Opening the menu should lock page scrolling');
    assert.equal(await page.evaluate(() => window.scrollY), initialScroll, 'Opening the menu should preserve the page scroll position');

    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    assert.ok(layout.documentWidth <= layout.viewportWidth, `${viewport.width}px viewport should not have horizontal document overflow: ${JSON.stringify(layout)}`);
    assert.ok(layout.bodyWidth <= layout.viewportWidth, `${viewport.width}px viewport should not have horizontal body overflow: ${JSON.stringify(layout)}`);

    const panelLayout = await dialog.evaluate((panel) => ({
      clientWidth: panel.clientWidth,
      scrollWidth: panel.scrollWidth,
      clientHeight: panel.clientHeight,
      scrollHeight: panel.scrollHeight,
      top: panel.getBoundingClientRect().top,
      bottom: panel.getBoundingClientRect().bottom,
    }));
    assert.ok(panelLayout.scrollWidth <= panelLayout.clientWidth, `${viewport.width}px menu should not overflow horizontally: ${JSON.stringify(panelLayout)}`);
    assert.ok(panelLayout.top >= 0 && panelLayout.bottom <= viewport.height, `${viewport.height}px menu should fit within the screen: ${JSON.stringify(panelLayout)}`);

    if (panelLayout.scrollHeight > panelLayout.clientHeight) {
      await dialog.evaluate((panel) => { panel.scrollTop = panel.scrollHeight; });
      const footer = await page.getByTestId('button-mobile-register').boundingBox();
      assert.ok(footer && footer.y >= 0 && footer.y + footer.height <= viewport.height, 'The mobile menu footer should remain reachable on short screens');
    }

    await closeButton.click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await menuButton.getAttribute('aria-expanded'), 'false', 'Closing with the menu button should update aria-expanded');
    assert.equal(await page.locator('body').evaluate((body) => body.style.overflow), initialBodyOverflow, 'Closing with the button should restore body scrolling');
    assert.equal(await page.evaluate(() => window.scrollY), initialScroll, 'Closing with the button should restore the previous scroll position');

    await menuButton.click();
    await dialog.waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('body').evaluate((body) => body.style.overflow), initialBodyOverflow, 'Closing with Escape should restore body scrolling');
    assert.equal(await page.evaluate(() => window.scrollY), initialScroll, 'Closing with Escape should restore the previous scroll position');

    await menuButton.click();
    await dialog.waitFor({ state: 'visible' });
    await backdrop.click({ position: { x: 4, y: Math.floor(viewport.height / 2) } });
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('body').evaluate((body) => body.style.overflow), initialBodyOverflow, 'Closing on the backdrop should restore body scrolling');
    assert.equal(await page.evaluate(() => window.scrollY), initialScroll, 'Closing on the backdrop should restore the previous scroll position');

    console.log(`Verified mobile navigation at ${viewport.width}x${viewport.height}`);
    await page.close();
  }
} finally {
  await browser.close();
}
