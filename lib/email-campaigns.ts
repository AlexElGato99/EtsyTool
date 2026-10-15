import 'server-only';
import { db } from './supabase';
import { encryptCredentials, readSetting } from './settings';
import { decryptConnectionValue } from './connections';
import { ApiError } from './etsy';

type Envelope = { revision: string; encrypted: { iv: string; ciphertext: string } | null; lock?: { id: string; expiresAt: number } | null };
type Consent = { id: string; email: string; consentAt: string; removedAt?: string };
export type CampaignBroadcast = { id: string; name: string; subject: string; text: string; status: string; createdAt: string; scheduledAt: string | null; sentAt: string | null };
type BroadcastRef = CampaignBroadcast & { remoteName: string; sendUncertain?: boolean };
type Receipt = { requestId: string; payloadHash: string; action: string; broadcastId?: string; contactId?: string; removed?: true; deleted?: true };
type Pending = Receipt & { attempted: boolean; remoteName?: string; scheduledAt?: string | null };
type RecordValue = {
  ownerId: string; apiKey: string; fromEmail: string; fromName: string; fingerprint: string;
  connectedAt: string; segmentId: string | null; segmentName: string; domainId: string;
  contacts: Consent[]; broadcasts: BroadcastRef[]; receipts: Receipt[]; pending?: Pending;
};
type Contact = { id: string; email: string; firstName: string; lastName: string; unsubscribed: boolean; consentRecorded: boolean };
type Context = { userId: string; envelope: Envelope; record: RecordValue | null; lockId: string; lastRequestAt: number };
const CONTACT_LIMIT = 500;
const BROADCAST_LIMIT = 50;
const LEASE_MS = 90_000;
const keyFor = (userId: string) => `campaigns:${userId}:resend`;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const hash = async (value: string) => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('base64url');
const fingerprint = (record: Pick<RecordValue, 'apiKey' | 'fromEmail' | 'fromName'>) => hash(JSON.stringify([record.apiKey, record.fromEmail, record.fromName]));
const isoNow = () => new Date().toISOString();

