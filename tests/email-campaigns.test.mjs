import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const keyBytes = Buffer.alloc(32, 21);
async function encrypt(value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { iv: Buffer.from(iv).toString('base64'), ciphertext: Buffer.from(bytes).toString('base64') };
}
async function decrypt(value) {
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(value.iv, 'base64') }, key, Buffer.from(value.ciphertext, 'base64'));
  return JSON.parse(new TextDecoder().decode(bytes));
}
const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const ownCredentials = { apiKey: 're_user_private_dummy_key', fromEmail: 'updates@myshop.example', fromName: 'My Shop' };
function load(path, imports, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), {
    exports: module.exports, require: name => imports[name] || {}, Request, Response, URL, URLSearchParams, AbortSignal,
    Buffer, crypto, TextEncoder, TextDecoder, Uint8Array, Date, setTimeout, ...globals,
  });
  return module.exports;
}
function harness() {
  const storage = new Map(); const requests = []; const contacts = new Map(); const segments = new Map(); const broadcasts = new Map();
  let serial = 100; let elapsed = 0; const startTime = Date.now();
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [startTime + elapsed])); } static now() { return startTime + elapsed; } }
  const control = { intercept: null, domainVerified: true, segmentPages: null, senderOnly: false, afterRead: null, sends: 0 };
  const database = async (resource, options = {}) => {
    assert.equal(resource, 'app_settings');
    const key = options.params?.key?.slice(3) || options.body?.key;
    if (options.method === 'POST') { if (!storage.has(key) || !options.prefer.includes('ignore-duplicates')) storage.set(key, structuredClone(options.body.value)); return null; }
    const current = storage.get(key);
    if (options.params?.['value->>revision'] && current?.revision !== options.params['value->>revision'].slice(3)) return [];
    if (options.method === 'PATCH') { if (!storage.has(key)) return []; storage.set(key, structuredClone(options.body.value)); return [{ key }]; }
    return current ? [{ value: structuredClone(current) }] : [];
  };
  const list = (values, url) => {
    const after = url.searchParams.get('after'); const limit = Number(url.searchParams.get('limit') || 50);
    const index = after ? values.findIndex(item => item.id === after) + 1 : 0;
    return Response.json({ data: values.slice(index, index + limit), has_more: index + limit < values.length });
  };
  const missing = () => Response.json({ name: 'not_found' }, { status: 404 });
  const network = async (input, init = {}) => {
    const url = new URL(input); const method = init.method || 'GET'; const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ url: url.href, path: url.pathname, method, body, headers: init.headers, at: Clock.now() });
    assert.equal(url.origin, 'https://api.resend.com'); assert.equal(init.headers.Authorization, 'Bearer ' + ownCredentials.apiKey);
    const intercepted = await control.intercept?.(url, init, body); if (intercepted) return intercepted;
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] === 'domains') {
      const domain = { id: id(1), name: 'myshop.example', status: control.domainVerified ? 'verified' : 'pending', capabilities: { sending: 'enabled' } };
      return parts.length === 1 ? list([domain], url) : Response.json(domain);
    }
    if (control.senderOnly && method === 'GET' && ['segments', 'broadcasts'].includes(parts[0])) return Response.json({}, { status: 403 });
    if (parts[0] === 'segments') {
      if (method === 'POST') { const segment = { id: id(++serial), name: body.name }; segments.set(segment.id, segment); return Response.json(segment); }
      if (parts.length === 1) return list([...segments.values()], url);
      if (parts[2] === 'contacts') {
        if (control.segmentPages) return control.segmentPages(url);
        return list([...contacts.values()].filter(contact => contact.memberships.has(parts[1])).map(({ memberships, ...contact }) => contact), url);
      }
    }
    if (parts[0] === 'contacts') {
      if (parts.length === 1 && method === 'POST') {
        if ([...contacts.values()].some(contact => contact.email === body.email)) return Response.json({}, { status: 409 });
        const contact = { id: id(++serial), email: body.email, first_name: body.first_name || '', last_name: body.last_name || '', unsubscribed: false, memberships: new Set() };
        contacts.set(contact.id, contact); return Response.json({ id: contact.id });
      }
      const contact = contacts.get(parts[1]) || [...contacts.values()].find(item => item.email === parts[1]);
      if (!contact) return missing();
      if (parts[2] === 'segments') {
        if (method === 'POST') contact.memberships.add(parts[3]);
        if (method === 'DELETE') contact.memberships.delete(parts[3]);
        return Response.json({ id: contact.id });
      }
      const { memberships, ...value } = contact; return Response.json(value);
    }
    if (parts[0] === 'broadcasts') {
      if (parts.length === 1 && method === 'GET') return list([...broadcasts.values()], url);
      if (parts.length === 1 && method === 'POST') {
        const broadcast = { id: id(++serial), ...body, status: 'draft', created_at: new Clock().toISOString(), scheduled_at: null, sent_at: null };
        broadcasts.set(broadcast.id, broadcast); return Response.json({ id: broadcast.id });
      }
      const broadcast = broadcasts.get(parts[1]); if (!broadcast) return missing();
      if (parts[2] === 'send') { control.sends++; broadcast.status = body.scheduled_at ? 'scheduled' : 'queued'; broadcast.scheduled_at = body.scheduled_at || null; return Response.json({ id: broadcast.id }); }
      if (parts[2] === 'cancel') { broadcast.status = broadcast.status === 'scheduled' ? 'draft' : 'canceled'; broadcast.scheduled_at = null; return Response.json({ id: broadcast.id }); }
      if (method === 'PATCH') { Object.assign(broadcast, body); return Response.json({ id: broadcast.id }); }
      if (method === 'DELETE') { broadcasts.delete(broadcast.id); return Response.json({ id: broadcast.id, deleted: true }); }
      return Response.json(broadcast);
    }
    throw Error('Unexpected mocked provider request ' + url.pathname);
  };
  const helper = load('lib/email-campaigns.ts', {
    './supabase': { db: database }, './settings': { encryptCredentials: encrypt, readSetting: async key => storage.has(key) ? structuredClone(storage.get(key)) : null },
    './connections': { decryptConnectionValue: decrypt }, './etsy': { ApiError },
  }, { fetch: network, Date: Clock, setTimeout: (callback, wait) => { elapsed += wait; callback(); } });
  const action = (name, body = {}, userId = 'user-a') => helper.campaignAction(userId, { action: name, requestId: crypto.randomUUID(), ...body });
  const connect = (userId = 'user-a') => action('connect', ownCredentials, userId);
  const add = address => action('add-contact', { email: address, firstName: 'Subscriber', confirmConsent: true });
  const create = () => action('create-draft', { name: 'New products', subject: 'Shop update', text: 'Real <product> details & more.' });
  return { helper, storage, requests, contacts, segments, broadcasts, control, action, connect, add, create, Clock };
}

