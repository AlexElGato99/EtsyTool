import 'server-only';
import { cookies } from 'next/headers';
import { db } from './supabase';
import { encryptCredentials, readSetting, writeSetting } from './settings';
import { ApiError, decodeEtsyText, retiredEtsyFeature } from './etsy';
import { positiveId } from './search-options';
import { requireCurrentTerms } from './application-terms';
import { etsyAccessStatus, requireApprovedEtsyAccess, denyObservedEtsyAccess, purgeUserEtsyGrant } from './etsy-access';

export type ConnectionProvider = 'etsy' | 'pinterest' | 'email';
export type ProviderCredentials = { pinterest?: { appId: string; appSecret: string }; email?: { provider: 'resend' | 'brevo'; apiKey: string; fromEmail: string; fromName?: string } };
export type ConnectionStatus = { provider: ConnectionProvider; configured: boolean; connected: boolean; label: string | null; connectedAt: string | null; permissions: string[]; approved?: boolean; available?: boolean };
type Encrypted = { iv: string; ciphertext: string };
type Stored = { id: string; encrypted: Encrypted | null };
type TokenRecord = { provider: 'etsy'; userId: string; accessToken: string; refreshToken?: string; expiresAt: number; refreshExpiresAt?: number; scopes: string[]; externalUserId: string; label: string; connectedAt: string; credentialFingerprint: string };
type OAuthState = { userId: string; state: string; verifier: string; expiresAt: number; redirectUri: string; clientId: string; connectionRevision: string; credentialFingerprint: string };
export type OwnShopListing = { id: string; title: string; description: string; tags: string[]; price: { amount: number; currency: string } | null; state: 'active' | 'draft'; url: string; images: { url: string; alt: string }[] };
const keyFor = (userId: string) => `connections:${userId}:etsy`;
const oauthKey = (userId: string) => `${keyFor(userId)}:oauth`;
const cookieName = 'scout_oauth_etsy';
const connectionLabel = 'Your Etsy shop';
const random = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const hash = async (value: string) => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('base64url');
function etsyOnly(provider: string) { if (provider !== 'etsy') throw new ApiError(410, 'This service connection has been retired. Use the manual listing-preparation tools.'); }
export function connectionProvider(value: string): ConnectionProvider { if (!['etsy', 'pinterest', 'email'].includes(value)) throw new ApiError(404, 'Connection not found.'); etsyOnly(value); return 'etsy'; }
export async function decryptConnectionValue<T = ProviderCredentials>(value: unknown): Promise<T> {
  try {
    const envelope = value as Encrypted; const bytes = Uint8Array.from(Buffer.from(process.env.SETTINGS_ENCRYPTION_KEY || '', 'base64'));
    const iv = Uint8Array.from(Buffer.from(envelope.iv, 'base64'));
    if (bytes.length !== 32 || iv.length !== 12 || typeof envelope.ciphertext !== 'string') throw Error();
    const key = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, Uint8Array.from(Buffer.from(envelope.ciphertext, 'base64')));
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch { throw new ApiError(503, 'The saved connection could not be loaded. Please try again later.'); }
}
export async function providerCredentials(): Promise<ProviderCredentials> { const value = await readSetting('provider_credentials'); return value ? decryptConnectionValue<ProviderCredentials>(value) : {}; }
async function tokenRecord(userId: string) {
  const stored = await readSetting(keyFor(userId)) as Stored | null;
  const record = stored?.encrypted ? await decryptConnectionValue<TokenRecord>(stored.encrypted) : null;
  return { stored, record };
}
async function replace(userId: string, expectedId: string, record: TokenRecord) {
  const rows = await db<{ key: string }[]>('app_settings', { method: 'PATCH', params: { key: 'eq.' + keyFor(userId), 'value->>id': 'eq.' + expectedId }, body: { value: { id: crypto.randomUUID(), encrypted: await encryptCredentials(record) } }, prefer: 'return=representation' });
  return Array.isArray(rows) && rows.length === 1;
}
function validRecord(record: TokenRecord | null, userId: string, binding: string) {
  if (!record || record.provider !== 'etsy' || record.userId !== userId || record.credentialFingerprint !== binding || !Array.isArray(record.scopes) || record.scopes.length !== 1 || record.scopes[0] !== 'listings_r'
    || typeof record.accessToken !== 'string' || !record.accessToken.startsWith(record.externalUserId + '.') || record.accessToken.length > 8192 || !Number.isFinite(record.expiresAt)
    || (record.refreshExpiresAt !== undefined && !Number.isFinite(record.refreshExpiresAt))) return false;
  try { return positiveId(record.externalUserId, 'account ID') === record.externalUserId; } catch { return false; }
}
export async function connectionStatus(userId: string, provider: ConnectionProvider): Promise<ConnectionStatus> {
  etsyOnly(provider); await requireCurrentTerms(userId); const status = await etsyAccessStatus(userId);
  if (!status.available) return { provider, configured: status.configured, connected: false, label: null, connectedAt: null, permissions: [], approved: status.approved, available: false };
  const access = await requireApprovedEtsyAccess(userId); const { record } = await tokenRecord(userId);
  const connected = validRecord(record, userId, access.binding) && (record!.expiresAt > Date.now() || !!record!.refreshToken && !!record!.refreshExpiresAt && record!.refreshExpiresAt! > Date.now());
  return { provider, configured: true, connected, label: connected ? connectionLabel : null, connectedAt: connected ? record!.connectedAt : null, permissions: connected ? ['listings_r'] : [], approved: true, available: true };
}
export async function beginConnection(userId: string, provider: ConnectionProvider, origin: string, _email: string) {
  etsyOnly(provider); await requireCurrentTerms(userId); const access = await requireApprovedEtsyAccess(userId);
  if (new URL(origin).protocol !== 'https:') throw new ApiError(400, 'Etsy requires a secure website address. Connect from the live website.');
  await db('app_settings', { method: 'POST', body: { key: keyFor(userId), value: { id: crypto.randomUUID(), encrypted: null } }, prefer: 'resolution=ignore-duplicates,return=minimal' });
  const { stored } = await tokenRecord(userId); if (!stored) throw new ApiError(503, 'The connection could not be started. Please retry.');
  const state: OAuthState = { userId, state: random(), verifier: random(), expiresAt: Date.now() + 600_000, redirectUri: `${origin}/api/connections/etsy/callback`, clientId: access.credentials.key, connectionRevision: stored.id, credentialFingerprint: access.binding };
  await writeSetting(oauthKey(userId), { stateHash: await hash(state.state), expiresAt: state.expiresAt });
  if ((await requireApprovedEtsyAccess(userId)).binding !== access.binding) throw new ApiError(409, 'Etsy access changed. Start the connection again.');
  (await cookies()).set(cookieName, Buffer.from(JSON.stringify(await encryptCredentials(state))).toString('base64url'), { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/connections/etsy', maxAge: 600 });
  const url = new URL('https://www.etsy.com/oauth/connect');
  Object.entries({ client_id: access.credentials.key, redirect_uri: state.redirectUri, response_type: 'code', scope: 'listings_r', state: state.state, code_challenge: await hash(state.verifier), code_challenge_method: 'S256' }).forEach(([key, value]) => url.searchParams.set(key, value));
  return { url: url.toString() };
}
async function remote(userId: string, url: string, init: RequestInit, expectedBinding?: string) {
  const access = await requireApprovedEtsyAccess(userId);
  if (expectedBinding && access.binding !== expectedBinding) throw new ApiError(409, 'Etsy access changed. Reconnect before continuing.');
  let response: Response;
  try { response = await fetch(url, { ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) }); }
  catch { throw new ApiError(502, 'Etsy could not be reached. Please try again later.'); }
  if (response.status === 401 || response.status === 403) {
    await denyObservedEtsyAccess(access.approvalRevision); await purgeUserEtsyGrant(userId);
    throw new ApiError(503, 'The shop connection is currently unavailable. You can continue with the manual tools.', 'etsy');
  }
  if (response.status === 429) throw new ApiError(429, 'Etsy’s request limit was reached. Wait before trying again.');
  if (response.status === 404) throw new ApiError(404, 'Etsy could not find your shop or listing.');
  if (!response.ok) throw new ApiError(502, 'Etsy could not complete this request. Please try again later.');
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ApiError(502, 'Etsy returned an incomplete response.');
  if ((await requireApprovedEtsyAccess(userId)).binding !== access.binding) throw new ApiError(409, 'Etsy access changed. Refresh before continuing.');
  return data as Record<string, any>;
}
async function exchange(userId: string, params: Record<string, string>, binding: string) {
  const access = await requireApprovedEtsyAccess(userId); const body = new URLSearchParams({ ...params, client_id: access.credentials.key });
  return remote(userId, 'https://api.etsy.com/v3/public/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }, binding);
}
async function validatedToken(userId: string, data: Record<string, any>, binding: string, previous?: TokenRecord): Promise<TokenRecord> {
  const granted = typeof data.scope === 'string' ? data.scope.split(/\s+/).filter(Boolean) : previous?.scopes || [];
  if (granted.length !== 1 || granted[0] !== 'listings_r') { await purgeUserEtsyGrant(userId); throw new ApiError(403, 'Approve only the requested listing-read permission. Remove the old app grant in Etsy, then reconnect.'); }
  if (typeof data.access_token !== 'string' || !data.access_token || data.access_token.length > 8192 || !Number.isSafeInteger(data.expires_in) || data.expires_in <= 0 || data.expires_in > 86400) throw new ApiError(502, 'Etsy authorization could not be completed. Please reconnect.');
  const externalUserId = data.access_token.match(/^(\d+)\./)?.[1];
  try { if (!externalUserId || positiveId(externalUserId, 'account ID') !== externalUserId) throw Error(); } catch { throw new ApiError(502, 'Etsy returned an invalid account authorization.'); }
  if (previous && previous.externalUserId !== externalUserId) { await purgeUserEtsyGrant(userId); throw new ApiError(403, 'Your Etsy account authorization changed. Reconnect your own shop.'); }
  const refreshToken = typeof data.refresh_token === 'string' && data.refresh_token.length > 0 && data.refresh_token.length <= 8192 ? data.refresh_token : previous?.refreshToken;
  if (refreshToken && !refreshToken.startsWith(externalUserId + '.')) { await purgeUserEtsyGrant(userId); throw new ApiError(502, 'Etsy returned an invalid account authorization.'); }
  return { provider: 'etsy', userId, accessToken: data.access_token, refreshToken, expiresAt: Date.now() + data.expires_in * 1000,
    refreshExpiresAt: refreshToken ? typeof data.refresh_token === 'string' ? Date.now() + 90 * 86400_000 : previous?.refreshExpiresAt : undefined,
    scopes: ['listings_r'], externalUserId, label: connectionLabel, connectedAt: previous?.connectedAt || new Date().toISOString(), credentialFingerprint: binding };
}
async function ownRequest(userId: string, record: TokenRecord, path: string, params: Record<string, string> = {}) {
  if (!/^(?:users\/\d+\/shops|shops\/\d+\/listings)$/.test(path)) throw new ApiError(410, 'Only your own listing catalog is available.');
  const access = await requireApprovedEtsyAccess(userId); const url = new URL('https://openapi.etsy.com/v3/application/' + path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return remote(userId, url.toString(), { headers: { Authorization: 'Bearer ' + record.accessToken, 'x-api-key': access.credentials.key + ':' + access.credentials.secret } }, record.credentialFingerprint);
}
export async function finishConnection(userId: string, provider: 'etsy' | 'pinterest', callbackUrl: string): Promise<'connected' | 'cancelled'> {
  etsyOnly(provider); await requireCurrentTerms(userId); const access = await requireApprovedEtsyAccess(userId);
  const jar = await cookies(); const cookie = jar.get(cookieName)?.value;
  jar.set(cookieName, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/connections/etsy', maxAge: 0 });
  const url = new URL(callbackUrl); let state: OAuthState;
  try {
    if (!cookie || cookie.length > 8000) throw Error(); state = await decryptConnectionValue<OAuthState>(JSON.parse(Buffer.from(cookie, 'base64url').toString('utf8')));
    if (state.userId !== userId || state.expiresAt <= Date.now() || state.redirectUri !== `${url.origin}/api/connections/etsy/callback` || !state.state || url.searchParams.get('state') !== state.state || state.credentialFingerprint !== access.binding || state.clientId !== access.credentials.key) throw Error();
  } catch { throw new ApiError(400, 'This connection link expired or could not be verified. Start again.'); }
  const consumed = await db<{ key: string }[]>('app_settings', { method: 'DELETE', params: { key: 'eq.' + oauthKey(userId), 'value->>stateHash': 'eq.' + await hash(state.state) }, prefer: 'return=representation' });
  if (!Array.isArray(consumed) || consumed.length !== 1) throw new ApiError(400, 'This connection link was already used. Start again.');
  if (url.searchParams.has('error')) return 'cancelled'; const code = url.searchParams.get('code'); if (!code || code.length > 4096) throw new ApiError(400, 'The account authorization was not completed.');
  const record = await validatedToken(userId, await exchange(userId, { grant_type: 'authorization_code', code, redirect_uri: state.redirectUri, code_verifier: state.verifier }, access.binding), access.binding);
  const shop = await ownRequest(userId, record, `users/${record.externalUserId}/shops`); positiveId(String(shop.shop_id), 'shop ID');
  if (shop.user_id !== undefined && String(shop.user_id) !== record.externalUserId) throw new ApiError(403, 'The returned shop does not belong to the account you connected.');
  if ((await requireApprovedEtsyAccess(userId)).binding !== access.binding || !await replace(userId, state.connectionRevision, record)) throw new ApiError(409, 'Your connection changed. Start again.');
  return 'connected';
}
export async function disconnectConnection(userId: string, provider: ConnectionProvider) {
  etsyOnly(provider); await purgeUserEtsyGrant(userId);
  (await cookies()).set(cookieName, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/connections/etsy', maxAge: 0 });
}
export async function activeConnection(userId: string, provider: 'etsy' | 'pinterest'): Promise<TokenRecord> {
  etsyOnly(provider); await requireCurrentTerms(userId); const access = await requireApprovedEtsyAccess(userId); const { stored, record } = await tokenRecord(userId);
  if (!stored || !validRecord(record, userId, access.binding)) throw new ApiError(409, 'Connect your Etsy shop with the current listing-read permission first.');
  if (record!.expiresAt > Date.now() + 60_000) return record!;
  if (!record!.refreshToken || !record!.refreshExpiresAt || record!.refreshExpiresAt <= Date.now()) { await purgeUserEtsyGrant(userId); throw new ApiError(409, 'Reconnect your Etsy shop to continue.'); }
  const refreshed = await validatedToken(userId, await exchange(userId, { grant_type: 'refresh_token', refresh_token: record!.refreshToken! }, access.binding), access.binding, record!);
  if ((await requireApprovedEtsyAccess(userId)).binding !== access.binding) throw new ApiError(409, 'Etsy access changed. Reconnect before continuing.');
  if (await replace(userId, stored.id, refreshed)) return refreshed;
  const current = (await tokenRecord(userId)).record;
  if (!validRecord(current, userId, access.binding) || current!.expiresAt <= Date.now()) throw new ApiError(409, 'Your connection changed. Refresh before continuing.');
  return current!;
}
export function normalizeMoney(value: any) {
  if (!value || !Number.isFinite(value.amount) || !Number.isFinite(value.divisor) || value.divisor <= 0 || !/^[A-Z]{3}$/.test(String(value.currency_code))) return null;
  return { amount: value.amount / value.divisor, currency: value.currency_code as string };
}
function image(value: any) {
  const raw = value?.url_570xN || value?.url_fullxfull;
  try { const url = new URL(raw); if (url.protocol === 'https:' && url.hostname === 'i.etsystatic.com' && !url.username && !url.password && !url.port) return { url: url.href, alt: typeof value.alt_text === 'string' ? value.alt_text.slice(0, 500) : '' }; } catch {}
  return null;
}
export async function connectedShopListings(userId: string, options: { state: 'active' | 'draft'; limit: number; offset: number }) {
  if (!['active', 'draft'].includes(options.state) || !Number.isInteger(options.limit) || options.limit < 1 || options.limit > 25 || !Number.isInteger(options.offset) || options.offset < 0 || options.offset > 12000) throw new ApiError(400, 'Choose active or draft listings and a valid page.');
  const record = await activeConnection(userId, 'etsy'); const shop = await ownRequest(userId, record, `users/${record.externalUserId}/shops`); const shopId = positiveId(String(shop.shop_id), 'shop ID');
  if (shop.user_id !== undefined && String(shop.user_id) !== record.externalUserId) throw new ApiError(403, 'The shop does not belong to your connected account.');
  const data = await ownRequest(userId, record, `shops/${shopId}/listings`, { state: options.state, limit: String(options.limit), offset: String(options.offset), includes: 'Images' });
  if (!Array.isArray(data.results) || data.results.length > options.limit || !Number.isSafeInteger(data.count) || data.count < 0) throw new ApiError(502, 'Etsy returned an incomplete listing page.');
  const listings: OwnShopListing[] = data.results.map((listing: any) => {
    if (String(listing.shop_id) !== shopId || listing.state !== options.state) throw new ApiError(502, 'Etsy returned a listing outside your requested shop or state.');
    const listingId = positiveId(String(listing.listing_id), 'listing ID'); const images = listing.images || listing.Images || [];
    return { id: listingId, title: decodeEtsyText(String(listing.title || '')).slice(0, 140), description: decodeEtsyText(String(listing.description || '')).slice(0, 10000), tags: Array.isArray(listing.tags) ? listing.tags.filter((tag: unknown) => typeof tag === 'string').slice(0, 13).map(decodeEtsyText) : [], price: normalizeMoney(listing.price), state: options.state,
      url: `https://www.etsy.com/listing/${listingId}`, images: Array.isArray(images) ? images.map(image).filter((item): item is { url: string; alt: string } => !!item).slice(0, 1) : [] };
  });
  const current = (await tokenRecord(userId)).record;
  if (!validRecord(current, userId, record.credentialFingerprint) || current!.externalUserId !== record.externalUserId) throw new ApiError(409, 'Your connection changed. Refresh before viewing listings.');
  const capturedTime = Date.now(); const capturedAt = new Date(capturedTime).toISOString();
  return { shop: { id: shopId, name: decodeEtsyText(String(shop.shop_name || 'Your Etsy shop')).slice(0, 100), url: 'https://www.etsy.com/shop/' + encodeURIComponent(String(shop.shop_name || '')) }, listings, ...options, count: data.count,
    hasMore: listings.length > 0 && options.offset + options.limit < data.count && options.offset + options.limit <= 12000, capturedAt, expiresAt: new Date(capturedTime + 6 * 3600_000).toISOString() };
}
// Retained export names fail closed for stale callers; no external data transfer or analytics executes.
export async function connectedShop(..._args: unknown[]): Promise<any> { return retiredEtsyFeature(); }
export async function connectedListing(..._args: unknown[]): Promise<any> { return retiredEtsyFeature(); }
export async function pinterestBoards(..._args: unknown[]): Promise<any> { return retiredEtsyFeature(); }
export async function publishPinterest(..._args: unknown[]): Promise<any> { return retiredEtsyFeature(); }
export function validatePin(..._args: unknown[]): never { return retiredEtsyFeature(); }
export async function sendEmailTest(..._args: unknown[]): Promise<any> { return retiredEtsyFeature(); }
