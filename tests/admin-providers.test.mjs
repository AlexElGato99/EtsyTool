import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function load(path, imports, env) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), {
    exports: module.exports,
    require: name => {
      if (!(name in imports)) throw Error(`Unexpected import: ${name}`);
      return imports[name];
    },
    Request, Response, URL, Buffer, TextEncoder, TextDecoder, Uint8Array,
    crypto: webcrypto, process: { env },
  });
  return module.exports;
}

function harness(owner = true) {
  const storage = new Map();
  const reads = [], writes = [];
  const env = { SETTINGS_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') };
  const db = async (_table, options) => {
    if (options.method === 'POST') {
      writes.push(options.body); storage.set(options.body.key, options.body.value); return null;
    }
    const key = options.params.key.slice(3); reads.push(key);
    return storage.has(key) ? [{ value: storage.get(key) }] : [];
  };
  const settings = load('lib/settings.ts', { 'server-only': {}, './supabase': { db } }, env);
  const admin = {
    isOwner: async () => owner,
    sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin,
    json: (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } }),
  };
  const etsy = { ApiError };
  const connections = load('lib/connections.ts', {
    'server-only': {}, 'next/headers': {}, './supabase': { db }, './settings': settings,
    './etsy': etsy, './search-options': {},
  }, env);
  const contact = load('lib/public-contact.ts', { 'server-only': {}, './settings': settings }, env);
  const api = load('lib/api.ts', { './supabase': { db }, './auth': {}, './etsy': etsy, './admin': admin }, env);
  const route = load('app/api/admin/providers/route.ts', {
    '../../../../lib/admin': admin, '../../../../lib/api': api, '../../../../lib/connections': connections,
    '../../../../lib/etsy': etsy, '../../../../lib/public-contact': contact, '../../../../lib/settings': settings,
  }, env);
  return { route, storage, reads, writes, env, settings, connections };
}

function post(body, options = {}) {
  return new Request('https://scout.example/api/admin/providers', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: options.origin ?? 'https://scout.example', ...(options.headers || {}) },
    body: options.raw ?? JSON.stringify(body),
  });
}
const pinterest = { action: 'savePinterest', appId: '1234567', appSecret: 'pinterest-test-secret' };
const email = { action: 'saveEmail', apiKey: 're_test-secret', fromEmail: 'sender@example.com', fromName: 'PNG Scout' };
const plain = value => JSON.parse(JSON.stringify(value));

test('Provider settings require owner membership and same-origin mutations before any storage access', async () => {
  const denied = harness(false);
  assert.equal((await denied.route.GET()).status, 403);
  assert.equal((await denied.route.POST(post(pinterest))).status, 403);
  assert.equal(denied.reads.length, 0); assert.equal(denied.writes.length, 0);
  const owner = harness();
  for (const origin of ['https://other.example', 'null', '']) assert.equal((await owner.route.POST(post(email, { origin }))).status, 403);
  assert.equal(owner.reads.length, 0); assert.equal(owner.writes.length, 0);
});

test('Real AES-GCM encryption preserves the other provider and never returns stored secrets', async () => {
  const h = harness();
  const first = await h.route.POST(post({ ...pinterest, apiKey: 'ignored-injected-secret', extra: 'ignored' }));
  assert.equal(first.status, 200);
  const envelope = h.storage.get('provider_credentials');
  assert.deepEqual(Object.keys(envelope).sort(), ['ciphertext', 'iv']);
  assert.equal(Buffer.from(envelope.iv, 'base64').length, 12);
  assert(!JSON.stringify(envelope).includes(pinterest.appSecret));
  assert(!JSON.stringify(await first.json()).includes(pinterest.appSecret));
  assert.equal((await h.route.POST(post(email))).status, 200);
  const decrypted = await h.connections.decryptConnectionValue(h.storage.get('provider_credentials'));
  assert.deepEqual(plain(decrypted), {
    pinterest: { appId: pinterest.appId, appSecret: pinterest.appSecret },
    email: { provider: 'resend', apiKey: email.apiKey, fromEmail: email.fromEmail, fromName: email.fromName },
  });
  const response = await h.route.GET();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = await response.json();
  assert.deepEqual(data, {
    pinterest: { configured: true, appId: pinterest.appId },
    email: { configured: true, provider: 'resend', fromEmail: email.fromEmail, fromName: email.fromName },
  });
  for (const secret of [pinterest.appSecret, email.apiKey, 'ignored-injected-secret']) assert(!JSON.stringify(data).includes(secret));
  assert(h.reads.every(key => key === 'provider_credentials'));
  assert(h.writes.every(write => write.key === 'provider_credentials'));
});