test('Own campaign connection verifies sender and full access, encrypts key and creates a user-specific segment', async () => {
  const h = harness(); const response = await h.connect(); assert.equal(response.account.connected, true); assert.equal(response.account.fromEmail, ownCredentials.fromEmail);
  const stored = h.storage.get('campaigns:user-a:resend'); assert(stored.encrypted.ciphertext); assert(!JSON.stringify(stored).includes(ownCredentials.apiKey));
  assert(!JSON.stringify(response).includes(ownCredentials.apiKey)); assert.equal((await h.helper.campaignAccount('user-b')).connected, false);
  assert.equal(h.requests.find(request => request.method === 'POST').path, '/segments'); assert(!h.requests.some(request => request.path.includes('/audiences')));
  for (let index = 1; index < h.requests.length; index++) assert(h.requests[index].at - h.requests[index - 1].at >= 550);
  assert.equal(h.requests.length, 4);
});

test('Unverified domains, unrelated sender domains, sending-only keys and invalid credentials fail without provider writes', async () => {
  for (const setting of ['unverified', 'unrelated', 'sending-only']) {
    const h = harness(); h.control.domainVerified = setting !== 'unverified'; h.control.senderOnly = setting === 'sending-only';
    await assert.rejects(h.action('connect', { ...ownCredentials, fromEmail: setting === 'unrelated' ? 'owner@other.example' : ownCredentials.fromEmail }), error => [400, 403].includes(error.status));
    assert(!h.requests.some(request => request.method !== 'GET')); assert.equal((await h.helper.campaignAccount('user-a')).connected, false);
  }
  const h = harness(); await assert.rejects(h.action('connect', { ...ownCredentials, fromName: 'Sender\r\nInjected' }), error => error.status === 400); assert.equal(h.requests.length, 0);
});

