import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const key = Buffer.alloc(32, 13).toString('base64');
function load(path, imports, globals = {}) { const module = { exports: {} }; vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), { exports: module.exports, require: name => imports[name] || {}, Request, Response, URL, URLSearchParams, AbortSignal, Buffer, crypto, TextEncoder, TextDecoder, Uint8Array, Date, process: { env: { SETTINGS_ENCRYPTION_KEY: key } }, ...globals }); return module.exports; }
async function encrypt(value) { const iv = crypto.getRandomValues(new Uint8Array(12)); const encryptionKey = await crypto.subtle.importKey('raw', Buffer.from(key, 'base64'), 'AES-GCM', false, ['encrypt']); const bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encryptionKey, new TextEncoder().encode(JSON.stringify(value))); return { iv: Buffer.from(iv).toString('base64'), ciphertext: Buffer.from(bytes).toString('base64') }; }
async function harness(approved = true, mode = 'commercial') {
  const storage = new Map([['etsy_credentials', { encrypted: true }]]); const jar = new Map(); const requests = []; const writes = [];
  const control = { terms: true, key: 'etsy-app', secret: 'private-shared-secret', intercept: null, status: 200, scope: 'listings_r', wrongShop: false, credentialReadIntercept: null };
  const settings = { readSetting: async name => storage.has(name) ? structuredClone(storage.get(name)) : null, writeSetting: async (name, value) => storage.set(name, structuredClone(value)), encryptCredentials: encrypt, decryptCredentials: async () => { await control.credentialReadIntercept?.(); return storage.get('etsy_credentials') ? { key: control.key, secret: control.secret } : null; } };
  const database = async (table, options = {}) => {
    writes.push({ table, options }); if (table !== 'app_settings') return null;
    const name = options.params?.key?.startsWith('eq.') ? options.params.key.slice(3) : options.body?.key;
    if (options.method === 'POST') { if (!storage.has(name) || !options.prefer.includes('ignore-duplicates')) storage.set(name, structuredClone(options.body.value)); return null; }
    if (options.method === 'DELETE' && options.params?.key?.startsWith('like.')) { const pattern = new RegExp('^' + options.params.key.slice(5).replaceAll('*', '.*') + '$'); for (const name of [...storage.keys()]) if (pattern.test(name)) storage.delete(name); return null; }
    const current = storage.get(name);
    for (const [parameter, expected] of Object.entries(options.params || {})) if (parameter.startsWith('value->>') && current?.[parameter.slice(8)] !== expected.slice(3)) return [];
    if (options.method === 'DELETE') { if (!storage.has(name)) return []; storage.delete(name); return [{ key: name }]; }
    if (options.method === 'PATCH') { if (!storage.has(name)) return []; storage.set(name, structuredClone(options.body.value)); return [{ key: name }]; }
    return current ? [{ value: structuredClone(current) }] : [];
  };
  const errors = load('lib/etsy.ts', {}); const search = load('lib/search-options.ts', { './etsy': errors });
  const access = load('lib/etsy-access.ts', { './supabase': { db: database }, './settings': settings, './etsy': errors });
  const network = async (urlString, init) => {
    const url = new URL(urlString); requests.push({ url, init }); const intercepted = await control.intercept?.(url, init); if (intercepted) return intercepted;
    if (control.status !== 200) return Response.json({}, { status: control.status });
    if (url.pathname.endsWith('/oauth/token')) return Response.json({ access_token: '42.private-access-token', refresh_token: '42.private-refresh-token', expires_in: 3600, scope: control.scope });
    if (url.pathname.endsWith('/users/42/shops')) return Response.json({ shop_id: 10, user_id: 42, shop_name: 'My &amp; Shop', transaction_sold_count: 999 });
    if (url.pathname.endsWith('/shops/10/listings')) return Response.json({ count: 30, results: [{ listing_id: 42, shop_id: control.wrongShop ? 11 : 10, state: url.searchParams.get('state'), title: 'Own &amp; original', description: 'My product description', tags: ['my artwork'], price: { amount: 1200, divisor: 100, currency_code: 'USD' }, num_favorers: 12, buyer_email: 'never-return@example.com', images: [{ url_570xN: 'https://i.etsystatic.com/own.jpg', alt_text: 'My product' }] }] });
    throw Error('Unexpected provider request ' + url.pathname);
  };
  const helper = load('lib/connections.ts', { 'next/headers': { cookies: async () => ({ get: name => jar.has(name) ? { value: jar.get(name) } : undefined, set: (name, value) => jar.set(name, value) }) }, './supabase': { db: database }, './settings': settings, './etsy': errors, './search-options': search, './etsy-access': access, './application-terms': { requireCurrentTerms: async () => { if (!control.terms) throw new errors.ApiError(428, 'Accept current terms.'); } } }, { fetch: network });
  async function approve(overrides = {}) { return access.changeEtsyAccess('operator', { action: 'approve', accessMode: mode, applicationPurpose: access.ETSY_REQUIRED_PURPOSE, approvalSource: 'developer_portal', approvalReference: 'Developer portal approval record', approvedAt: '2026-10-01', confirmApprovedPurpose: true, confirmSameApplication: true, ...overrides }); }
  if (approved) await approve();
  async function connect(userId = 'operator') { const start = new URL((await helper.beginConnection(userId, 'etsy', 'https://podadd.example', 'seller@example.com')).url); const callback = new URL(start.searchParams.get('redirect_uri')); callback.searchParams.set('state', start.searchParams.get('state')); callback.searchParams.set('code', 'authorized-code'); await helper.finishConnection(userId, 'etsy', callback.href); return start; }
  return { helper, access, storage, jar, requests, writes, control, connect, approve };
}

