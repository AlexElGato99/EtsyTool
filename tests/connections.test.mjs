import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const encryptionKey = Buffer.alloc(32, 13).toString('base64');
async function encrypt(value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', Buffer.from(encryptionKey, 'base64'), 'AES-GCM', false, ['encrypt']);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { iv: Buffer.from(iv).toString('base64'), ciphertext: Buffer.from(data).toString('base64') };
}
function load(path, imports, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), {
    exports: module.exports, require: name => imports[name] || {}, Request, Response, URL, URLSearchParams, AbortSignal,
    Buffer, crypto, TextEncoder, TextDecoder, Uint8Array, Date, process: { env: { SETTINGS_ENCRYPTION_KEY: encryptionKey, NODE_ENV: 'test' } }, ...globals,
  });
  return module.exports;
}
const etsyScopes = 'shops_r listings_r transactions_r';
const pinterestScopes = 'user_accounts:read boards:read boards:write pins:read pins:write';
const imageUrl = 'https://i.etsystatic.com/1/r/il/example/123456.jpg';
async function harness() {
  const storage = new Map(); const jar = new Map([['scout_access', 'verified-access']]); const cookieWrites = []; const requests = [];
  const control = { intercept: null, verified: { id: 'user-a', email: 'seller@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' } };
  storage.set('etsy_credentials', { encrypted: true });
  storage.set('provider_credentials', await encrypt({ pinterest: { appId: 'pinterest-app', appSecret: 'private-app-secret' }, email: { provider: 'resend', apiKey: 'private-email-key', fromEmail: 'support@example.com', fromName: 'PNG Scout' } }));
  const settings = { readSetting: async key => storage.get(key) ?? null, writeSetting: async (key, value) => storage.set(key, value), encryptCredentials: encrypt, decryptCredentials: async () => storage.get('etsy_credentials') ? { key: 'etsy-app', secret: 'private-etsy-secret' } : null };
  const database = async (resource, options = {}) => {
    assert.equal(resource, 'app_settings');
    const key = options.params?.key?.slice(3) || options.body?.key;
    if (options.method === 'POST') { if (!storage.has(key) || !options.prefer.includes('ignore-duplicates')) storage.set(key, options.body.value); return null; }
    const current = storage.get(key);
    for (const [param, expected] of Object.entries(options.params || {})) {
      if (param.startsWith('value->>') && current?.[param.slice(8)] !== expected.slice(3)) return [];
    }
    if (options.method === 'DELETE') { if (!storage.has(key)) return []; storage.delete(key); return [{ key }]; }
    if (options.method === 'PATCH') { if (!storage.has(key)) return []; storage.set(key, options.body.value); return [{ key, value: options.body.value }]; }
    return current ? [{ value: current }] : [];
  };
  const search = load('lib/search-options.ts', { './etsy': { ApiError } });
  const network = async (input, init) => {
    const url = new URL(input); requests.push({ url: url.toString(), init });
    const intercepted = await control.intercept?.(url, init);
    if (intercepted) return intercepted;
    if (url.pathname.endsWith('/oauth/token')) return Response.json({ access_token: url.hostname.includes('etsy') ? '42.private-etsy-token' : 'pina_private-token', refresh_token: 'private-refresh-token', expires_in: 3600, scope: url.hostname.includes('etsy') ? etsyScopes : pinterestScopes });
    if (url.pathname.endsWith('/user_account')) return Response.json({ username: 'MyPinterest' });
    if (url.pathname.endsWith('/users/42/shops')) return Response.json({ shop_id: 10, shop_name: 'MyShop', listing_active_count: 7, transaction_sold_count: 14, currency_code: 'USD' });
    if (url.pathname.endsWith('/receipts')) return Response.json({ count: 2, results: [{ receipt_id: 123, buyer_email: 'private-buyer@example.com', name: 'Private Buyer', first_line: 'Private Address', status: 'paid', is_paid: true, is_shipped: false, created_timestamp: 1780000000, grandtotal: { amount: 5000, divisor: 100, currency_code: 'USD' } }, { receipt_id: 124, status: 'canceled', is_paid: true, grandtotal: { amount: 9000, divisor: 100, currency_code: 'USD' } }] });
    if (url.pathname.endsWith('/payments')) return Response.json({ results: [{ amount_fees: { amount: 175, divisor: 100, currency_code: 'USD' } }] });
    if (url.pathname.endsWith('/listings/42')) return Response.json({ listing_id: 42, shop_id: 10, images: [{ url_fullxfull: imageUrl }] });
    if (url.pathname.endsWith('/boards')) return Response.json({ items: [{ id: '55', name: 'My products' }], bookmark: null });
    if (url.pathname.endsWith('/pins')) return Response.json({ id: '987654321' });
    if (url.hostname === 'api.resend.com') return Response.json({ id: 'accepted-test-email' });
    throw Error('Unexpected network call ' + input);
  };
  const helper = load('lib/connections.ts', {
    'next/headers': { cookies: async () => ({ get: name => jar.has(name) ? { value: jar.get(name) } : undefined, set: (name, value, options) => { jar.set(name, value); cookieWrites.push({ name, value, options }); } }) },
    './supabase': { db: database, authFetch: async () => Response.json(control.verified) }, './settings': settings, './etsy': { ApiError }, './search-options': search,
  }, { fetch: network });
  async function connect(provider = 'etsy', userId = 'user-a') {
    const result = await helper.beginConnection(userId, provider, 'https://scout.example', 'seller@example.com');
    if (provider === 'email') return result;
    const authorization = new URL(result.url); const callback = new URL(authorization.searchParams.get('redirect_uri'));
    callback.searchParams.set('state', authorization.searchParams.get('state')); callback.searchParams.set('code', 'authorization-code');
    await helper.finishConnection(userId, provider, callback.toString()); return authorization;
  }
  return { helper, storage, jar, requests, cookieWrites, control, connect };
}

