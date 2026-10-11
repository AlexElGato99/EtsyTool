import 'server-only';
import { cookies } from 'next/headers';
import { db, authFetch } from './supabase';
import { encryptCredentials, decryptCredentials, readSetting, writeSetting } from './settings';
import { ApiError } from './etsy';
import { listingIdFrom, positiveId } from './search-options';

export type ConnectionProvider = 'etsy' | 'pinterest' | 'email';
export type ProviderCredentials = {
  pinterest?: { appId: string; appSecret: string };
  email?: { provider: 'resend' | 'brevo'; apiKey: string; fromEmail: string; fromName?: string };
};
export type ConnectionStatus = {
  provider: ConnectionProvider; configured: boolean; connected: boolean;
  label: string | null; connectedAt: string | null; permissions: string[];
};
type EncryptedValue = { iv: string; ciphertext: string };
type StoredConnection = { id: string; encrypted: EncryptedValue | null };
type TokenRecord = {
  provider: ConnectionProvider; accessToken?: string; refreshToken?: string;
  expiresAt?: number; refreshExpiresAt?: number; scopes: string[];
  externalUserId?: string; label: string; connectedAt: string;
  credentialFingerprint?: string;
};
type OAuthState = {
  provider: 'etsy' | 'pinterest'; userId: string; state: string; verifier?: string;
  expiresAt: number; redirectUri: string; clientId: string; connectionRevision: string; credentialFingerprint: string;
};
type Money = { amount: number; currency: string };
const scopes = {
  etsy: ['shops_r', 'listings_r', 'transactions_r'],
  pinterest: ['user_accounts:read', 'boards:read', 'boards:write', 'pins:read', 'pins:write'],
};
const keyFor = (userId: string, provider: ConnectionProvider) => `connections:${userId}:${provider}`;
const oauthKey = (userId: string, provider: ConnectionProvider) => `${keyFor(userId, provider)}:oauth`;
const cookieName = (provider: ConnectionProvider) => `scout_oauth_${provider}`;
const random = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const hash = async (value: string) => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('base64url');
const titleFor = (provider: ConnectionProvider) => provider === 'etsy' ? 'Etsy' : provider === 'pinterest' ? 'Pinterest' : 'Email';

export function connectionProvider(value: string): ConnectionProvider {
  if (!['etsy', 'pinterest', 'email'].includes(value)) throw new ApiError(404, 'Connection not found.');
  return value as ConnectionProvider;
}

// Generic decryption deliberately shares the established encrypted settings format.
export async function decryptConnectionValue<T = ProviderCredentials>(value: unknown): Promise<T> {
  try {
    const envelope = value as EncryptedValue;
    if (!envelope || typeof envelope.iv !== 'string' || typeof envelope.ciphertext !== 'string') throw Error();
    const bytes = Uint8Array.from(Buffer.from(process.env.SETTINGS_ENCRYPTION_KEY || '', 'base64'));
    const iv = Uint8Array.from(Buffer.from(envelope.iv, 'base64'));
    if (bytes.length !== 32 || iv.length !== 12) throw Error();
    const key = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, Uint8Array.from(Buffer.from(envelope.ciphertext, 'base64')));
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch { throw new ApiError(503, 'Connections are temporarily unavailable. Please try again later.'); }
}

