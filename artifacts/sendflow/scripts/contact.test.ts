import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getWhatsAppChannelHref,
  getWhatsAppHref,
  getWhatsAppSupportHref,
} from '../src/lib/contact.ts';

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

test('the footer accepts only HTTPS WhatsApp channel and chat links', () => {
  assert.equal(
    getWhatsAppChannelHref('https://whatsapp.com/channel/0029VbDYGGEHwXb3jv0Oyg2T'),
    'https://whatsapp.com/channel/0029VbDYGGEHwXb3jv0Oyg2T',
  );
  assert.equal(getWhatsAppChannelHref('http://whatsapp.com/channel/example'), null);
  assert.equal(getWhatsAppChannelHref('https://example.com/channel/example'), null);
  assert.equal(getWhatsAppChannelHref('javascript:alert(1)'), null);
});

test('footer support keeps the configured phone separate from the social channel', () => {
  assert.equal(
    getWhatsAppSupportHref('+225 07 58 42 78 23', 'https://whatsapp.com/channel/example'),
    'https://wa.me/2250758427823',
  );
  assert.equal(
    getWhatsAppSupportHref(null, 'https://whatsapp.com/channel/example'),
    'https://whatsapp.com/channel/example',
  );
});