test('API keys alone do not approve the current application purpose', async () => { const h = await harness(false); assert.equal((await h.access.etsyAccessStatus('operator')).approved, false); await assert.rejects(h.connect(), error => error.status === 503); assert.equal(h.requests.length, 0); assert.equal((await h.helper.connectionStatus('operator', 'etsy')).connected, false); });
test('Personal and seller access is confined to the approving operator account', async () => { for (const mode of ['seller', 'personal']) { const h = await harness(true, mode); await assert.rejects(h.connect('other-user'), error => error.status === 503); assert.equal(h.requests.length, 0); await h.connect(); assert.equal((await h.helper.connectionStatus('operator', 'etsy')).connected, true); } });
test('Versioned terms acceptance gates connect, status and catalog reads', async () => { const h = await harness(); h.control.terms = false; for (const request of [() => h.connect(), () => h.helper.connectionStatus('operator', 'etsy'), () => h.helper.connectedShopListings('operator', { state: 'active', limit: 25, offset: 0 })]) await assert.rejects(request(), error => error.status === 428); assert.equal(h.requests.length, 0); });
test('Etsy OAuth requires HTTPS, PKCE and only listings_r; credentials stay encrypted', async () => { const h = await harness(); await assert.rejects(h.helper.beginConnection('operator', 'etsy', 'http://localhost:3000', ''), error => error.status === 400); const start = await h.connect(); assert.equal(start.searchParams.get('scope'), 'listings_r'); assert.equal(start.searchParams.get('code_challenge_method'), 'S256'); const status = await h.helper.connectionStatus('operator', 'etsy'); assert.equal(status.label, 'Your Etsy shop'); assert(!JSON.stringify(status).includes('private')); assert(!JSON.stringify(h.storage.get('connections:operator:etsy')).includes('private-access-token')); });

test('Connection metadata never persists or displays an Etsy-derived shop name, including legacy labels', async () => {
  const h = await harness(); await h.connect(); const saved = h.storage.get('connections:operator:etsy');
  const record = await h.helper.decryptConnectionValue(saved.encrypted);
  assert.equal(record.label, 'Your Etsy shop'); assert(!JSON.stringify(record).includes('My & Shop'));
  record.label = 'Outdated shop name'; record.connectedAt = new Date(Date.now() - 48 * 3600_000).toISOString(); saved.encrypted = await encrypt(record);
  const before = h.requests.length; const status = await h.helper.connectionStatus('operator', 'etsy');
  assert.equal(status.connected, true); assert.equal(status.label, 'Your Etsy shop'); assert(!JSON.stringify(status).includes('Outdated')); assert.equal(h.requests.length, before);
  const catalog = await h.helper.connectedShopListings('operator', { state: 'active', limit: 25, offset: 0 });
  assert.equal(catalog.shop.name, 'My & Shop');
  record.expiresAt = 0; saved.encrypted = await encrypt(record); await h.helper.activeConnection('operator', 'etsy');
  assert.equal((await h.helper.decryptConnectionValue(h.storage.get('connections:operator:etsy').encrypted)).label, 'Your Etsy shop');
});