test('Each removal preserves the other service and the remaining encrypted settings', async () => {
  const h = harness();
  await h.route.POST(post(pinterest)); await h.route.POST(post(email));
  const removed = await h.route.POST(post({ action: 'removePinterest' }));
  const data = await removed.json();
  assert.equal(data.pinterest.configured, false); assert.equal(data.pinterest.appId, null);
  assert.equal(data.email.configured, true);
  assert.equal((await h.connections.decryptConnectionValue(h.storage.get('provider_credentials'))).email.apiKey, email.apiKey);
  await h.route.POST(post(pinterest));
  const emailRemoved = await h.route.POST(post({ action: 'removeEmail' }));
  assert.equal((await emailRemoved.json()).email.configured, false);
  assert.deepEqual(plain(await h.connections.decryptConnectionValue(h.storage.get('provider_credentials'))), { pinterest: { appId: pinterest.appId, appSecret: pinterest.appSecret } });
});

test('Malformed actions cannot be coerced into removal and invalid fields never write', async () => {
  const h = harness();
  const invalid = [
    { action: ['savePinterest'] }, { action: null }, { action: 'unexpected' },
    { ...pinterest, appId: 'app id' }, { ...pinterest, appId: 'x'.repeat(129) },
    { ...pinterest, appSecret: '' }, { ...pinterest, appSecret: 'secret\r\nInjected' }, { ...pinterest, appSecret: 'x'.repeat(4097) },
    { ...email, apiKey: 'secret with spaces' }, { ...email, fromEmail: 'sender@example.com?bcc=someone@example.com' },
    { ...email, fromEmail: 'sender@example.com\r\nBcc:somebody@example.com' },
    { ...email, fromName: 'Name <other@example.com>' }, { ...email, fromName: 'Name\nInjected' },
    { ...email, fromName: 'x'.repeat(101) }, { ...email, fromName: ['not-a-name'] },
  ];
  for (const body of invalid) assert.equal((await h.route.POST(post(body))).status, 400);
  assert.equal(h.writes.length, 0); assert.equal(h.reads.length, 0);
});

test('Body validation enforces both declared and actual size limits and JSON object shape', async () => {
  const h = harness();
  assert.equal((await h.route.POST(post(pinterest, { headers: { 'content-length': '16001' } }))).status, 413);
  assert.equal((await h.route.POST(post(null, { raw: JSON.stringify({ action: 'removeEmail', filler: 'x'.repeat(16001) }) }))).status, 413);
  for (const raw of ['not json', 'null', '[]', '42']) assert.equal((await h.route.POST(post(null, { raw }))).status, 400);
  assert.equal(h.reads.length, 0); assert.equal(h.writes.length, 0);
});

test('Unavailable encryption and corrupt stored values fail safely without writes or sensitive error details', async () => {
  const missingKey = harness(); delete missingKey.env.SETTINGS_ENCRYPTION_KEY;
  const response = await missingKey.route.POST(post(pinterest));
  assert.equal(response.status, 503); assert.equal(missingKey.writes.length, 0);
  const message = JSON.stringify(await response.json());
  assert(!message.includes('SETTINGS_ENCRYPTION_KEY')); assert(!message.includes(pinterest.appSecret));
  const corrupt = harness(); corrupt.storage.set('provider_credentials', { iv: 'bad-iv', ciphertext: 'bad-ciphertext' });
  assert.equal((await corrupt.route.GET()).status, 503);
  assert.equal((await corrupt.route.POST(post(email))).status, 503);
  assert.equal(corrupt.writes.length, 0);
});

test('Sender metadata is trimmed, optional empty names are omitted, and provider is fixed to Resend', async () => {
  const h = harness();
  const response = await h.route.POST(post({ ...email, provider: 'unsupported', fromEmail: ' sender@example.com ', fromName: '   ' }));
  assert.equal(response.status, 200);
  const stored = (await h.connections.decryptConnectionValue(h.storage.get('provider_credentials'))).email;
  assert.equal(stored.provider, 'resend'); assert.equal(stored.fromEmail, 'sender@example.com');
  assert(!('fromName' in stored));
  assert.equal((await response.json()).email.fromName, null);
});
