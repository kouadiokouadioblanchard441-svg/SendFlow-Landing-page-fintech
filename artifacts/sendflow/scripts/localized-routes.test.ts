import assert from 'node:assert/strict';
import test from 'node:test';
import { getLocalizedPath } from '../src/lib/localized-routes.ts';

test('localized home anchors keep their section hash in French and English', () => {
  assert.equal(getLocalizedPath('#how', 'fr'), '/#how');
  assert.equal(getLocalizedPath('#international', 'fr'), '/#international');
  assert.equal(getLocalizedPath('#how', 'en'), '/en/#how');
  assert.equal(getLocalizedPath('#international', 'en'), '/en/#international');
});

test('localized routes retain query strings and fragments', () => {
  assert.equal(
    getLocalizedPath('/france-senegal?source=nav#coverage', 'en'),
    '/en/france-senegal?source=nav#coverage',
  );
});