test('OAuth uses HTTPS, Etsy PKCE, provider-specific scopes, and an encrypted HTTP-only state cookie', async () => {
  const h = await harness();
  await assert.rejects(h.helper.beginConnection('user-a', 'etsy', 'http://localhost:3000', 'seller@example.com'), error => error.status === 400);
  const start = await h.helper.beginConnection('user-a', 'etsy', 'https://scout.example', 'seller@example.com');
  const url = new URL(start.url);
  assert.equal(url.hostname, 'www.etsy.com'); assert.equal(url.searchParams.get('scope'), etsyScopes);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256'); assert.equal(url.searchParams.get('code_challenge').length, 43);
  const cookie = h.cookieWrites.at(-1); assert(cookie.options.httpOnly); assert(cookie.options.secure); assert.equal(cookie.options.sameSite, 'lax'); assert.equal(cookie.options.maxAge, 600);
  assert(!cookie.value.includes('user-a'));
  const decoded = await h.helper.decryptConnectionValue(JSON.parse(Buffer.from(cookie.value, 'base64url').toString()));
  assert.equal(decoded.userId, 'user-a'); assert.equal(decoded.verifier.length, 43);
  const challenge = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(decoded.verifier))).toString('base64url');
  assert.equal(url.searchParams.get('code_challenge'), challenge);
});

test('OAuth callbacks reject another user, expired state, and replayed state before token exchange', async () => {
  const h = await harness(); const result = await h.helper.beginConnection('user-a', 'etsy', 'https://scout.example', 'seller@example.com');
  const start = new URL(result.url); const callback = `https://scout.example/api/connections/etsy/callback?code=code&state=${start.searchParams.get('state')}`;
  const savedCookie = h.jar.get('scout_oauth_etsy');
  await assert.rejects(h.helper.finishConnection('user-b', 'etsy', callback), error => error.status === 400); assert.equal(h.requests.length, 0);
  h.jar.set('scout_oauth_etsy', savedCookie);
  const state = await h.helper.decryptConnectionValue(JSON.parse(Buffer.from(savedCookie, 'base64url').toString())); state.expiresAt = Date.now() - 1;
  h.jar.set('scout_oauth_etsy', Buffer.from(JSON.stringify(await encrypt(state))).toString('base64url'));
  await assert.rejects(h.helper.finishConnection('user-a', 'etsy', callback), error => error.status === 400); assert.equal(h.requests.length, 0);
  h.jar.set('scout_oauth_etsy', savedCookie); await h.helper.finishConnection('user-a', 'etsy', callback);
  const calls = h.requests.length; h.jar.set('scout_oauth_etsy', savedCookie);
  await assert.rejects(h.helper.finishConnection('user-a', 'etsy', callback), error => error.status === 400); assert.equal(h.requests.length, calls);
});

