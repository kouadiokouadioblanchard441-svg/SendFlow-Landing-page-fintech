import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const appSource = await fs.readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const styles = await fs.readFile(new URL('../src/index.css', import.meta.url), 'utf8');

test('the existing four-dot loader stays visible through a full staggered pulse', () => {
  const component = appSource.match(/function SendFlowLoadingDots\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(component, 'SendFlowLoadingDots component should exist');
  assert.equal([...component.matchAll(/<span \/>/g)].length, 4);

  const durationMs = Number(appSource.match(/\}, (\d+)\);\s*\}, \[location\]\);/)?.[1]);
  const cycleSeconds = Number(
    styles.match(/sf-navigation-dot-pulse ([\d.]+)s/)?.[1],
  );
  const delays = [...styles.matchAll(/sf-loading-dots > span:nth-child\(\d+\) \{ animation-delay: ([\d.]+)s; \}/g)]
    .map((match) => Number(match[1]));

  assert.ok(durationMs > 0, 'navigation loader duration should be configured');
  assert.ok(cycleSeconds > 0, 'dot animation duration should be configured');
  assert.equal(delays.length, 3, 'all staggered dots should have their own delay');
  assert.ok(
    durationMs >= (cycleSeconds + Math.max(...delays)) * 1000,
    'loader must remain visible for a complete staggered dot cycle',
  );
});

test('the existing reduced-motion accessibility rule remains active', () => {
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.sf-loading-dots > span \{ animation: none; \}/);
});
