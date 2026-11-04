import assert from 'node:assert/strict';
import test from 'node:test';
import { getWhatsAppHref } from '../src/lib/contact.ts';

test('WhatsApp contact opens the international wa.me link', () => {
  assert.equal(
    getWhatsAppHref('+2250758427823'),
    'https://wa.me/2250758427823',
  );
});

test('WhatsApp contact accepts formatted numbers and strips punctuation', () => {
  assert.equal(
    getWhatsAppHref('+225 07 58 42 78 23'),
    'https://wa.me/2250758427823',
  );
});

test('an empty WhatsApp contact does not produce a link', () => {
  assert.equal(getWhatsAppHref('  '), null);
});