test('Catalog returns one safe preview image instead of the complete image collection', async () => {
  const h = await harness(); await h.connect();
  h.control.intercept = async url => url.pathname.endsWith('/shops/10/listings') ? Response.json({ count: 1, results: [{ listing_id: 42, shop_id: 10, state: 'active', title: 'Own listing', images: [
    { url_570xN: 'https://other.example/unsafe.jpg' }, { url_570xN: 'http://i.etsystatic.com/unsafe.jpg' },
    { url_570xN: 'https://i.etsystatic.com/preview.jpg', alt_text: 'Preview' }, { url_570xN: 'https://i.etsystatic.com/extra.jpg', alt_text: 'Another image' },
  ] }] }) : undefined;
  const catalog = await h.helper.connectedShopListings('operator', { state: 'active', limit: 25, offset: 0 });
  assert.equal(catalog.listings[0].images.length, 1); assert.equal(catalog.listings[0].images[0].url, 'https://i.etsystatic.com/preview.jpg'); assert.equal(catalog.listings[0].images[0].alt, 'Preview');
});
test('Callbacks reject wrong user, expired state and replay before token exchange', async () => { const h = await harness(); const start = new URL((await h.helper.beginConnection('operator', 'etsy', 'https://podadd.example', '')).url); const callback = start.searchParams.get('redirect_uri') + '?code=code&state=' + start.searchParams.get('state'); const saved = h.jar.get('scout_oauth_etsy'); await assert.rejects(h.helper.finishConnection('other-user', 'etsy', callback), error => error.status === 400); h.jar.set('scout_oauth_etsy', saved); const decoded = await h.helper.decryptConnectionValue(JSON.parse(Buffer.from(saved, 'base64url').toString())); decoded.expiresAt = 0; h.jar.set('scout_oauth_etsy', Buffer.from(JSON.stringify(await encrypt(decoded))).toString('base64url')); await assert.rejects(h.helper.finishConnection('operator', 'etsy', callback), error => error.status === 400); assert.equal(h.requests.length, 0); h.jar.set('scout_oauth_etsy', saved); await h.helper.finishConnection('operator', 'etsy', callback); h.jar.set('scout_oauth_etsy', saved); await assert.rejects(h.helper.finishConnection('operator', 'etsy', callback), error => error.status === 400); });
test('Old broader permissions are never accepted or reused', async () => { const h = await harness(); h.control.scope = 'listings_r transactions_r shops_r'; await assert.rejects(h.connect(), error => error.status === 403); assert.equal((await h.helper.connectionStatus('operator', 'etsy')).connected, false); });
test('Approval revision, purpose or key changes invalidate stored grants before any request', async () => { for (const change of ['approval', 'key', 'purpose']) { const h = await harness(); await h.connect(); const before = h.requests.length; if (change === 'approval') await h.approve(); else if (change === 'key') h.control.key = 'changed-key'; else h.storage.get('etsy_access').purposeVersion = 'old-research-purpose'; await assert.rejects(h.helper.connectedShopListings('operator', { state: 'active', limit: 25, offset: 0 }), error => [409, 503].includes(error.status)); assert.equal(h.requests.length, before); assert.equal((await h.helper.connectionStatus('operator', 'etsy')).connected, false); } });
test('Own active and draft catalogs use the authenticated own-shop endpoint and exclude analytics/buyer data', async () => { const h = await harness(); await h.connect(); for (const state of ['active', 'draft']) { const result = await h.helper.connectedShopListings('operator', { state, limit: 25, offset: 0 }); assert.equal(result.shop.id, '10'); assert.equal(result.listings[0].title, 'Own & original'); assert.equal(result.listings[0].price.amount, 12); assert.equal(result.hasMore, true); assert.equal(new Date(result.expiresAt) - new Date(result.capturedAt), 6 * 3600_000); const encoded = JSON.stringify(result); for (const forbidden of ['num_favorers', 'favorites', 'sales', 'score', 'buyer_email', 'never-return', 'private-access']) assert(!encoded.includes(forbidden)); const request = h.requests.at(-1); assert.equal(request.url.pathname, '/v3/application/shops/10/listings'); assert.equal(request.url.searchParams.get('includes'), 'Images'); assert.equal(request.init.headers['x-api-key'], 'etsy-app:private-shared-secret'); } });
test('Different-shop responses and arbitrary catalog queries are rejected', async () => { const h = await harness(); await h.connect(); h.control.wrongShop = true; await assert.rejects(h.helper.connectedShopListings('operator', { state: 'draft', limit: 25, offset: 0 }), error => error.status === 502); const before = h.requests.length; for (const options of [{ state: 'sold_out', limit: 25, offset: 0 }, { state: 'active', limit: 100, offset: 0 }, { state: 'active', limit: 25, offset: -1 }]) await assert.rejects(h.helper.connectedShopListings('operator', options), error => error.status === 400); assert.equal(h.requests.length, before); });
test('Disconnect wins over OAuth completion, refresh and catalog responses', async () => { for (const phase of ['callback', 'refresh', 'catalog']) { const h = await harness(); if (phase !== 'callback') await h.connect(); if (phase === 'refresh') { const stored = h.storage.get('connections:operator:etsy'); const record = await h.helper.decryptConnectionValue(stored.encrypted); record.expiresAt = 0; stored.encrypted = await encrypt(record); } h.control.intercept = async url => { if ((phase === 'catalog' && url.pathname.endsWith('/listings')) || (phase !== 'catalog' && url.pathname.endsWith('/oauth/token'))) await h.helper.disconnectConnection('operator', 'etsy'); }; if (phase === 'callback') await assert.rejects(h.connect(), error => error.status === 409); else if (phase === 'refresh') await assert.rejects(h.helper.activeConnection('operator', 'etsy'), error => error.status === 409); else await assert.rejects(h.helper.connectedShopListings('operator', { state: 'active', limit: 25, offset: 0 }), error => error.status === 409); assert.equal((await h.helper.connectionStatus('operator', 'etsy')).connected, false); } });
test('Provider denial revokes approved access and prevents further requests or cached reads', async () => { const h = await harness(); await h.connect(); h.control.status = 403; await assert.rejects(h.helper.connectedShopListings('operator', { state: 'active', limit: 25, offset: 0 }), error => error.status === 503 && error.source === 'etsy' && error.message === 'The shop connection is currently unavailable. You can continue with the manual tools.'); assert.equal((await h.access.etsyAccessStatus()).state, 'revoked'); assert.equal(h.storage.get('connections:operator:etsy').encrypted, null); const count = h.requests.length; await assert.rejects(h.connect(), error => error.status === 503); assert.equal(h.requests.length, count); });
test('Withdrawal disables keys; explicit cleanup is confined to legacy Etsy data and grants', async () => { const h = await harness(); await h.connect(); h.storage.set('connections:operator:pinterest', { keep: true }); h.storage.set('campaigns:operator:resend', { keep: true }); h.storage.set('listing-drafts:operator', { keep: true }); await assert.rejects(h.access.changeEtsyAccess('operator', { action: 'purge', confirmCleanup: true, confirmation: 'WRONG' }), error => error.status === 400); await h.access.changeEtsyAccess('operator', { action: 'withdraw', confirmWithdraw: true }); assert.equal(h.storage.get('etsy_credentials'), null); await h.access.changeEtsyAccess('operator', { action: 'purge', confirmCleanup: true, confirmation: 'REMOVE ETSY DATA' }); assert(!h.storage.has('connections:operator:etsy')); assert(h.storage.has('connections:operator:pinterest')); assert(h.storage.has('campaigns:operator:resend')); assert(h.storage.has('listing-drafts:operator')); const deletedTables = h.writes.filter(write => write.options.method === 'DELETE').map(write => write.table); for (const name of ['research_cache', 'listing_snapshots', 'watchlist']) assert(deletedTables.includes(name)); });
test('Retired analytics and marketing helpers execute no storage or provider calls', async () => { const h = await harness(); const count = h.writes.length; for (const request of [() => h.helper.connectedShop('operator'), () => h.helper.connectedListing('operator', 'https://etsy.com/listing/42'), () => h.helper.publishPinterest('operator', {}), () => h.helper.pinterestBoards('operator'), () => h.helper.sendEmailTest({ userId: 'operator' }, {}), () => h.helper.beginConnection('operator', 'pinterest', '', '')]) await assert.rejects(request(), error => error.status === 410); assert.equal(h.writes.length, count); assert.equal(h.requests.length, 0); });
test('Approval and connection mutations reject foreign origins before identity or storage', async () => { let accesses = 0; const route = load('app/api/admin/etsy-access/route.ts', { '../../../../lib/auth': { getUser: async () => { accesses++; } }, '../../../../lib/admin': { sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin, json: (data, status = 200) => Response.json(data, { status }) }, '../../../../lib/api': { errorResponse: error => Response.json({}, { status: error.status || 500 }) }, '../../../../lib/etsy': load('lib/etsy.ts', {}) }); const response = await route.POST(new Request('https://podadd.example/api/admin/etsy-access', { method: 'POST', headers: { origin: 'https://foreign.example' }, body: '{}' })); assert.equal(response.status, 403); assert.equal(accesses, 0); });