test('Consent is mandatory, global unsubscribe is preserved, existing contacts are not patched or resubscribed', async () => {
  const h = harness(); const connection = await h.connect();
  await assert.rejects(h.action('add-contact', { email: 'subscriber@example.com' }), error => error.status === 400);
  h.contacts.set(id(2), { id: id(2), email: 'unsubscribed@example.com', unsubscribed: true, memberships: new Set([connection.account.segmentId]) });
  await assert.rejects(h.add('unsubscribed@example.com'), error => error.status === 409);
  h.contacts.set(id(3), { id: id(3), email: 'existing@example.com', first_name: 'Existing', last_name: '', unsubscribed: false, memberships: new Set() });
  const added = await h.add('existing@example.com'); assert.equal(added.contact.id, id(3)); assert.equal(added.contact.consentRecorded, true);
  assert(!h.requests.some(request => request.path === '/contacts' && request.method === 'POST'));
  assert(!h.requests.some(request => request.path.startsWith('/contacts') && request.method === 'PATCH'));
  assert(h.contacts.get(id(3)).memberships.has(connection.account.segmentId));
});

test('Creating a new contact omits suppression mutation and duplicate races reread existing state', async () => {
  const h = harness(); await h.connect(); await h.add('new@example.com');
  const created = h.requests.find(request => request.path === '/contacts' && request.method === 'POST'); assert(!('unsubscribed' in created.body));
  const h2 = harness(); await h2.connect();
  h2.control.intercept = async (url, init, body) => {
    if (url.pathname === '/contacts' && init.method === 'POST') {
      h2.contacts.set(id(5), { id: id(5), email: body.email, unsubscribed: true, memberships: new Set() });
      return Response.json({}, { status: 409 });
    }
  };
  await assert.rejects(h2.add('raced@example.com'), error => error.status === 409); assert.equal(h2.contacts.get(id(5)).unsubscribed, true); assert(!h2.requests.some(request => request.path.endsWith('/segments') && request.method === 'POST'));
});

test('Contacts pagination is scoped to the own segment and removal deletes only membership', async () => {
  const h = harness(); const connected = await h.connect(); const added = await h.add('member@example.com');
  h.contacts.get(added.contact.id).memberships.add(id(999));
  const listed = await h.helper.campaignContacts('user-a'); assert.equal(listed.contacts.length, 1); assert.equal(listed.hasMore, false); assert.equal(listed.nextCursor, null);
  h.control.segmentPages = () => Response.json({ data: [{ id: added.contact.id, email: added.contact.email, unsubscribed: false }], has_more: true });
  const paged = await h.helper.campaignContacts('user-a', id(50)); assert.equal(paged.hasMore, true); assert.equal(paged.nextCursor, added.contact.id); h.control.segmentPages = null;
  await h.action('remove-contact', { contactId: added.contact.id }); assert(h.contacts.has(added.contact.id)); assert(h.contacts.get(added.contact.id).memberships.has(id(999))); assert(!h.contacts.get(added.contact.id).memberships.has(connected.account.segmentId));
  assert(h.requests.some(request => request.path === `/contacts/${added.contact.id}/segments/${connected.account.segmentId}` && request.method === 'DELETE'));
  await assert.rejects(h.action('remove-contact', { contactId: id(999) }), error => error.status === 404);
});