test('Connections are encrypted per user and browser status excludes access tokens and provider secrets', async () => {
  const h = await harness(); await h.connect();
  const stored = h.storage.get('connections:user-a:etsy'); assert(stored.encrypted.ciphertext); assert(!JSON.stringify(stored).includes('private-etsy-token'));
  const status = await h.helper.connectionStatus('user-a', 'etsy'); assert.equal(status.connected, true); assert.equal(status.label, 'MyShop');
  assert(!JSON.stringify(status).includes('private')); assert.equal((await h.helper.connectionStatus('user-b', 'etsy')).connected, false);
  const tokenRequest = h.requests.find(request => request.url.includes('/oauth/token')); const body = new URLSearchParams(tokenRequest.init.body);
  assert.equal(body.get('grant_type'), 'authorization_code'); assert.equal(body.get('client_id'), 'etsy-app'); assert(body.get('code_verifier'));
});

test('Disconnect wins over a delayed authorization response without restoring removed access', async () => {
  const h = await harness(); const result = await h.helper.beginConnection('user-a', 'etsy', 'https://scout.example', 'seller@example.com'); const start = new URL(result.url);
  h.control.intercept = async url => { if (url.pathname.endsWith('/oauth/token')) await h.helper.disconnectConnection('user-a', 'etsy'); };
  await assert.rejects(h.helper.finishConnection('user-a', 'etsy', `https://scout.example/api/connections/etsy/callback?code=code&state=${start.searchParams.get('state')}`), error => error.status === 409);
  assert.equal((await h.helper.connectionStatus('user-a', 'etsy')).connected, false);
});

test('Expired tokens refresh server-side, and disconnect wins over a delayed refresh', async () => {
  const h = await harness(); await h.connect('pinterest');
  let stored = h.storage.get('connections:user-a:pinterest'); const record = await h.helper.decryptConnectionValue(stored.encrypted); record.expiresAt = Date.now() - 1;
  stored.encrypted = await encrypt(record);
  await h.helper.activeConnection('user-a', 'pinterest'); const refresh = h.requests.find(request => new URLSearchParams(request.init.body).get('grant_type') === 'refresh_token');
  assert(refresh); assert.equal(refresh.init.headers.Authorization, 'Basic ' + Buffer.from('pinterest-app:private-app-secret').toString('base64'));
  stored = h.storage.get('connections:user-a:pinterest'); stored.encrypted = await encrypt({ ...record, expiresAt: Date.now() - 1 });
  h.control.intercept = async url => { if (url.pathname.endsWith('/oauth/token')) await h.helper.disconnectConnection('user-a', 'pinterest'); };
  await assert.rejects(h.helper.activeConnection('user-a', 'pinterest'), error => error.status === 409);
  assert.equal((await h.helper.connectionStatus('user-a', 'pinterest')).connected, false);
});

test('A refresh losing its revision cannot adopt another record with missing scopes or changed credentials', async () => {
  for (const replacement of [{ scopes: [] }, { credentialFingerprint: 'different-credentials' }]) {
    const h = await harness(); await h.connect('pinterest');
    const stored = h.storage.get('connections:user-a:pinterest'); const record = await h.helper.decryptConnectionValue(stored.encrypted);
    stored.encrypted = await encrypt({ ...record, expiresAt: Date.now() - 1 });
    h.control.intercept = async url => {
      if (url.pathname.endsWith('/oauth/token')) h.storage.set('connections:user-a:pinterest', { id: 'another-revision', encrypted: await encrypt({ ...record, expiresAt: Date.now() + 3600000, ...replacement }) });
    };
    await assert.rejects(h.helper.activeConnection('user-a', 'pinterest'), error => error.status === 409);
  }
});

