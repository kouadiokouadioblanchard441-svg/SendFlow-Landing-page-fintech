import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendResendBatch } from '../src/lib/resend.ts';

// This process is test-only. Replace the key with a dummy without reading any real secret.
process.env.RESEND_API_KEY = 'contract-test-only';

const messages = [
  { from: 'SendFlow <news@sendflow.example>', to: ['reader@recipient.example'], subject: 'News', html: '<p>News</p>' },
  { from: 'SendFlow <news@sendflow.example>', to: ['other@recipient.example'], subject: 'News', html: '<p>News</p>' },
];

test('Resend batch request sends a top-level array, not a messages wrapper', async (t) => {
  const payload = { data: [{ id: 'email-1' }, { id: 'email-2' }] };
  const mockedFetch = t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
  assert.deepEqual(await sendResendBatch(messages), payload);
  assert.equal(mockedFetch.mock.callCount(), 1);
  const [url, options] = mockedFetch.mock.calls[0].arguments;
  assert.equal(url, 'https://api.resend.com/emails/batch');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.headers.Authorization, 'Bearer contract-test-only');
  const body = JSON.parse(options.body);
  assert.ok(Array.isArray(body), 'The provider requires an array at the top level');
  assert.deepEqual(body, messages);
});

test('provider rejection remains an explicit error rather than success', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ message: 'Invalid sender' }), { status: 422 }),
  );
  await assert.rejects(sendResendBatch(messages), /Invalid sender/);
});