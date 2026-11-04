import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicActivityPayload } from '../src/lib/publicActivity.ts';

test('public activity payload contains only a safe route and action identifier', () => {
  assert.deepEqual(
    createPublicActivityPayload('click', '/tarifs?email=secret@example.com', 'button-nav-register'),
    { kind: 'click', page: '/tarifs', target: 'button-nav-register' },
  );
  assert.deepEqual(
    createPublicActivityPayload('form_submit', '/newsletter/abcdefghijklmnopqrstuvwx1234567890'),
    { kind: 'form_submit', page: '/newsletter/[redacted]' },
  );
  assert.equal(createPublicActivityPayload('page_view', '/panel'), null);
  assert.equal(createPublicActivityPayload('click', '/api/healthz'), null);
  assert.deepEqual(
    createPublicActivityPayload('click', '/pricing/123456'),
    { kind: 'click', page: '/pricing/[id]' },
  );
});

test('public activity never uses text, form values, or arbitrary targets', () => {
  assert.deepEqual(
    createPublicActivityPayload('form_submit', '/', 'input-email'),
    { kind: 'form_submit', page: '/', target: 'input-email' },
  );
  assert.equal(
    createPublicActivityPayload('click', '/', 'email=user@example.com')?.target,
    undefined,
  );
});