export async function providerCredentials(): Promise<ProviderCredentials> {
  const value = await readSetting('provider_credentials');
  return value ? decryptConnectionValue<ProviderCredentials>(value) : {};
}
async function etsyCredentials() {
  try {
    const value = await decryptCredentials();
    if (value?.key && value.secret) return value;
  } catch { /* Keep server configuration details out of account-facing errors. */ }
  throw new ApiError(503, 'Etsy connection is not available yet. Please try again later.');
}
async function oauthCredentials(provider: 'etsy' | 'pinterest') {
  if (provider === 'etsy') { const value = await etsyCredentials(); return { id: value.key, secret: value.secret }; }
  const value = (await providerCredentials()).pinterest;
  if (!value?.appId || !value.appSecret) throw new ApiError(503, 'Pinterest connection is not available yet. Please try again later.');
  return { id: value.appId, secret: value.appSecret };
}
async function credentialFingerprint(provider: ConnectionProvider): Promise<string | null> {
  if (provider === 'etsy') {
    if (!await readSetting('etsy_credentials')) return null;
    const credentials = await etsyCredentials(); return hash(JSON.stringify([provider, credentials.key, credentials.secret]));
  }
  const credentials = await providerCredentials();
  if (provider === 'pinterest') return credentials.pinterest?.appId && credentials.pinterest.appSecret ? hash(JSON.stringify([provider, credentials.pinterest.appId, credentials.pinterest.appSecret])) : null;
  return credentials.email?.provider === 'resend' && credentials.email.apiKey && credentials.email.fromEmail ? hash(JSON.stringify([provider, credentials.email.provider, credentials.email.apiKey, credentials.email.fromEmail, credentials.email.fromName || ''])) : null;
}
async function storedConnection(userId: string, provider: ConnectionProvider): Promise<StoredConnection | null> {
  const value = await readSetting(keyFor(userId, provider));
  return value && typeof value.id === 'string' && 'encrypted' in value ? value as StoredConnection : null;
}
async function tokenRecord(userId: string, provider: ConnectionProvider) {
  const stored = await storedConnection(userId, provider);
  const record = stored?.encrypted ? await decryptConnectionValue<TokenRecord>(stored.encrypted) : null;
  if (record && record.provider !== provider) throw new ApiError(503, 'This connection could not be loaded. Please reconnect.');
  return { stored, record };
}
async function replaceConnection(userId: string, provider: ConnectionProvider, expectedId: string, record: TokenRecord): Promise<boolean> {
  const value: StoredConnection = { id: crypto.randomUUID(), encrypted: await encryptCredentials(record) };
  const updated = await db<{ key: string }[]>('app_settings', {
    method: 'PATCH', params: { key: 'eq.' + keyFor(userId, provider), 'value->>id': 'eq.' + expectedId },
    body: { value }, prefer: 'return=representation',
  });
  return Array.isArray(updated) && updated.length === 1;
}

export async function connectionStatus(userId: string, provider: ConnectionProvider): Promise<ConnectionStatus> {
  const { record } = await tokenRecord(userId, provider);
  const fingerprint = await credentialFingerprint(provider);
  const connected = !!record && !!fingerprint && record.credentialFingerprint === fingerprint;
  return { provider, configured: !!fingerprint, connected, label: connected ? record!.label : null, connectedAt: connected ? record!.connectedAt : null, permissions: connected ? record!.scopes : [] };
}

export async function beginConnection(userId: string, provider: ConnectionProvider, origin: string, email: string) {
  if (provider === 'email') {
    const status = await connectionStatus(userId, provider);
    if (!status.configured) throw new ApiError(503, 'Email testing is not available yet. Please try again later.');
    await writeSetting(keyFor(userId, provider), { id: crypto.randomUUID(), encrypted: await encryptCredentials({ provider, scopes: ['email:test'], label: email, connectedAt: new Date().toISOString(), credentialFingerprint: (await credentialFingerprint(provider))! } satisfies TokenRecord) });
    return { connected: true };
  }
  const originUrl = new URL(origin);
  const isLocal = ['localhost', '127.0.0.1'].includes(originUrl.hostname);
  if (originUrl.protocol !== 'https:' && !(provider === 'pinterest' && isLocal && process.env.NODE_ENV !== 'production')) {
    throw new ApiError(400, `${titleFor(provider)} requires a secure website address. Connect from the live website.`);
  }
  const credentials = await oauthCredentials(provider);
  // A tombstone revision makes disconnects win over delayed OAuth callbacks and refreshes.
  await db('app_settings', { method: 'POST', body: { key: keyFor(userId, provider), value: { id: crypto.randomUUID(), encrypted: null } }, prefer: 'resolution=ignore-duplicates,return=minimal' });
  const stored = await storedConnection(userId, provider);
  if (!stored) throw new ApiError(503, 'The connection could not be started. Please retry.');
  const verifier = provider === 'etsy' ? random() : undefined;
  const state: OAuthState = { provider, userId, state: random(), verifier, expiresAt: Date.now() + 600_000, redirectUri: `${origin}/api/connections/${provider}/callback`, clientId: credentials.id, connectionRevision: stored.id, credentialFingerprint: (await credentialFingerprint(provider))! };
  await writeSetting(oauthKey(userId, provider), { stateHash: await hash(state.state), expiresAt: state.expiresAt });
  const envelope = await encryptCredentials(state);
  (await cookies()).set(cookieName(provider), Buffer.from(JSON.stringify(envelope)).toString('base64url'), { httpOnly: true, secure: originUrl.protocol === 'https:', sameSite: 'lax', path: `/api/connections/${provider}`, maxAge: 600 });
  const url = new URL(provider === 'etsy' ? 'https://www.etsy.com/oauth/connect' : 'https://www.pinterest.com/oauth/');
  url.searchParams.set('client_id', credentials.id); url.searchParams.set('redirect_uri', state.redirectUri);
  url.searchParams.set('response_type', 'code'); url.searchParams.set('scope', scopes[provider].join(' ')); url.searchParams.set('state', state.state);
  if (verifier) { url.searchParams.set('code_challenge', await hash(verifier)); url.searchParams.set('code_challenge_method', 'S256'); }
  return { url: url.toString() };
}

