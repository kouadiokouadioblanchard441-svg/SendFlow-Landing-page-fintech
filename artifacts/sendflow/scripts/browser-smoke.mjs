import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const baseUrl = process.argv.slice(2).find((argument) => argument !== '--');
if (!baseUrl) {
  throw new Error('Pass the base URL of the running SendFlow server.');
}

const origin = new URL(baseUrl).origin;
const routes = [
  { path: '/', locale: 'fr', heading: 'L’argent circule.' },
  { path: '/fonctionnalites/', locale: 'fr', heading: 'Nos Fonctionnalités' },
  { path: '/en/', locale: 'en', heading: 'Money moves.' },
  { path: '/en/features/', locale: 'en', heading: 'Our Features' },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});

try {
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

    assert.deepEqual(
      [...loadedCoreResources].sort(),
      ['script', 'stylesheet'],
      `${route.path} should load both its JavaScript and stylesheet`,
    );
    assert.deepEqual(failedResources, [], `${route.path} should not fail to load page resources`);
    assert.deepEqual(browserErrors, [], `${route.path} should not produce browser errors`);
    console.log(`Verified rendered ${route.locale} route ${route.path}: ${heading}`);
    await page.close();
  }

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