test('Connected Etsy order overview excludes buyer personal information and canceled order totals', async () => {
  const h = await harness(); await h.connect(); const overview = await h.helper.connectedShop('user-a');
  assert.equal(overview.shop.activeListings, 7); assert.equal(overview.loadedOrders, 2); assert.equal(overview.paidOrders, 1); assert.equal(overview.awaitingShipment, 1);
  assert.equal(overview.paidOrderTotals[0].amount, 50); assert.equal(overview.orders[0].processingFee.amount, 1.75);
  const publicData = JSON.stringify(overview); for (const privateValue of ['private-buyer@example.com', 'Private Buyer', 'Private Address', 'private-etsy-token']) assert(!publicData.includes(privateValue));
  assert(overview.note.includes('not profit')); assert.equal(h.helper.normalizeMoney({ amount: 99, divisor: 0, currency_code: 'USD' }), null);
  assert.equal(h.helper.normalizeProcessingFee({ adjusted_fees: 0, amount_fees: 175, currency: 'USD' }).amount, 0);
  assert.equal(h.helper.normalizeProcessingFee({ amount_fees: 175, currency: 'EUR' }).currency, 'EUR');
  assert.equal(h.helper.normalizeProcessingFee({ amount_fees: 175 }).amount, 1.75);
});

test('Provider credential changes and removal require reconnection and block previously saved authorizations', async () => {
  const h = await harness(); await h.connect('pinterest'); await h.connect('email');
  h.storage.set('provider_credentials', await encrypt({ pinterest: { appId: 'another-app', appSecret: 'another-secret' }, email: { provider: 'resend', apiKey: 'replaced-key', fromEmail: 'support@example.com' } }));
  assert.equal((await h.helper.connectionStatus('user-a', 'pinterest')).connected, false); assert.equal((await h.helper.connectionStatus('user-a', 'email')).connected, false);
  await assert.rejects(h.helper.activeConnection('user-a', 'pinterest'), error => error.status === 409);
  h.storage.set('provider_credentials', null); const status = await h.helper.connectionStatus('user-a', 'pinterest'); assert.equal(status.configured, false); assert.equal(status.connected, false);
});

test('Own-listing import returns only approved real Etsy image URLs and rejects another seller’s listing', async () => {
  const h = await harness(); await h.connect(); const result = await h.helper.connectedListing('user-a', 'https://www.etsy.com/listing/42');
  assert.equal(result.imageUrls[0], imageUrl); assert.equal(result.url, 'https://www.etsy.com/listing/42');
  h.control.intercept = url => url.pathname.endsWith('/listings/42') ? Response.json({ shop_id: 20, images: [{ url_fullxfull: imageUrl }] }) : undefined;
  await assert.rejects(h.helper.connectedListing('user-a', 'https://www.etsy.com/listing/42'), error => error.status === 403);
  h.control.intercept = url => url.pathname.endsWith('/listings/42') ? Response.json({ shop_id: 10, images: [{ url_fullxfull: 'https://i.etsystatic.com.evil.example/image.jpg' }, { url_fullxfull: imageUrl }] }) : undefined;
  assert.equal((await h.helper.connectedListing('user-a', 'https://www.etsy.com/listing/42')).imageUrls.length, 1);
});

test('Pinterest publishing validates link/image hosts and explicit intent before any network call', async () => {
  const h = await harness(); const valid = { boardId: '55', title: 'My product', description: '', link: 'https://www.etsy.com/listing/42/product', imageUrl, confirmPublish: true };
  for (const changed of [{ imageUrl: 'https://i.etsystatic.com.evil.example/image.jpg' }, { imageUrl: 'http://i.etsystatic.com/image.jpg' }, { imageUrl: 'https://name:password@i.etsystatic.com/image.jpg' }, { link: 'https://evil.example/listing/42' }, { confirmPublish: false }]) {
    await assert.rejects(h.helper.publishPinterest('user-a', { ...valid, ...changed }), error => error.status === 400);
  }
  assert.equal(h.requests.length, 0); assert.equal(h.helper.validatePin(valid).link, 'https://www.etsy.com/listing/42');
});

