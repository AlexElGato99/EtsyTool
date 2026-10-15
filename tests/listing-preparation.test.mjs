import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports = {}, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }), {
    exports: module.exports, require: name => imports[name] || {},
    Request, Response, URL, URLSearchParams, Buffer, crypto: globalThis.crypto, TextEncoder, TextDecoder, Uint8Array, ...globals,
  });
  return module.exports;
}
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const version = load('lib/terms-version.ts');
const draftModule = load('lib/listing-draft.ts');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const draftId = '33333333-3333-4333-8333-333333333333';
const draft = { title: 'My original printable', description: 'A product I designed.', tags: ['weekly planner'], notes: 'Proofread the instructions.', listingUrl: '' };
const plain = value => JSON.parse(JSON.stringify(value));

function termsFixture() {
  const storage = new Map(); const writes = [];
  const terms = load('lib/application-terms.ts', {
    './settings': { readSetting: async key => storage.get(key), writeSetting: async (key, value) => { writes.push({ key, value }); storage.set(key, plain(value)); } },
    './etsy': { ApiError }, './terms-version': version,
  });
  return { ...terms, storage, writes };
}
test('Terms require a current server receipt for the verified account, excluding outdated or future receipts', async () => {
  const h = termsFixture();
  for (const receipt of [undefined, { version: 'old', acceptedAt: new Date().toISOString() }, { version: version.APPLICATION_TERMS_VERSION, acceptedAt: 'not-a-date' }, { version: version.APPLICATION_TERMS_VERSION, acceptedAt: new Date(Date.now() + 3600000).toISOString() }]) {
    h.storage.set('application-terms:' + owner, receipt);
    assert.equal((await h.termsAcceptanceStatus(owner)).accepted, false);
    await assert.rejects(h.requireCurrentTerms(owner), error => error.status === 428);
  }
  await h.recordTermsAcceptance(owner, 'workspace');
  assert.equal((await h.termsAcceptanceStatus(owner)).accepted, true);
  assert.equal((await h.termsAcceptanceStatus(other)).accepted, false);
  assert.equal(h.writes[0].key, 'application-terms:' + owner);
  assert.equal(h.writes[0].value.termsPath, '/terms');
  assert.equal(h.writes[0].value.privacyPath, '/privacy');
  await assert.rejects(h.recordTermsAcceptance('../another-account', 'workspace'), error => error.status === 400);
  assert.equal(h.writes.length, 1);
});

test('Terms endpoint rejects cross-origin or outdated consent and never accepts caller-selected identity', async () => {
  const h = termsFixture(); let signedIn = true; let identities = 0;
  const route = load('app/api/terms/route.ts', {
    '../../../lib/application-terms': h, '../../../lib/terms-version': version, '../../../lib/etsy': { ApiError },
    '../../../lib/api': { userAccess: async () => { identities++; if (!signedIn) throw new ApiError(401, 'Sign in.'); return { userId: owner }; }, parseBody: request => request.json(), errorResponse: error => Response.json({ error: error.message }, { status: error.status || 500 }) },
    '../../../lib/admin': { json: (data, status = 200) => Response.json(data, { status }), sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin },
  });
  const request = (body, origin = 'https://podadd.example') => new Request('https://podadd.example/api/terms', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await route.POST(request({ acceptTerms: true, version: version.APPLICATION_TERMS_VERSION }, 'https://foreign.example'))).status, 403);
  assert.equal(identities, 0); assert.equal(h.writes.length, 0);
  assert.equal((await route.POST(request({ acceptTerms: true, version: 'old' }))).status, 400);
  signedIn = false; assert.equal((await route.GET()).status, 401); signedIn = true;
  assert.equal((await route.POST(request({ acceptTerms: true, version: version.APPLICATION_TERMS_VERSION, userId: other, acceptedAt: '2000-01-01' }))).status, 200);
  assert.equal(h.writes[0].key, 'application-terms:' + owner);
  assert.notEqual(h.writes[0].value.acceptedAt, '2000-01-01');
  assert.equal((await h.termsAcceptanceStatus(other)).accepted, false);
});