test('Drafts escape plain text, add unsubscribe automatically, reject interpolation and never send at creation', async () => {
  const h = harness(); await h.connect(); const created = await h.create(); assert.equal(created.broadcast.status, 'draft');
  const call = h.requests.find(request => request.path === '/broadcasts' && request.method === 'POST'); assert(call.body.html.includes('Real &lt;product&gt; details &amp; more.')); assert(call.body.html.includes('{{{RESEND_UNSUBSCRIBE_URL}}}')); assert(!call.body.send);
  assert.equal(call.body.from, 'My Shop <updates@myshop.example>'); assert.equal(call.body.segment_id, created.account.segmentId);
  assert.equal(h.control.sends, 0);
  await assert.rejects(h.action('create-draft', { name: 'Test', subject: 'Hi', text: '{{{EMAIL}}}' }), error => error.status === 400);
  const record = await decrypt(h.storage.get('campaigns:user-a:resend').encrypted); assert.equal(record.broadcasts[0].text, created.broadcast.text); assert(record.contacts.every(item => typeof item.email === 'string'));
});

test('Broadcast ownership and same request/content checks precede provider mutation', async () => {
  const h = harness(); await h.connect(); const created = await h.create(); const previousWrites = h.requests.filter(request => request.method !== 'GET').length;
  await assert.rejects(h.action('send', { broadcastId: created.broadcast.id, confirmSend: true }, 'user-b'), error => error.status === 409);
  await assert.rejects(h.action('update-draft', { broadcastId: id(999), name: 'Other', subject: 'Other', text: 'Other' }), error => error.status === 404);
  assert.equal(h.requests.filter(request => request.method !== 'GET').length, previousWrites);
  const requestId = crypto.randomUUID(); const body = { requestId, name: 'Stable', subject: 'Stable', text: 'Same text' };
  const first = await h.action('create-draft', body); const second = await h.action('create-draft', body); assert.equal(first.broadcast.id, second.broadcast.id);
  await assert.rejects(h.action('create-draft', { ...body, text: 'Changed' }), error => error.status === 409);
});

test('Draft update/send/schedule/cancel/delete use real endpoint contracts and prevent repeated delivery', async () => {
  const h = harness(); await h.connect(); await h.add('opted-in@example.com'); const created = await h.create();
  await h.action('update-draft', { broadcastId: created.broadcast.id, name: 'Edited', subject: 'Edited subject', text: 'Updated content' });
  const requestId = crypto.randomUUID(); const scheduledAt = new Date(h.Clock.now() + 3600_000).toISOString();
  const scheduled = await h.action('send', { requestId, broadcastId: created.broadcast.id, confirmSend: true, scheduledAt }); assert.equal(scheduled.broadcast.status, 'scheduled');
  await h.action('send', { requestId, broadcastId: created.broadcast.id, confirmSend: true, scheduledAt }); assert.equal(h.control.sends, 1);
  await assert.rejects(h.action('send', { broadcastId: created.broadcast.id, confirmSend: true }), error => error.status === 409);
  assert(h.requests.some(request => request.path.endsWith('/send') && request.body.scheduled_at === scheduledAt));
  const canceled = await h.action('cancel', { broadcastId: created.broadcast.id, confirmCancel: true }); assert.equal(canceled.broadcast.status, 'draft');
  const sent = await h.action('send', { broadcastId: created.broadcast.id, confirmSend: true }); assert.equal(sent.broadcast.status, 'queued');
  const queuedCanceled = await h.action('cancel', { broadcastId: created.broadcast.id, confirmCancel: true }); assert.equal(queuedCanceled.broadcast.status, 'canceled');
  await assert.rejects(h.action('delete-draft', { broadcastId: created.broadcast.id, confirmDelete: true }), error => error.status === 409);
  const draft = await h.create(); await h.action('delete-draft', { broadcastId: draft.broadcast.id, confirmDelete: true }); assert(!h.broadcasts.has(draft.broadcast.id));
});

test('Send enforces consent across the complete segment, confirmations and scheduling window', async () => {
  const h = harness(); const connected = await h.connect(); const created = await h.create();
  h.contacts.set(id(15), { id: id(15), email: 'outside@example.com', unsubscribed: false, memberships: new Set([connected.account.segmentId]) });
  await assert.rejects(h.action('send', { broadcastId: created.broadcast.id, confirmSend: true }), error => error.status === 409);
  await assert.rejects(h.action('send', { broadcastId: created.broadcast.id }), error => error.status === 400);
  await assert.rejects(h.action('send', { broadcastId: created.broadcast.id, confirmSend: true, scheduledAt: new Date(h.Clock.now() + 60_000).toISOString() }), error => error.status === 400);
  await assert.rejects(h.action('send', { broadcastId: created.broadcast.id, confirmSend: true, scheduledAt: new Date(h.Clock.now() + 31 * 86400_000).toISOString() }), error => error.status === 400);
  assert.equal(h.control.sends, 0); await h.add('outside@example.com'); await h.action('send', { broadcastId: created.broadcast.id, confirmSend: true }); assert.equal(h.control.sends, 1);
});