test('Pinterest only publishes a real matching image from the connected seller’s own listing', async () => {
  const h = await harness(); await h.connect(); await h.connect('pinterest');
  const body = { boardId: '55', title: 'My product', description: 'Made by me', link: 'https://www.etsy.com/listing/42', imageUrl, confirmPublish: true };
  h.control.intercept = url => url.pathname.endsWith('/listings/42') ? Response.json({ shop_id: 999, images: [{ url_fullxfull: imageUrl }] }) : undefined;
  await assert.rejects(h.helper.publishPinterest('user-a', body), error => error.status === 403); assert(!h.requests.some(request => request.url.endsWith('/pins')));
  h.control.intercept = null;
  await assert.rejects(h.helper.publishPinterest('user-a', { ...body, imageUrl: 'https://i.etsystatic.com/other/image.jpg' }), error => error.status === 400);
  const result = await h.helper.publishPinterest('user-a', body); assert.equal(result.url, 'https://www.pinterest.com/pin/987654321/');
  const request = h.requests.find(request => request.url.endsWith('/pins')); const pin = JSON.parse(request.init.body);
  assert.equal(pin.board_id, '55'); assert.equal(pin.media_source.source_type, 'image_url'); assert.equal(pin.media_source.url, imageUrl);
});

test('Email tests require explicit confirmation and a confirmed matching account email; other recipients are rejected', async () => {
  const h = await harness(); await h.connect('email'); const user = { userId: 'user-a', email: 'seller@example.com' };
  const body = { subject: 'Hello', text: 'My test', confirmSend: true, requestId: crypto.randomUUID() };
  await assert.rejects(h.helper.sendEmailTest(user, { ...body, to: 'someone@example.com' }), error => error.status === 400);
  await assert.rejects(h.helper.sendEmailTest(user, { ...body, confirmSend: false }), error => error.status === 400);
  h.control.verified = { id: 'user-a', email: 'seller@example.com', email_confirmed_at: null };
  await assert.rejects(h.helper.sendEmailTest(user, body), error => error.status === 403); assert.equal(h.requests.length, 0);
  h.control.verified.email_confirmed_at = '2026-01-01T00:00:00Z'; await h.helper.sendEmailTest(user, body);
  const sent = JSON.parse(h.requests[0].init.body); assert.deepEqual(sent.to, ['seller@example.com']); assert.equal(sent.subject, '[PNG Scout test] Hello'); assert.equal(sent.text, 'My test');
  assert(h.requests[0].init.headers['Idempotency-Key'].includes(body.requestId));
  await assert.rejects(h.helper.sendEmailTest(user, { ...body, requestId: crypto.randomUUID() }), error => error.status === 429); assert.equal(h.requests.length, 1);
});

test('Concurrent email test requests cannot bypass the atomic sending limit', async () => {
  const h = await harness(); await h.connect('email');
  const results = await Promise.allSettled([1, 2, 3].map(() => h.helper.sendEmailTest({ userId: 'user-a', email: 'seller@example.com' }, { subject: 'Hello', text: 'Test', confirmSend: true, requestId: crypto.randomUUID() })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1); assert.equal(h.requests.length, 1);
});

test('Connection write routes reject foreign origins before identity, database or publishing actions', async () => {
  let calls = 0;
  const common = { researchAccess: async () => { calls++; return { userId: 'user-a', email: 'seller@example.com' }; }, userAccess: async () => { throw new ApiError(401, 'Sign in'); }, parseBody: request => request.json(), errorResponse: error => Response.json({ error: error.message }, { status: error.status || 500 }) };
  const admin = { json: Response.json, sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin };
  const helpers = { connectionProvider: value => value, beginConnection: async () => { calls++; }, publishPinterest: async () => { calls++; }, sendEmailTest: async () => { calls++; } };
  for (const path of ['app/api/connections/[provider]/route.ts', 'app/api/connections/pinterest/publish/route.ts', 'app/api/connections/email/send/route.ts']) {
    const depth = path.includes('[provider]/route') ? '../../../../' : '../../../../../';
    const route = load(path, { [depth + 'lib/api']: common, [depth + 'lib/admin']: admin, [depth + 'lib/etsy']: { ApiError }, [depth + 'lib/connections']: helpers });
    const response = await route.POST(new Request('https://scout.example/api/connections/etsy', { method: 'POST', headers: { origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' }), { params: Promise.resolve({ provider: 'etsy' }) });
    assert.equal(response.status, 403);
  }
  assert.equal(calls, 0);
});