test('Approval accepts only the supported purpose, valid dates, and explicit declarations', async () => {
  const h = await harness(false);
  for (const override of [{ applicationPurpose: 'General marketplace research and analytics' }, { approvedAt: '2026-02-31' }, { approvedAt: '2999-01-01' }, { confirmApprovedPurpose: false }, { confirmSameApplication: false }, { approvalSource: 'operator_guess' }]) {
    await assert.rejects(h.approve(override), error => error.status === 400);
    assert.equal((await h.access.etsyAccessStatus()).approved, false);
  }
  assert.equal(h.requests.length, 0);
});

test('Incomplete or stale stored approval records fail closed before provider calls', async () => {
  for (const change of [{ approvedAt: '2999-01-01' }, { recordedAt: 'invalid-date' }, { revision: '' }, { applicationPurpose: 'A different purpose approved for another app' }, { approvalReference: '' }, { approvalSource: 'unknown' }]) {
    const h = await harness(); Object.assign(h.storage.get('etsy_access'), change);
    await assert.rejects(h.connect(), error => error.status === 503);
    assert.equal(h.requests.length, 0);
  }
});

test('An approval change during credential loading cannot authorize a stale purpose revision', async () => {
  const h = await harness(); await h.connect(); const before = h.requests.length;
  h.control.credentialReadIntercept = async () => { h.control.credentialReadIntercept = null; h.storage.get('etsy_access').revision = crypto.randomUUID(); };
  await assert.rejects(h.helper.connectedShopListings('operator', { state: 'active', limit: 25, offset: 0 }), error => error.status === 409);
  assert.equal(h.requests.length, before);
});