async function remoteJson(url: string, init: RequestInit, provider: ConnectionProvider) {
  let response: Response;
  try { response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15_000), redirect: 'error' }); }
  catch { throw new ApiError(502, `${titleFor(provider)} could not be reached. Please try again later.`); }
  if (response.status === 429) throw new ApiError(429, `${titleFor(provider)} is busy right now. Wait a minute and try again.`);
  if (response.status === 401) throw new ApiError(401, `Reconnect your ${titleFor(provider)} account, then try again.`);
  if (response.status === 403) throw new ApiError(403, `${titleFor(provider)} did not allow this action. Check your account permissions and try again.`);
  if (response.status === 404) throw new ApiError(404, `${titleFor(provider)} could not find this item.`);
  if (!response.ok) throw new ApiError(502, `${titleFor(provider)} could not complete the request. Please try again later.`);
  const value = await response.json().catch(() => null);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(502, `${titleFor(provider)} returned an invalid response. Please retry.`);
  return value as Record<string, any>;
}
async function exchangeToken(provider: 'etsy' | 'pinterest', params: Record<string, string>) {
  const credentials = await oauthCredentials(provider);
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const body = new URLSearchParams(params);
  if (provider === 'etsy') body.set('client_id', credentials.id);
  else {
    headers.Authorization = 'Basic ' + Buffer.from(credentials.id + ':' + credentials.secret).toString('base64');
    if (params.grant_type === 'authorization_code') body.set('continuous_refresh', 'true');
  }
  return remoteJson(provider === 'etsy' ? 'https://api.etsy.com/v3/public/oauth/token' : 'https://api.pinterest.com/v5/oauth/token', { method: 'POST', headers, body: body.toString() }, provider);
}
function validatedToken(provider: 'etsy' | 'pinterest', data: Record<string, any>, previous?: TokenRecord): TokenRecord {
  if (typeof data.access_token !== 'string' || !data.access_token || data.access_token.length > 8192 || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new ApiError(502, 'The account authorization could not be completed. Please reconnect.');
  const granted = typeof data.scope === 'string' ? data.scope.split(/[ ,]+/).filter(Boolean) : previous?.scopes || [];
  if (!scopes[provider].every(scope => granted.includes(scope))) throw new ApiError(403, `Approve the requested ${titleFor(provider)} permissions to use this connection.`);
  const refreshToken = typeof data.refresh_token === 'string' && data.refresh_token.length <= 8192 ? data.refresh_token : previous?.refreshToken;
  const externalUserId = provider === 'etsy' ? data.access_token.match(/^(\d+)\./)?.[1] : previous?.externalUserId;
  if (provider === 'etsy' && !externalUserId) throw new ApiError(502, 'Etsy returned an invalid account authorization. Please reconnect.');
  return { ...previous, provider, accessToken: data.access_token, refreshToken, scopes: granted, externalUserId, expiresAt: Date.now() + data.expires_in * 1000,
    refreshExpiresAt: Number.isFinite(data.refresh_token_expires_at) ? data.refresh_token_expires_at * 1000 : Number.isFinite(data.refresh_token_expires_in) ? Date.now() + data.refresh_token_expires_in * 1000 : previous?.refreshExpiresAt,
    connectedAt: previous?.connectedAt || new Date().toISOString(), label: previous?.label || `${titleFor(provider)} account` };
}
async function etsyWithRecord(record: TokenRecord, path: string, params: Record<string, string> = {}) {
  if (!/^(?:users\/\d+\/shops|shops\/\d+\/receipts(?:\/\d+\/payments)?|listings\/\d+)$/.test(path)) throw new ApiError(400, 'Unsupported shop request.');
  const credentials = await etsyCredentials(); const url = new URL('https://openapi.etsy.com/v3/application/' + path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return remoteJson(url.toString(), { headers: { Authorization: 'Bearer ' + record.accessToken, 'x-api-key': credentials.key + ':' + credentials.secret } }, 'etsy');
}
async function pinterestWithRecord(record: TokenRecord, path: string, method = 'GET', body?: unknown) {
  if (!['boards', 'pins', 'user_account'].includes(path)) throw new ApiError(400, 'Unsupported Pinterest request.');
  return remoteJson('https://api.pinterest.com/v5/' + path + (path === 'boards' ? '?page_size=100&privacy=PUBLIC' : ''), {
    method, headers: { Authorization: 'Bearer ' + record.accessToken, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, 'pinterest');
}

export async function finishConnection(userId: string, provider: 'etsy' | 'pinterest', callbackUrl: string): Promise<'connected' | 'cancelled'> {
  const jar = await cookies(); const cookie = jar.get(cookieName(provider))?.value;
  jar.set(cookieName(provider), '', { httpOnly: true, secure: new URL(callbackUrl).protocol === 'https:', sameSite: 'lax', path: `/api/connections/${provider}`, maxAge: 0 });
  const url = new URL(callbackUrl); let state: OAuthState;
  try {
    if (!cookie || cookie.length > 8000) throw Error();
    state = await decryptConnectionValue<OAuthState>(JSON.parse(Buffer.from(cookie, 'base64url').toString('utf8')));
    if (state.provider !== provider || state.userId !== userId || state.expiresAt <= Date.now() || state.redirectUri !== `${url.origin}/api/connections/${provider}/callback` || !state.state || url.searchParams.get('state') !== state.state) throw Error();
  } catch { throw new ApiError(400, 'This connection link expired or could not be verified. Start the connection again.'); }
  const consumed = await db<{ key: string }[]>('app_settings', { method: 'DELETE', params: { key: 'eq.' + oauthKey(userId, provider), 'value->>stateHash': 'eq.' + await hash(state.state) }, prefer: 'return=representation' });
  if (!Array.isArray(consumed) || consumed.length !== 1) throw new ApiError(400, 'This connection link was already used. Start the connection again.');
  if (url.searchParams.has('error')) return 'cancelled';
  const code = url.searchParams.get('code');
  if (!code || code.length > 4096) throw new ApiError(400, 'The account authorization was not completed. Please reconnect.');
  if ((await oauthCredentials(provider)).id !== state.clientId || await credentialFingerprint(provider) !== state.credentialFingerprint) throw new ApiError(400, 'The connection changed. Start the connection again.');
  const data = await exchangeToken(provider, { grant_type: 'authorization_code', code, redirect_uri: state.redirectUri, ...(state.verifier ? { code_verifier: state.verifier } : {}) });
  const record = validatedToken(provider, data);
  record.credentialFingerprint = state.credentialFingerprint;
  try {
    const profile = provider === 'etsy' ? await etsyWithRecord(record, `users/${record.externalUserId}/shops`) : await pinterestWithRecord(record, 'user_account');
    record.label = String(provider === 'etsy' ? profile.shop_name || 'Etsy account' : profile.username || 'Pinterest account').slice(0, 100);
  } catch { /* Authorization remains valid for an account without an Etsy shop. */ }
  if (await credentialFingerprint(provider) !== state.credentialFingerprint || !await replaceConnection(userId, provider, state.connectionRevision, record)) throw new ApiError(409, 'The connection changed. Start the connection again.');
  return 'connected';
}

export async function disconnectConnection(userId: string, provider: ConnectionProvider) {
  await writeSetting(keyFor(userId, provider), { id: crypto.randomUUID(), encrypted: null });
  await writeSetting(oauthKey(userId, provider), null);
  (await cookies()).set(cookieName(provider), '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: `/api/connections/${provider}`, maxAge: 0 });
}
export async function activeConnection(userId: string, provider: 'etsy' | 'pinterest'): Promise<TokenRecord> {
  const { stored, record } = await tokenRecord(userId, provider);
  if (!stored || !record?.accessToken) throw new ApiError(409, `Connect your ${titleFor(provider)} account first.`);
  if (record.credentialFingerprint !== await credentialFingerprint(provider)) throw new ApiError(409, `The ${titleFor(provider)} connection changed. Reconnect your account to continue.`);
  if ((record.expiresAt || 0) > Date.now() + 60_000) return record;
  if (!record.refreshToken || (record.refreshExpiresAt && record.refreshExpiresAt <= Date.now())) throw new ApiError(401, `Reconnect your ${titleFor(provider)} account, then try again.`);
  const refreshed = validatedToken(provider, await exchangeToken(provider, { grant_type: 'refresh_token', refresh_token: record.refreshToken }), record);
  if (record.credentialFingerprint !== await credentialFingerprint(provider)) throw new ApiError(409, `The ${titleFor(provider)} connection changed. Reconnect your account to continue.`);
  if (await replaceConnection(userId, provider, stored.id, refreshed)) return refreshed;
  const current = (await tokenRecord(userId, provider)).record;
  if (!current?.accessToken || (current.expiresAt || 0) <= Date.now() || current.credentialFingerprint !== await credentialFingerprint(provider) || !scopes[provider].every(scope => current.scopes.includes(scope))) throw new ApiError(409, 'Your connection changed. Refresh this page and try again.');
  return current;
}

export function normalizeMoney(value: unknown): Money | null {
  const money = value as { amount?: unknown; divisor?: unknown; currency_code?: unknown };
  if (!money || !Number.isFinite(money.amount) || !Number.isFinite(money.divisor) || Number(money.divisor) <= 0 || typeof money.currency_code !== 'string' || !/^[A-Z]{3}$/.test(money.currency_code)) return null;
  return { amount: Number(money.amount) / Number(money.divisor), currency: money.currency_code };
}
export function normalizeProcessingFee(payment: Record<string, any>): Money | null {
  const value = payment?.adjusted_fees ?? payment?.amount_fees;
  const money = normalizeMoney(value);
  if (money) return money;
  // The current schema specifies Money; older payment responses use integer pennies.
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    const currency = typeof payment.currency === 'string' && /^[A-Z]{3}$/.test(payment.currency) ? payment.currency : 'USD';
    return { amount: value / 100, currency };
  }
  return null;
}
function safeCount(value: unknown): number | null { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null; }
function aggregateMoney(values: (Money | null)[]) {
  const totals = new Map<string, number>(); for (const money of values) if (money) totals.set(money.currency, (totals.get(money.currency) || 0) + money.amount);
  return [...totals].map(([currency, amount]) => ({ currency, amount: Number(amount.toFixed(8)) }));
}
export async function connectedShop(userId: string) {
  const record = await activeConnection(userId, 'etsy');
  const shop = await etsyWithRecord(record, `users/${record.externalUserId}/shops`);
  const shopId = positiveId(String(shop.shop_id), 'shop ID');
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const data = await etsyWithRecord(record, `shops/${shopId}/receipts`, { min_created: String(since), limit: '100', sort_on: 'created', sort_order: 'down' });
  const receipts: Record<string, any>[] = Array.isArray(data.results) ? data.results.slice(0, 100) : [];
  const orders = await Promise.all(receipts.slice(0, 5).map(async receipt => {
    const id = positiveId(String(receipt.receipt_id), 'order ID'); let processingFee: Money | null = null;
    try {
      const payment = await etsyWithRecord(record, `shops/${shopId}/receipts/${id}/payments`);
      const item = Array.isArray(payment.results) ? payment.results[0] : payment;
      processingFee = normalizeProcessingFee(item);
    } catch { /* A receipt may not have an Etsy Payments record. */ }
    const timestamp = Number(receipt.created_timestamp ?? receipt.create_timestamp);
    return { id, status: typeof receipt.status === 'string' ? receipt.status.slice(0, 40) : 'Unknown', paid: receipt.is_paid === true, shipped: receipt.is_shipped === true,
      createdAt: Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000).toISOString() : null, total: normalizeMoney(receipt.grandtotal), processingFee };
  }));
  const paid = receipts.filter(receipt => receipt.is_paid === true && !['canceled', 'cancelled'].includes(String(receipt.status).toLowerCase()));
  return { shop: { id: shopId, name: String(shop.shop_name || 'Your Etsy shop').slice(0, 100), url: 'https://www.etsy.com/shop/' + encodeURIComponent(String(shop.shop_name || '')), activeListings: safeCount(shop.listing_active_count), totalTransactions: safeCount(shop.transaction_sold_count), currency: typeof shop.currency_code === 'string' ? shop.currency_code : null },
    periodDays: 30, capturedAt: new Date().toISOString(), matchingOrders: safeCount(data.count), loadedOrders: receipts.length,
    hasMore: typeof data.count === 'number' && data.count > receipts.length, paidOrders: paid.length, awaitingShipment: paid.filter(receipt => !receipt.is_shipped).length,
    paidOrderTotals: aggregateMoney(paid.map(receipt => normalizeMoney(receipt.grandtotal))), orders,
    note: 'Totals cover the returned paid, non-cancelled orders, include shipping and tax, and may include refunded amounts. They are not profit or payout amounts. Processing fees cover only the displayed payment records; other Etsy fees are not included.' };
}

export async function pinterestBoards(userId: string) {
  const data = await pinterestWithRecord(await activeConnection(userId, 'pinterest'), 'boards');
  return { boards: (Array.isArray(data.items) ? data.items : []).filter((item: any) => /^\d+$/.test(String(item.id)) && typeof item.name === 'string').map((item: any) => ({ id: String(item.id), name: item.name.slice(0, 100) })), hasMore: !!data.bookmark };
}
export async function connectedListing(userId: string, link: string) {
  if (link.length > 2048) throw new ApiError(400, 'Enter your Etsy listing link.');
  const listingId = listingIdFrom(link); const record = await activeConnection(userId, 'etsy');
  const [shop, listing] = await Promise.all([etsyWithRecord(record, `users/${record.externalUserId}/shops`), etsyWithRecord(record, `listings/${listingId}`, { includes: 'Images' })]);
  if (String(shop.shop_id) !== String(listing.shop_id)) throw new ApiError(403, 'Choose a listing from your connected Etsy shop.');
  const images = listing.images || listing.Images || [];
  const imageUrls: string[] = [];
  if (Array.isArray(images)) for (const image of images) {
    const value = image?.url_fullxfull || image?.url_570xN;
    if (typeof value !== 'string') continue;
    try { const url = new URL(value); if (url.protocol === 'https:' && url.hostname === 'i.etsystatic.com' && !url.port && !url.username && !url.password && !url.hash && url.href.length <= 2048) imageUrls.push(url.href); } catch {}
  }
  return { id: listingId, url: 'https://www.etsy.com/listing/' + listingId, title: typeof listing.title === 'string' ? listing.title.slice(0, 100) : '', description: typeof listing.description === 'string' ? listing.description.slice(0, 800) : '', imageUrls: [...new Set(imageUrls)].slice(0, 20) };
}
export function validatePin(value: Record<string, unknown>) {
  const boardId = positiveId(String(value.boardId || ''), 'Pinterest board ID');
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.trim().length > 100) throw new ApiError(400, 'Enter a pin title between 1 and 100 characters.');
  if (typeof value.description !== 'string' || value.description.length > 800 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value.description)) throw new ApiError(400, 'Enter a pin description up to 800 characters.');
  if (typeof value.link !== 'string' || value.link.length > 2048) throw new ApiError(400, 'Enter your Etsy listing link.');
  const listingId = listingIdFrom(value.link);
  let image: URL; let link: URL;
  try { image = new URL(String(value.imageUrl)); link = new URL(value.link); } catch { throw new ApiError(400, 'Use a valid Etsy listing and Etsy image link.'); }
  if (link.protocol !== 'https:' || image.protocol !== 'https:' || image.hostname !== 'i.etsystatic.com' || image.port || image.username || image.password || image.hash || image.href.length > 2048) throw new ApiError(400, 'Use an HTTPS Etsy listing link and an image hosted by Etsy.');
  if (value.confirmPublish !== true) throw new ApiError(400, 'Confirm that you want to publish this pin.');
  return { boardId, listingId, title: value.title.trim(), description: value.description.trim(), link: 'https://www.etsy.com/listing/' + listingId, imageUrl: image.href };
}
export async function publishPinterest(userId: string, value: Record<string, unknown>) {
  const pin = validatePin(value);
  const etsyRecord = await activeConnection(userId, 'etsy');
  const [shop, listing] = await Promise.all([etsyWithRecord(etsyRecord, `users/${etsyRecord.externalUserId}/shops`), etsyWithRecord(etsyRecord, `listings/${pin.listingId}`, { includes: 'Images' })]);
  if (String(listing.shop_id) !== String(shop.shop_id)) throw new ApiError(403, 'Publish a listing from your connected Etsy shop.');
  const images = listing.images || listing.Images || [];
  const knownImage = Array.isArray(images) && images.some((image: any) => ['url_fullxfull', 'url_570xN', 'url_300x300', 'url_75x75'].some(key => image[key] === pin.imageUrl));
  if (!knownImage) throw new ApiError(400, 'Use an image from this Etsy listing.');
  const data = await pinterestWithRecord(await activeConnection(userId, 'pinterest'), 'pins', 'POST', { board_id: pin.boardId, title: pin.title, description: pin.description, link: pin.link, media_source: { source_type: 'image_url', url: pin.imageUrl } });
  if (!/^\d+$/.test(String(data.id))) throw new ApiError(502, 'The pin request could not be confirmed. Check Pinterest before retrying.');
  return { published: true, id: String(data.id), url: `https://www.pinterest.com/pin/${data.id}/` };
}

async function claimEmailQuota(userId: string) {
  const key = keyFor(userId, 'email') + ':usage'; const now = Date.now(); const day = new Date(now).toISOString().slice(0, 10);
  await db('app_settings', { method: 'POST', body: { key, value: { revision: crypto.randomUUID(), day, count: 0, sentAt: 0 } }, prefer: 'resolution=ignore-duplicates,return=minimal' });
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readSetting(key);
    if (!current || typeof current.revision !== 'string') throw new ApiError(503, 'Email testing is temporarily unavailable.');
    const count = current.day === day ? Number(current.count) || 0 : 0;
    if (now - Number(current.sentAt) < 60_000 || count >= 10) throw new ApiError(429, count >= 10 ? 'You can send up to ten email tests per day. Try again tomorrow.' : 'Wait one minute before sending another email test.');
    const updated = await db<{ key: string }[]>('app_settings', { method: 'PATCH', params: { key: 'eq.' + key, 'value->>revision': 'eq.' + current.revision }, body: { value: { revision: crypto.randomUUID(), day, count: count + 1, sentAt: now } }, prefer: 'return=representation' });
    if (Array.isArray(updated) && updated.length === 1) return;
  }
  throw new ApiError(429, 'Another email test is being processed. Please wait and try again.');
}
export async function sendEmailTest(user: { userId: string; email: string }, body: Record<string, unknown>) {
  if (body.confirmSend !== true) throw new ApiError(400, 'Confirm that you want to send a test email to yourself.');
  if (body.to !== undefined && body.to !== user.email) throw new ApiError(400, 'Email tests can only be sent to your signed-in account.');
  if (typeof body.subject !== 'string' || !body.subject.trim() || body.subject.length > 150 || /[\r\n\u0000]/.test(body.subject)) throw new ApiError(400, 'Enter an email subject up to 150 characters.');
  if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 8000 || /\u0000/.test(body.text)) throw new ApiError(400, 'Enter email text up to 8,000 characters.');
  if (typeof body.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.requestId)) throw new ApiError(400, 'Refresh the page and try the email test again.');
  const access = (await cookies()).get('scout_access')?.value;
  const verifiedResponse = access ? await authFetch('user', { token: access }) : null;
  const verified = verifiedResponse?.ok ? await verifiedResponse.json().catch(() => null) : null;
  if (!verified || verified.id !== user.userId || verified.email !== user.email || typeof verified.email_confirmed_at !== 'string' || !Number.isFinite(new Date(verified.email_confirmed_at).getTime())) throw new ApiError(403, 'Confirm your account email before sending a delivery test.');
  const status = await connectionStatus(user.userId, 'email');
  if (!status.connected || !status.configured) throw new ApiError(409, 'Enable email testing first.');
  const credentials = (await providerCredentials()).email!;
  if (credentials.provider !== 'resend') throw new ApiError(503, 'Email testing is not available right now.');
  if (/[\r\n<>]/.test(credentials.fromEmail) || /[\r\n<>]/.test(credentials.fromName || '')) throw new ApiError(503, 'Email testing is not available right now.');
  await claimEmailQuota(user.userId);
  const data = await remoteJson('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + credentials.apiKey, 'Content-Type': 'application/json', 'Idempotency-Key': `scout-test:${user.userId}:${body.requestId}` }, body: JSON.stringify({ from: credentials.fromName ? `${credentials.fromName} <${credentials.fromEmail}>` : credentials.fromEmail, to: [user.email], subject: '[PNG Scout test] ' + body.subject.trim(), text: body.text.trim() }) }, 'email');
  if (typeof data.id !== 'string') throw new ApiError(502, 'The email test could not be confirmed. Check your inbox before trying again.');
  return { sent: true, recipient: user.email };
}