test('Manual draft validation bounds original text, distinct tags and safe own listing references', () => {
  const clean = draftModule.validateDraftInput({ ...draft, title: '  My own design  ', listingUrl: 'https://www.etsy.com/listing/12345/my-work?tracking=ignored#details' });
  assert.equal(clean.title, 'My own design'); assert.equal(clean.listingUrl, 'https://www.etsy.com/listing/12345/my-work');
  for (const invalid of [
    { title: '' }, { title: 'x'.repeat(141) }, { title: 'one\ntwo' }, { title: 'hidden\u0000content' },
    { description: 'x'.repeat(10001) }, { notes: 'x'.repeat(2001) }, { tags: ['duplicate', 'DUPLICATE'] },
    { tags: Array.from({ length: 14 }, (_, i) => String(i)) }, { tags: ['x'.repeat(21)] }, { tags: ['one\ntwo'] },
    ...['http://www.etsy.com/listing/12345', 'https://outside.example/listing/12345', 'https://www.etsy.com/shop/Other', 'https://etsy.com.evil.example/listing/12345', 'https://member:password@www.etsy.com/listing/12345', 'https://www.etsy.com:444/listing/12345', 'javascript:alert(1)'].map(listingUrl => ({ listingUrl })),
  ]) assert.throws(() => draftModule.validateDraftInput({ ...draft, ...invalid }));
});