test('Withdrawal and revised approval remove all stale Etsy tokens without changing manual drafts or other providers', async () => {
  for (const action of ['withdraw', 'approve']) {
    const h = await harness(); await h.connect(); await h.connect('other-user');
    h.storage.set('listing-drafts:operator', { independent: true }); h.storage.set('connections:operator:pinterest', { retired: true });
    if (action === 'approve') await h.approve(); else await h.access.changeEtsyAccess('operator', { action: 'withdraw', confirmWithdraw: true });
    for (const name of ['connections:operator:etsy', 'connections:other-user:etsy', 'connections:operator:etsy:oauth', 'connections:other-user:etsy:oauth']) assert(!h.storage.has(name));
    assert(h.storage.has('listing-drafts:operator')); assert(h.storage.has('connections:operator:pinterest'));
  }
});

test('Etsy denial removes other users’ stale grants as well as stopping the failed connection', async () => {
  const h = await harness(); await h.connect(); await h.connect('other-user'); h.control.status = 401;
  await assert.rejects(h.helper.connectedShopListings('operator', { state: 'active', limit: 25, offset: 0 }), error => error.status === 503);
  assert(!h.storage.has('connections:other-user:etsy'));
  assert.equal((await h.access.etsyAccessStatus('other-user')).available, false);
});

