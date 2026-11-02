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

const browser = await chromium.launch({ headless: true });

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
} finally {
  await browser.close();
}