function draftsFixture() {
  const storage = new Map(); const writes = []; let failCAS = false;
  const encryptionKey = Buffer.alloc(32, 6).toString('base64');
  const settings = load('lib/settings.ts', {}, { process: { env: { SETTINGS_ENCRYPTION_KEY: encryptionKey } } });
  async function decrypt(envelope) {
    const key = await crypto.subtle.importKey('raw', Buffer.from(encryptionKey, 'base64'), 'AES-GCM', false, ['decrypt']);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(envelope.iv, 'base64') }, key, Buffer.from(envelope.ciphertext, 'base64'))));
  }
  const db = async (table, options) => {
    assert.equal(table, 'app_settings'); writes.push(plain(options));
    if (failCAS) return [];
    if (options.method === 'POST') { if (storage.has(options.body.key)) return []; storage.set(options.body.key, plain(options.body.value)); return [{ key: options.body.key }]; }
    const key = options.params.key.slice(3); const previous = storage.get(key);
    if (!previous || options.params['value->>revision'] !== 'eq.' + previous.revision) return [];
    storage.set(key, plain(options.body.value)); return [{ key }];
  };
  const helper = load('lib/manual-drafts.ts', {
    './supabase': { db }, './etsy': { ApiError }, './listing-draft': draftModule,
    './connections': { decryptConnectionValue: decrypt }, './settings': { ...settings, readSetting: async key => storage.get(key) },
  });
  return { ...helper, storage, writes, decrypt, encrypt: settings.encryptCredentials, failCAS: () => { failCAS = true; } };
}
test('Saved drafts are encrypted and scoped to their owner; edits preserve creation time and stale tabs cannot overwrite', async () => {
  const h = draftsFixture();
  const first = await h.changeDraft(owner, { action: 'save', id: draftId, ...draft, revision: null, ownerId: other });
  assert.equal(first.drafts.length, 1); assert.equal(first.limit, 30);
  assert(!JSON.stringify(h.storage.get('listing-drafts:' + owner)).includes(draft.description));
  assert.equal((await h.decrypt(h.storage.get('listing-drafts:' + owner).encrypted)).ownerId, owner);
  assert.equal((await h.listingDraftState(other)).drafts.length, 0);
  await assert.rejects(h.changeDraft(owner, { action: 'save', id: draftId, ...draft, title: 'Stale overwrite', revision: null }), error => error.status === 409);
  const second = await h.changeDraft(owner, { action: 'save', id: draftId, ...draft, title: 'Revised by me', revision: first.revision });
  assert.equal(second.drafts.length, 1); assert.equal(second.drafts[0].createdAt, first.drafts[0].createdAt);
  assert.equal(second.drafts[0].title, 'Revised by me'); assert.notEqual(second.revision, first.revision);
  assert.equal((await h.listingDraftState(owner)).drafts[0].title, 'Revised by me');
  for (const action of [['save'], ['delete'], ['clear'], { toString: 'save' }]) {
    await assert.rejects(h.changeDraft(owner, { action, id: draftId, revision: second.revision }), error => error.status === 400);
  }
  assert.equal((await h.listingDraftState(owner)).drafts[0].title, 'Revised by me');
  assert.equal((await h.listingDraftState(owner)).revision, second.revision);
});
test('Concurrent writes fail safely, encrypted owner mismatches and corrupt ciphertext never return drafts', async () => {
  const h = draftsFixture(); h.failCAS();
  await assert.rejects(h.changeDraft(owner, { action: 'save', id: draftId, ...draft, revision: null }), error => error.status === 409);
  assert.equal(h.storage.size, 0);
  h.storage.set('listing-drafts:' + owner, { revision: crypto.randomUUID(), encrypted: await h.encrypt({ ownerId: other, drafts: [] }) });
  await assert.rejects(h.listingDraftState(owner), error => error.status === 503);
  h.storage.set('listing-drafts:' + owner, { revision: crypto.randomUUID(), encrypted: { iv: 'broken', ciphertext: 'broken' } });
  await assert.rejects(h.listingDraftState(owner), error => error.status === 503);
});
test('Draft capacity is bounded; confirmed deletes affect only the verified owner', async () => {
  const h = draftsFixture(); const revision = crypto.randomUUID();
  const records = Array.from({ length: 30 }, () => ({ ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  h.storage.set('listing-drafts:' + owner, { revision, encrypted: await h.encrypt({ ownerId: owner, drafts: records }) });
  await assert.rejects(h.changeDraft(owner, { action: 'save', id: draftId, ...draft, revision }), error => error.status === 409);
  await assert.rejects(h.changeDraft(owner, { action: 'clear', revision }), error => error.status === 400);
  const removed = await h.changeDraft(owner, { action: 'delete', id: records[0].id, revision }); assert.equal(removed.drafts.length, 29);
  const another = await h.changeDraft(other, { action: 'save', id: draftId, ...draft, revision: null });
  const cleared = await h.changeDraft(owner, { action: 'clear', confirmDelete: true, revision: removed.revision });
  assert.equal(cleared.drafts.length, 0); assert.equal((await h.listingDraftState(other)).revision, another.revision);
});
test('Draft API uses verified identity and current terms for saving while allowing deletion after terms change', async () => {
  let allowed = false; let accesses = 0; const changes = [];
  const route = load('app/api/drafts/route.ts', {
    '../../../lib/etsy': { ApiError },
    '../../../lib/api': { researchAccess: async () => { accesses++; return { userId: owner }; }, parseBody: request => request.json(), errorResponse: error => Response.json({ error: error.message }, { status: error.status || 500 }) },
    '../../../lib/admin': { json: data => Response.json(data), sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin },
    '../../../lib/application-terms': { requireCurrentTerms: async () => { if (!allowed) throw new ApiError(428, 'Accept updated terms.'); } },
    '../../../lib/manual-drafts': { listingDraftState: async userId => ({ userId }), changeDraft: async (userId, body) => { changes.push({ userId, body }); return { ok: true }; } },
  });
  const request = (action, origin = 'https://podadd.example') => new Request('https://podadd.example/api/drafts', { method: 'POST', headers: { origin }, body: JSON.stringify({ action, userId: other }) });
  assert.equal((await route.POST(request('save', 'https://foreign.example'))).status, 403); assert.equal(accesses, 0);
  assert.equal((await route.GET()).status, 428); assert.equal((await route.POST(request('save'))).status, 428); assert.equal(changes.length, 0);
  assert.equal((await route.POST(request('delete'))).status, 200); assert.equal(changes[0].userId, owner);
  allowed = true; assert.equal((await route.POST(request('save'))).status, 200); assert.equal(changes[1].userId, owner);
  assert.equal((await (await route.GET()).json()).userId, owner);
});