test('Token refresh cannot switch to another Etsy account or broaden the granted scopes', async () => {
  for (const change of ['identity', 'scope']) {
    const h = await harness(); await h.connect(); const saved = h.storage.get('connections:operator:etsy');
    const record = await h.helper.decryptConnectionValue(saved.encrypted); record.expiresAt = 0; saved.encrypted = await encrypt(record);
    h.control.intercept = async url => url.pathname.endsWith('/oauth/token') ? Response.json({ access_token: change === 'identity' ? '99.other-access' : '42.refreshed-access', refresh_token: change === 'identity' ? '99.other-refresh' : '42.refreshed-refresh', expires_in: 3600, scope: change === 'scope' ? 'listings_r shops_r' : 'listings_r' }) : undefined;
    await assert.rejects(h.helper.activeConnection('operator', 'etsy'), error => error.status === 403);
    assert.equal(h.storage.get('connections:operator:etsy').encrypted, null);
    assert.equal((await h.helper.connectionStatus('operator', 'etsy')).connected, false);
  }
});

test('Expired refresh grants are removed and never reused or displayed as connected', async () => {
  const h = await harness(); await h.connect(); const saved = h.storage.get('connections:operator:etsy');
  const record = await h.helper.decryptConnectionValue(saved.encrypted);
  assert(record.refreshExpiresAt > Date.now() + 89 * 86400_000 && record.refreshExpiresAt <= Date.now() + 90 * 86400_000);
  record.expiresAt = 0; record.refreshExpiresAt = 0; saved.encrypted = await encrypt(record); const before = h.requests.length;
  assert.equal((await h.helper.connectionStatus('operator', 'etsy')).connected, false);
  await assert.rejects(h.helper.activeConnection('operator', 'etsy'), error => error.status === 409);
  assert.equal(h.requests.length, before); assert.equal(h.storage.get('connections:operator:etsy').encrypted, null);
});

test('Only active/draft pagination is accepted by the public catalog route', async () => {
  let activity = 0; const errors = load('lib/etsy.ts', {});
  const route = load('app/api/shop-listings/route.ts', {
    '../../../lib/api': { researchAccess: async () => { activity++; return { userId: 'verified-user' }; }, errorResponse: error => Response.json({}, { status: error.status || 500 }) },
    '../../../lib/admin': { json: (data, status = 200) => Response.json(data, { status }) }, '../../../lib/etsy': errors,
    '../../../lib/connections': { connectedShopListings: async () => { activity++; return {}; } },
  });
  for (const query of ['shop_id=999', 'q=competitor', 'state=active&state=draft', 'limit=25&limit=1', 'state=sold_out', 'offset=-1']) assert.equal((await route.GET(new Request('https://podadd.example/api/shop-listings?' + query))).status, 400);
  assert.equal(activity, 0);
  assert.equal((await route.GET(new Request('https://podadd.example/api/shop-listings?state=draft&limit=25&offset=0'))).status, 200);
  assert.equal(activity, 2);
});

test('Retired Pinterest and email publish routes never authenticate, read data, or contact providers', async () => {
  for (const path of ['pinterest/publish', 'email/send']) {
    let activity = 0; const fail = async () => { activity++; throw Error('Unexpected activity'); };
    const route = load(`app/api/connections/${path}/route.ts`, { '../../../../../lib/admin': { json: (data, status = 200) => Response.json(data, { status }) }, '../../../../../lib/api': { researchAccess: fail }, '../../../../../lib/connections': { publishPinterest: fail, sendEmailTest: fail } }, { fetch: fail });
    assert.equal((await route.POST(new Request('https://podadd.example/api/connections/' + path, { method: 'POST', body: '{}' }))).status, 410);
    assert.equal(activity, 0);
  }
});