test('Concurrent mutations are locked and disconnect tombstones prevent in-flight credential restoration', async () => {
  const h = harness(); await h.connect(); let release; let entered;
  const started = new Promise(resolve => { entered = resolve; }); const held = new Promise(resolve => { release = resolve; });
  h.control.intercept = async (url, init) => { if (url.pathname === '/broadcasts' && init.method === 'POST') { entered(); await held; } };
  const creating = h.create(); await started;
  await assert.rejects(h.create(), error => error.status === 409);
  await h.action('disconnect'); release(); await assert.rejects(creating, error => error.status === 409);
  assert.equal((await h.helper.campaignAccount('user-a')).connected, false); assert.equal(h.storage.get('campaigns:user-a:resend').encrypted, null);
});

test('Ambiguous draft creation is reconciled by durable name without a second POST', async () => {
  const h = harness(); await h.connect(); const requestId = crypto.randomUUID(); const body = { requestId, name: 'Uncertain', subject: 'Hello', text: 'Content' };
  let once = true;
  h.control.intercept = async (url, init, submitted) => {
    if (url.pathname === '/broadcasts' && init.method === 'POST' && once) { once = false; h.broadcasts.set(id(300), { id: id(300), ...submitted, status: 'draft', scheduled_at: null, sent_at: null }); throw Error('Mocked lost response'); }
  };
  await assert.rejects(h.action('create-draft', body), error => error.status === 502);
  const reconciled = await h.action('create-draft', body); assert.equal(reconciled.broadcast.id, id(300)); assert.equal(h.requests.filter(request => request.path === '/broadcasts' && request.method === 'POST').length, 1);
});

test('Ambiguous send keeps unknown state, blocks repeat sends, and refresh reconciles accepted provider state', async () => {
  const h = harness(); await h.connect(); await h.add('subscriber@example.com'); const created = await h.create(); let once = true;
  h.control.intercept = async (url, init) => { if (url.pathname.endsWith('/send') && once) { once = false; throw Error('Mocked unknown outcome'); } };
  await assert.rejects(h.action('send', { broadcastId: created.broadcast.id, confirmSend: true }), error => error.status === 502);
  assert.equal((await h.helper.campaignBroadcasts('user-a')).broadcasts[0].status, 'unknown');
  await assert.rejects(h.action('send', { broadcastId: created.broadcast.id, confirmSend: true }), error => error.status === 409);
  const unresolved = await h.action('refresh', { broadcastId: created.broadcast.id }); assert.equal(unresolved.broadcast.status, 'unknown');
  h.broadcasts.get(created.broadcast.id).status = 'queued';
  const reconciled = await h.action('refresh', { broadcastId: created.broadcast.id }); assert.equal(reconciled.broadcast.status, 'queued'); assert.equal(h.requests.filter(request => request.path.endsWith('/send')).length, 1);
});

test('Foreign-origin writes fail before authentication, database or provider access', async () => {
  let accesses = 0;
  const route = load('app/api/campaigns/route.ts', {
    '../../../lib/api': { researchAccess: async () => { accesses++; return { userId: 'user-a' }; }, parseBody: async request => request.json(), errorResponse: error => Response.json({ error: error.message }, { status: error.status || 500 }) },
    '../../../lib/admin': { json: value => Response.json(value), sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin },
    '../../../lib/etsy': { ApiError }, '../../../lib/email-campaigns': { campaignAction: async () => { accesses++; } },
  });
  const response = await route.POST(new Request('https://scout.example/api/campaigns', { method: 'POST', headers: { origin: 'https://foreign.example' }, body: JSON.stringify({ action: 'send' }) }));
  assert.equal(response.status, 403); assert.equal(accesses, 0);
});