function id(value: unknown, label: string) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new ApiError(400, `Choose a valid ${label}.`);
  return value.toLowerCase();
}
function plain(value: unknown, label: string, max: number, required = true, multiline = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()) || /\{\{|\}\}/.test(value) || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/ : /[\u0000-\u001f<>]/).test(value)) throw new ApiError(400, `Enter ${label} up to ${max.toLocaleString('en-US')} characters. Personalization placeholders are not supported.`);
  return value.trim();
}
function email(value: unknown) {
  if (typeof value !== 'string' || value.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(value.trim()) || /\.\.|\{\{|\}\}/.test(value)) throw new ApiError(400, 'Enter a valid email address.');
  const address = value.trim().toLowerCase(); const [local, domain] = address.split('@');
  if (local.startsWith('.') || local.endsWith('.') || domain.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new ApiError(400, 'Enter a valid email address.');
  return address;
}
function credentials(body: Record<string, unknown>) {
  if (typeof body.apiKey !== 'string' || !/^re_[A-Za-z0-9_-]{10,200}$/.test(body.apiKey.trim())) throw new ApiError(400, 'Enter your own Resend full-access API key.');
  return { apiKey: body.apiKey.trim(), fromEmail: email(body.fromEmail), fromName: plain(body.fromName ?? '', 'a sender name', 60, false) };
}
function draft(body: Record<string, unknown>) {
  return { name: plain(body.name, 'a campaign name', 70), subject: plain(body.subject, 'a subject', 150), text: plain(body.text, 'email text', 8000, true, true) };
}
function schedule(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) throw new ApiError(400, 'Choose a valid scheduled time.');
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) throw new ApiError(400, 'Choose a valid scheduled time.');
  return new Date(time).toISOString();
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
export function campaignHtml(text: string) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17212f;max-width:640px;margin:auto"><div style="white-space:pre-wrap">${escapeHtml(text)}</div><hr><p style="font-size:12px;color:#64748b">You receive this email because you opted in to this sender’s updates. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p></div>`;
}
function from(record: RecordValue) { return record.fromName ? `${record.fromName} <${record.fromEmail}>` : record.fromEmail; }
function broadcastBody(record: RecordValue, value: { subject: string; text: string }, remoteName: string, create = false) {
  return { ...(create ? { segment_id: record.segmentId } : {}), from: from(record), name: remoteName, subject: value.subject, html: campaignHtml(value.text), text: value.text + '\n\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}' };
}
function metadata(record: RecordValue | null) {
  return { provider: 'resend' as const, configured: !!record?.segmentId, connected: !!record?.segmentId, fromEmail: record?.fromEmail ?? null, fromName: record?.fromName ?? null, segmentId: record?.segmentId ?? null, segmentName: record?.segmentName ?? null, connectedAt: record?.segmentId ? record.connectedAt : null, contactLimit: CONTACT_LIMIT, broadcastLimit: BROADCAST_LIMIT, connectionPending: !!record && !record.segmentId, pendingAction: record?.pending?.action ?? null, pendingRequestId: record?.pending?.requestId ?? null, pendingBroadcastId: record?.pending?.broadcastId ?? null };
}
function publicBroadcast(ref: BroadcastRef): CampaignBroadcast {
  return { id: ref.id, name: ref.name, subject: ref.subject, text: ref.text, status: ref.sendUncertain ? 'unknown' : ref.status, createdAt: ref.createdAt, scheduledAt: ref.scheduledAt, sentAt: ref.sentAt };
}
async function read(userId: string) {
  const envelope = await readSetting(keyFor(userId)) as Envelope | null;
  const record = envelope?.encrypted ? await decryptConnectionValue<RecordValue>(envelope.encrypted) : null;
  if (record && (record.ownerId !== userId || record.fingerprint !== await fingerprint(record) || !Array.isArray(record.contacts) || !Array.isArray(record.broadcasts) || !Array.isArray(record.receipts))) throw new ApiError(503, 'Your campaign account could not be loaded. Reconnect your own Resend account.');
  return { envelope, record };
}
async function cas(userId: string, expected: string, envelope: Envelope) {
  const rows = await db<{ key: string }[]>('app_settings', { method: 'PATCH', params: { key: 'eq.' + keyFor(userId), 'value->>revision': 'eq.' + expected }, body: { value: envelope }, prefer: 'return=representation' });
  return Array.isArray(rows) && rows.length === 1;
}
async function acquire(userId: string): Promise<Context> {
  await db('app_settings', { method: 'POST', body: { key: keyFor(userId), value: { revision: crypto.randomUUID(), encrypted: null, lock: null } }, prefer: 'resolution=ignore-duplicates,return=minimal' });
  const { envelope, record } = await read(userId);
  if (!envelope?.revision) throw new ApiError(503, 'Campaigns are temporarily unavailable.');
  if (envelope.lock && envelope.lock.expiresAt > Date.now()) throw new ApiError(409, 'Another campaign action is being processed. Wait a moment and try again.');
  const lockId = crypto.randomUUID(); const next = { ...envelope, revision: crypto.randomUUID(), lock: { id: lockId, expiresAt: Date.now() + LEASE_MS } };
  if (!await cas(userId, envelope.revision, next)) throw new ApiError(409, 'Your campaign account changed. Refresh and try again.');
  return { userId, envelope: next, record, lockId, lastRequestAt: 0 };
}
async function save(context: Context, release = false) {
  const current = await read(context.userId);
  if (current.envelope?.revision !== context.envelope.revision || current.envelope.lock?.id !== context.lockId || (current.record && context.record && current.record.fingerprint !== context.record.fingerprint)) throw new ApiError(409, 'Your campaign account changed. Refresh before trying again.');
  const next: Envelope = { revision: crypto.randomUUID(), encrypted: context.record ? await encryptCredentials(context.record) : null, lock: release ? null : { id: context.lockId, expiresAt: Date.now() + LEASE_MS } };
  if (!await cas(context.userId, context.envelope.revision, next)) throw new ApiError(409, 'Your campaign account changed. Refresh before trying again.');
  context.envelope = next;
}
async function releaseDurableLease(context: Context) {
  const current = await read(context.userId);
  if (current.envelope?.lock?.id !== context.lockId) return;
  // Preserve the last durable ciphertext when a receipt write failed; only release our own lease.
  await cas(context.userId, current.envelope.revision, { ...current.envelope, revision: crypto.randomUUID(), lock: null });
}
class ProviderError extends ApiError {
  constructor(status: number, message: string, public readonly uncertain = false, public readonly rejectedMutation = false, public readonly providerStatus = status) { super(status, message); }
}
async function remote(apiKey: string, path: string, method = 'GET', body?: unknown, context?: Context): Promise<Record<string, any> | null> {
  if (!/^\/(?:domains|segments|contacts|broadcasts)(?:\/[^?#/]+){0,3}(?:\?(?:limit=\d+|after=[a-f0-9-]+)(?:&(?:limit=\d+|after=[a-f0-9-]+))?)?$/i.test(path)) throw new ApiError(400, 'Unsupported campaign request.');
  if (context) {
    await save(context);
    const wait = context.lastRequestAt + 550 - Date.now();
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    context.lastRequestAt = Date.now();
  }
  let response: Response;
  try { response = await fetch('https://api.resend.com' + path, { method, headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) }); }
  catch { throw new ProviderError(502, 'Resend could not be reached. Refresh the campaign status before repeating an action.', method !== 'GET'); }
  if (response.status === 404 && method === 'GET') return null;
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new ProviderError(403, 'Resend did not allow this request. Use your own full-access key and check your account permissions.', false, method !== 'GET', response.status);
    if (response.status === 429) throw new ProviderError(429, 'Resend’s request or sending limit was reached. Wait before trying again.', false, method !== 'GET');
    if (response.status >= 500) throw new ProviderError(502, 'Resend could not confirm this action. Refresh its status before trying again.', method !== 'GET');
    throw new ProviderError(400, 'Resend did not accept this action. Check your verified sender, contacts, campaign state, and provider plan.', false, method !== 'GET', response.status);
  }
  if (response.status === 204) return {};
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ProviderError(502, 'Resend returned an incomplete response. Refresh before repeating an action.', method !== 'GET');
  return data;
}
function page(value: Record<string, any> | null) {
  if (!value || !Array.isArray(value.data) || typeof value.has_more !== 'boolean') throw new ApiError(502, 'Resend returned an incomplete list. Try again later.');
  return value;
}
async function findNamed(context: Context, resource: 'segments' | 'broadcasts', name: string) {
  let cursor = ''; let found: Record<string, any> | null = null;
  for (let i = 0; i < 5; i++) {
    const data = page(await remote(context.record!.apiKey, `/${resource}?limit=100${cursor ? '&after=' + cursor : ''}`, 'GET', undefined, context));
    for (const item of data.data) if (item.name === name) { if (found) throw new ApiError(409, 'More than one matching resource exists in Resend. Review it in your Resend account.'); found = item; }
    if (!data.has_more) return found;
    cursor = id(data.data.at(-1)?.id, 'pagination cursor');
  }
  throw new ApiError(409, 'This Resend account has too many resources to reconcile safely. Review the pending action in Resend.');
}
async function verifySender(context: Context, value: ReturnType<typeof credentials>) {
  const domainName = value.fromEmail.split('@')[1]; let cursor = ''; let verifiedDomain: Record<string, any> | undefined;
  for (let i = 0; i < 5; i++) {
    const data = page(await remote(value.apiKey, `/domains?limit=100${cursor ? '&after=' + cursor : ''}`, 'GET', undefined, context));
    verifiedDomain = data.data.find((domain: any) => typeof domain.name === 'string' && domain.name.toLowerCase() === domainName);
    if (verifiedDomain || !data.has_more) break;
    cursor = id(data.data.at(-1)?.id, 'pagination cursor');
  }
  if (!verifiedDomain || verifiedDomain.status !== 'verified' || verifiedDomain.capabilities?.sending === 'disabled') throw new ApiError(400, 'Verify your sender’s exact domain in your own Resend account and enable sending before connecting.');
  // These read endpoints reject sending-only keys without creating or changing resources.
  page(await remote(value.apiKey, '/segments?limit=1', 'GET', undefined, context));
  page(await remote(value.apiKey, '/broadcasts?limit=1', 'GET', undefined, context));
  return id(verifiedDomain.id, 'verified sender domain');
}
function account(context: Context) {
  if (!context.record?.segmentId) throw new ApiError(409, 'Connect your own Resend campaign account first.');
  return context.record;
}
function ownBroadcast(record: RecordValue, value: unknown) {
  const broadcastId = id(value, 'campaign'); const ref = record.broadcasts.find(item => item.id === broadcastId);
  if (!ref) throw new ApiError(404, 'Campaign not found in your podadd account.');
  return ref;
}
async function refreshRef(context: Context, ref: BroadcastRef) {
  const record = account(context); const data = await remote(record.apiKey, '/broadcasts/' + ref.id, 'GET', undefined, context);
  if (!data) { ref.status = 'deleted'; ref.sendUncertain = false; return ref; }
  if (data.segment_id !== record.segmentId || data.from !== from(record)) throw new ApiError(409, 'This campaign’s sender or segment changed in Resend. Review it in Resend before continuing.');
  if (typeof data.status !== 'string') throw new ApiError(502, 'Resend did not return the campaign status.');
  ref.status = data.status.toLowerCase(); ref.scheduledAt = typeof data.scheduled_at === 'string' ? data.scheduled_at : null; ref.sentAt = typeof data.sent_at === 'string' ? data.sent_at : null;
  if (ref.status !== 'draft') ref.sendUncertain = false;
  return ref;
}
function contact(value: Record<string, any>, record: RecordValue): Contact {
  const contactId = id(value.id, 'contact');
  if (typeof value.email !== 'string' || typeof value.unsubscribed !== 'boolean') throw new ApiError(502, 'Resend returned an incomplete contact.');
  return { id: contactId, email: value.email, firstName: typeof value.first_name === 'string' ? value.first_name : '', lastName: typeof value.last_name === 'string' ? value.last_name : '', unsubscribed: value.unsubscribed, consentRecorded: record.contacts.some(item => item.id === contactId && !item.removedAt) };
}
async function segmentContacts(context: Context, after = '', limit = 50) {
  const record = account(context);
  const data = page(await remote(record.apiKey, `/segments/${record.segmentId}/contacts?limit=${limit}${after ? '&after=' + after : ''}`, 'GET', undefined, context));
  return { contacts: data.data.map((item: Record<string, any>) => contact(item, record)), hasMore: data.has_more, nextCursor: data.has_more ? id(data.data.at(-1)?.id, 'pagination cursor') : null };
}
async function members(context: Context) {
  const all: Contact[] = []; let cursor = '';
  for (let i = 0; i < 6; i++) {
    const data = await segmentContacts(context, cursor, 100); all.push(...data.contacts);
    if (all.length > CONTACT_LIMIT) throw new ApiError(409, 'This campaign segment exceeds the 500-contact workspace limit. Review it in Resend.');
    if (!data.hasMore) return all;
    cursor = data.nextCursor!;
  }
  throw new ApiError(409, 'The complete contact list could not be verified. Review the segment in Resend.');
}
function result(context: Context, receipt?: Receipt) {
  const record = context.record;
  const ref = receipt?.broadcastId && record?.broadcasts.find(item => item.id === receipt.broadcastId);
  return { account: metadata(record), ...(ref ? { broadcast: publicBroadcast(ref) } : {}), ...(receipt?.removed ? { removed: true } : {}), ...(receipt?.deleted ? { deleted: true } : {}) };
}
async function finish(context: Context, receipt: Receipt) {
  context.record!.receipts.push(receipt); context.record!.receipts = context.record!.receipts.slice(-100);
  if (context.record!.pending?.requestId === receipt.requestId && context.record!.pending.action === receipt.action) delete context.record!.pending;
  await save(context);
  return result(context, receipt);
}

export async function campaignAccount(userId: string) { return metadata((await read(userId)).record); }
export async function campaignBroadcasts(userId: string) {
  const { record } = await read(userId);
  return { broadcasts: record?.broadcasts.map(publicBroadcast) ?? [], hasMore: false };
}
export async function campaignContacts(userId: string, after?: string) {
  const cursor = after ? id(after, 'pagination cursor') : '';
  // A read lease keeps reconnection/disconnection from mixing credentials and segment IDs.
  const context = await acquire(userId);
  try { return await segmentContacts(context, cursor); } finally { await save(context, true).catch(() => {}); }
}
export async function campaignAction(userId: string, body: Record<string, unknown>) {
  const action = body.action;
  if (typeof action !== 'string' || !['connect', 'disconnect', 'add-contact', 'remove-contact', 'create-draft', 'update-draft', 'refresh', 'send', 'cancel', 'delete-draft'].includes(action)) throw new ApiError(400, 'Choose a valid campaign action.');
  if (action === 'disconnect') {
    // A fresh tombstone wins over an in-flight response; remote contacts and queued sends remain in Resend.
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await read(userId);
      if (!current.envelope) return { account: metadata(null) };
      if (await cas(userId, current.envelope.revision, { revision: crypto.randomUUID(), encrypted: null, lock: null })) return { account: metadata(null) };
    }
    throw new ApiError(409, 'The campaign account changed. Try disconnecting again.');
  }
  const requestId = id(body.requestId, 'request ID');
  // Hash only action fields; connection secrets stay encrypted and never enter responses.
  const normalized: Record<string, unknown> = { action, requestId };
  if (action === 'connect') Object.assign(normalized, credentials(body));
  else if (action === 'add-contact') { if (body.confirmConsent !== true) throw new ApiError(400, 'Confirm that this contact explicitly opted in to your marketing emails.'); Object.assign(normalized, { email: email(body.email), firstName: plain(body.firstName ?? '', 'a first name', 60, false), lastName: plain(body.lastName ?? '', 'a last name', 60, false), confirmConsent: true }); }
  else if (action === 'remove-contact') normalized.contactId = id(body.contactId, 'contact');
  else {
    if (action !== 'create-draft') normalized.broadcastId = id(body.broadcastId, 'campaign');
    if (action === 'create-draft' || action === 'update-draft') Object.assign(normalized, draft(body));
    if (action === 'send') { if (body.confirmSend !== true) throw new ApiError(400, 'Confirm that you want to send this campaign to its opted-in contacts.'); normalized.scheduledAt = schedule(body.scheduledAt); normalized.confirmSend = true; }
    if (action === 'cancel' && body.confirmCancel !== true) throw new ApiError(400, 'Confirm that you want to cancel this campaign.');
    if (action === 'delete-draft' && body.confirmDelete !== true) throw new ApiError(400, 'Confirm that you want to delete this draft.');
  }
  const payloadHash = await hash(JSON.stringify(normalized)); const context = await acquire(userId);
  try {
    const previous = context.record?.receipts.find(item => item.requestId === requestId);
    if (previous) { if (previous.payloadHash !== payloadHash) throw new ApiError(409, 'This request ID was already used for different content. Start a new action.'); return result(context, previous); }
    const pending = context.record?.pending;
    if (pending && pending.requestId === requestId && pending.payloadHash !== payloadHash) throw new ApiError(409, 'Keep the same content when retrying this request.');
    if (pending && pending.requestId !== requestId && action !== 'refresh' && action !== 'cancel') throw new ApiError(409, 'A previous campaign action needs confirmation. Retry it with the same content or refresh its status.');
    if (action === 'connect') {
      const value = credentials(body); const binding = await fingerprint(value);
      if (context.record?.fingerprint && context.record.fingerprint !== binding) throw new ApiError(409, 'Disconnect before connecting a different Resend key or sender.');
      if (context.record?.segmentId) return result(context);
      if (!context.record) {
        const domainId = await verifySender(context, value);
        context.record = { ownerId: userId, ...value, fingerprint: binding, connectedAt: isoNow(), segmentId: null, segmentName: 'podadd ' + crypto.randomUUID(), domainId, contacts: [], broadcasts: [], receipts: [] };
      }
      const record = context.record;
      if (!record.pending) { record.pending = { action, requestId, payloadHash, attempted: false }; await save(context); }
      let segment = record.pending.attempted ? await findNamed(context, 'segments', record.segmentName) : null;
      if (!segment && record.pending.attempted) throw new ApiError(409, 'The segment creation could not be confirmed. Review your Resend account before disconnecting and starting again.');
      if (!segment) { record.pending.attempted = true; await save(context); segment = await remote(record.apiKey, '/segments', 'POST', { name: record.segmentName }, context); }
      record.segmentId = id(segment?.id, 'campaign segment');
      return await finish(context, { action, requestId, payloadHash });
    }
    const record = account(context);
    // Older entries may retain removal markers; only active membership consent counts toward the limit.
    record.contacts = record.contacts.filter(item => !item.removedAt);
    if (action === 'add-contact') {
      const address = normalized.email as string;
      let current = await remote(record.apiKey, '/contacts/' + encodeURIComponent(address), 'GET', undefined, context);
      if (current?.unsubscribed === true) throw new ApiError(409, 'This contact has unsubscribed in Resend. Their opt-out will be preserved.');
      if (!current) {
        if (record.contacts.length >= CONTACT_LIMIT) throw new ApiError(409, 'The workspace stores consent for up to 500 contacts.');
        // Omit unsubscribed: never explicitly reset the global suppression flag, including on duplicate creation.
        try {
          const created = await remote(record.apiKey, '/contacts', 'POST', { email: address, first_name: normalized.firstName, last_name: normalized.lastName }, context);
          const contactId = id(created?.id, 'contact'); current = await remote(record.apiKey, '/contacts/' + contactId, 'GET', undefined, context);
        } catch (error) {
          if (!(error instanceof ProviderError) || error.providerStatus !== 409) throw error;
          current = await remote(record.apiKey, '/contacts/' + encodeURIComponent(address), 'GET', undefined, context);
        }
      }
      if (!current || current.unsubscribed !== false) throw new ApiError(409, 'This contact’s subscription could not be verified. Their opt-out will be preserved.');
      const contactId = id(current.id, 'contact'); const existing = record.contacts.find(item => item.id === contactId);
      if (!existing && record.contacts.length >= CONTACT_LIMIT) throw new ApiError(409, 'The workspace stores consent for up to 500 contacts.');
      const segmentMembers = await members(context);
      if (!segmentMembers.some(item => item.id === contactId) && segmentMembers.length >= CONTACT_LIMIT) throw new ApiError(409, 'This segment has reached the 500-contact workspace limit.');
      if (existing) { existing.email = address; existing.consentAt = isoNow(); delete existing.removedAt; }
      else record.contacts.push({ id: contactId, email: address, consentAt: isoNow() });
      await save(context);
      if (!segmentMembers.some(item => item.id === contactId)) await remote(record.apiKey, `/contacts/${contactId}/segments/${record.segmentId}`, 'POST', {}, context);
      const response = await finish(context, { action, requestId, payloadHash, contactId });
      return { ...response, contact: contact(current, record) };
    }
    if (action === 'remove-contact') {
      const contactId = normalized.contactId as string; const consent = record.contacts.find(item => item.id === contactId);
      const segmentMembers = await members(context);
      if (!segmentMembers.some(item => item.id === contactId)) {
        if (!consent) throw new ApiError(404, 'Contact not found in your campaign segment.');
      } else await remote(record.apiKey, `/contacts/${contactId}/segments/${record.segmentId}`, 'DELETE', undefined, context);
      record.contacts = record.contacts.filter(item => item.id !== contactId);
      return await finish(context, { action, requestId, payloadHash, contactId, removed: true });
    }
    if (action === 'create-draft') {
      if (record.broadcasts.length >= BROADCAST_LIMIT) throw new ApiError(409, 'The workspace stores up to 50 campaigns. Delete an unused draft before creating another.');
      const value = draft(body);
      if (!record.pending) { record.pending = { action, requestId, payloadHash, attempted: false, remoteName: `${value.name.slice(0, 26)} ${requestId}` }; await save(context); }
      const intent = record.pending;
      let created = intent.attempted ? await findNamed(context, 'broadcasts', intent.remoteName!) : null;
      if (!created && intent.attempted) throw new ApiError(409, 'Draft creation could not be confirmed. Review your Resend account before starting another draft.');
      if (!created) { intent.attempted = true; await save(context); created = await remote(record.apiKey, '/broadcasts', 'POST', broadcastBody(record, value, intent.remoteName!, true), context); }
      const broadcastId = id(created?.id, 'campaign');
      const ref: BroadcastRef = { id: broadcastId, ...value, remoteName: intent.remoteName!, status: 'draft', createdAt: isoNow(), scheduledAt: null, sentAt: null };
      await refreshRef(context, ref); record.broadcasts.unshift(ref);
      return await finish(context, { action, requestId, payloadHash, broadcastId });
    }
    const ref = ownBroadcast(record, normalized.broadcastId);
    await refreshRef(context, ref);
    if (action === 'refresh') {
      if (record.pending?.broadcastId === ref.id && ref.status !== 'draft') delete record.pending;
      await save(context);
      return result(context, { action, requestId, payloadHash, broadcastId: ref.id });
    }
    if (action === 'update-draft') {
      if (ref.status !== 'draft' || ref.sendUncertain) throw new ApiError(409, 'Only a confirmed unsent draft can be edited.');
      const value = draft(body); await remote(record.apiKey, '/broadcasts/' + ref.id, 'PATCH', broadcastBody(record, value, ref.remoteName), context);
      Object.assign(ref, value); return await finish(context, { action, requestId, payloadHash, broadcastId: ref.id });
    }
    if (action === 'delete-draft') {
      if (ref.status === 'deleted') {
        record.broadcasts = record.broadcasts.filter(item => item.id !== ref.id);
        return await finish(context, { action, requestId, payloadHash, deleted: true });
      }
      if (ref.status !== 'draft' || ref.sendUncertain) throw new ApiError(409, 'Only a confirmed unsent draft can be deleted.');
      await remote(record.apiKey, '/broadcasts/' + ref.id, 'DELETE', undefined, context);
      record.broadcasts = record.broadcasts.filter(item => item.id !== ref.id);
      return await finish(context, { action, requestId, payloadHash, deleted: true });
    }
    if (action === 'cancel') {
      if (!['scheduled', 'queued'].includes(ref.status)) throw new ApiError(409, 'Only a scheduled or queued campaign can be canceled. Already sent messages cannot be recalled.');
      await remote(record.apiKey, '/broadcasts/' + ref.id + '/cancel', 'POST', {}, context);
      await refreshRef(context, ref);
      if (record.pending?.broadcastId === ref.id) delete record.pending;
      return await finish(context, { action, requestId, payloadHash, broadcastId: ref.id });
    }
    if (ref.status !== 'draft' || ref.sendUncertain || record.pending?.attempted) throw new ApiError(409, 'This campaign was already submitted or needs status confirmation. Refresh it instead of sending again.');
    if (normalized.scheduledAt) {
      const scheduledTime = new Date(normalized.scheduledAt as string).getTime();
      if (scheduledTime < Date.now() + 5 * 60_000 || scheduledTime > Date.now() + 30 * 86400_000) throw new ApiError(400, 'Schedule campaigns between five minutes and 30 days from now.');
    }
    const recipients = await members(context);
    const subscribed = recipients.filter(item => !item.unsubscribed);
    if (!subscribed.length) throw new ApiError(409, 'Add at least one opted-in, subscribed contact before sending.');
    if (subscribed.some(item => !item.consentRecorded)) throw new ApiError(409, 'Every subscribed member of this segment must have consent recorded in podadd. Confirm consent for each contact before sending.');
    const domain = await remote(record.apiKey, '/domains/' + record.domainId, 'GET', undefined, context);
    if (!domain || domain.status !== 'verified' || domain.capabilities?.sending === 'disabled') throw new ApiError(409, 'Your Resend sender domain is not verified for sending.');
    // The segment is immutable and checked by refreshRef; PATCH supports sender/content fields, not segment_id.
    await remote(record.apiKey, '/broadcasts/' + ref.id, 'PATCH', broadcastBody(record, ref, ref.remoteName), context);
    record.pending = { action, requestId, payloadHash, attempted: true, broadcastId: ref.id, scheduledAt: normalized.scheduledAt as string | null };
    ref.sendUncertain = true; await save(context);
    await remote(record.apiKey, '/broadcasts/' + ref.id + '/send', 'POST', normalized.scheduledAt ? { scheduled_at: normalized.scheduledAt } : {}, context);
    // Provider acceptance does not guarantee delivery. Retain its actual state, not fabricated analytics.
    await refreshRef(context, ref);
    return await finish(context, { action, requestId, payloadHash, broadcastId: ref.id });
  } catch (error) {
    if (error instanceof ProviderError && !error.uncertain && error.rejectedMutation && context.record?.pending?.requestId === requestId && context.record.pending.action === action) {
      const pending = context.record.pending;
      if (pending.broadcastId) { const ref = context.record.broadcasts.find(item => item.id === pending.broadcastId); if (ref) ref.sendUncertain = false; }
      delete context.record.pending;
    }
    throw error;
  } finally {
    await save(context, true).catch(() => releaseDurableLease(context).catch(() => {}));
  }
}
