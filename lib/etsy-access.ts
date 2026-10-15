import 'server-only';
import { db } from './supabase';
import { decryptCredentials, readSetting, writeSetting } from './settings';
import { ApiError } from './etsy';

export const ETSY_PURPOSE_VERSION = 'own-listing-preparation-v1';
export const ETSY_REQUIRED_PURPOSE = 'Seller-owned listing preparation: read the connected seller’s active and draft listings for review and manual listing preparation.';
export type EtsyAccessMode = 'seller' | 'personal' | 'commercial';
export type EtsyApprovalRecord = {
  revision: string; state: 'pending' | 'approved' | 'withdrawn' | 'revoked'; purposeVersion: string;
  applicationPurpose: string; approvalSource: 'developer_portal' | 'etsy_email' | 'written_agreement';
  approvalReference: string; approvedAt: string; recordedAt: string; accessMode: EtsyAccessMode;
  keyFingerprint: string; operatorUserId: string;
};
const settingKey = 'etsy_access';
const digest = async (value: string) => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('base64url');
export async function etsyKeyFingerprint() {
  if (!await readSetting('etsy_credentials')) return null;
  const value = await decryptCredentials();
  return value?.key && value.secret ? digest(JSON.stringify([value.key, value.secret])) : null;
}
async function record() { return await readSetting(settingKey) as EtsyApprovalRecord | null; }
function validApproval(value: EtsyApprovalRecord | null) {
  return !!value && value.state === 'approved' && value.purposeVersion === ETSY_PURPOSE_VERSION && value.applicationPurpose === ETSY_REQUIRED_PURPOSE
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.revision)
    && ['seller', 'personal', 'commercial'].includes(value.accessMode) && ['developer_portal', 'etsy_email', 'written_agreement'].includes(value.approvalSource)
    && typeof value.operatorUserId === 'string' && !!value.operatorUserId && typeof value.approvalReference === 'string' && value.approvalReference.trim().length >= 3
    && [value.approvedAt, value.recordedAt].every(date => typeof date === 'string' && Number.isFinite(new Date(date).getTime()) && new Date(date).getTime() <= Date.now());
}
async function purgeEtsyGrants() {
  await db('app_settings', { method: 'DELETE', params: { key: 'like.connections:*:etsy' }, prefer: 'return=minimal' });
  await db('app_settings', { method: 'DELETE', params: { key: 'like.connections:*:etsy:oauth' }, prefer: 'return=minimal' });
  await writeSetting('connection_status', null);
}
export async function etsyAccessStatus(userId?: string) {
  const value = await record(); let keyFingerprint: string | null = null; let configured = false;
  try { configured = !!await readSetting('etsy_credentials'); keyFingerprint = await etsyKeyFingerprint(); } catch { /* Keep owner configuration details private. */ }
  const keyMatches = !!keyFingerprint && value?.keyFingerprint === keyFingerprint;
  const approved = validApproval(value) && keyMatches;
  return { state: value?.state || 'pending', approved, available: approved && (!userId || value?.accessMode === 'commercial' || userId === value?.operatorUserId), configured, keyMatches,
    accessMode: value?.accessMode || null, applicationPurpose: value?.applicationPurpose || null, approvalSource: value?.approvalSource || null,
    approvalReference: value?.approvalReference || null, approvedAt: value?.approvedAt || null, recordedAt: value?.recordedAt || null };
}
export async function ownerEtsyAccess() { return { access: await etsyAccessStatus(), requiredPurpose: ETSY_REQUIRED_PURPOSE, currentApplicationName: 'podadd', previousApplicationName: 'png-scout', sameApplication: true, attestationOnly: true }; }
export async function requireApprovedEtsyAccess(userId: string) {
  const value = await record();
  if (!validApproval(value) || !value || value.accessMode !== 'commercial' && userId !== value.operatorUserId) throw new ApiError(503, 'Own-shop access is unavailable while the operator reviews Etsy approval for this application.');
  const credentials = await decryptCredentials();
  if (!credentials?.key || !credentials.secret || await digest(JSON.stringify([credentials.key, credentials.secret])) !== value.keyFingerprint) throw new ApiError(503, 'Own-shop access is unavailable. Please try again after the operator reviews the connection.');
  const current = await record();
  if (!validApproval(current) || current?.revision !== value.revision || current?.keyFingerprint !== value.keyFingerprint || current?.operatorUserId !== value.operatorUserId || current?.accessMode !== value.accessMode) throw new ApiError(409, 'Etsy access changed. Refresh before continuing.');
  return { credentials, approvalRevision: value.revision, binding: await digest(JSON.stringify([ETSY_PURPOSE_VERSION, value.revision, value.keyFingerprint, 'listings_r'])) };
}
export async function invalidateEtsyApproval(state: 'pending' | 'withdrawn' = 'pending') {
  const value = await record(); await writeSetting(settingKey, value ? { ...value, revision: crypto.randomUUID(), state } : { revision: crypto.randomUUID(), state, purposeVersion: ETSY_PURPOSE_VERSION });
  await purgeEtsyGrants();
}
export async function denyObservedEtsyAccess(expectedRevision: string) {
  const value = await record(); if (!value || value.revision !== expectedRevision) return;
  const rows = await db<{ key: string }[]>('app_settings', { method: 'PATCH', params: { key: 'eq.' + settingKey, 'value->>revision': 'eq.' + expectedRevision }, body: { value: { ...value, revision: crypto.randomUUID(), state: 'revoked' } }, prefer: 'return=representation' });
  if (Array.isArray(rows) && rows.length === 1) await purgeEtsyGrants();
}
export async function purgeUserEtsyGrant(userId: string) {
  await writeSetting(`connections:${userId}:etsy`, { id: crypto.randomUUID(), encrypted: null });
  await writeSetting(`connections:${userId}:etsy:oauth`, null);
  await db('watchlist', { method: 'DELETE', params: { user_id: 'eq.' + userId }, prefer: 'return=minimal' });
}
export async function purgeLegacyEtsyData() {
  await invalidateEtsyApproval('withdrawn');
  await db('research_cache', { method: 'DELETE', params: { key: 'not.is.null' }, prefer: 'return=minimal' });
  await db('listing_snapshots', { method: 'DELETE', params: { key: 'not.is.null' }, prefer: 'return=minimal' });
  await db('watchlist', { method: 'DELETE', params: { listing_id: 'not.is.null' }, prefer: 'return=minimal' });
}
function text(value: unknown, label: string, max: number, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max || /[\u0000-\u001f<>]/.test(value)) throw new ApiError(400, `Enter ${label} between ${min} and ${max} characters.`);
  return value.trim();
}
export async function changeEtsyAccess(userId: string, body: Record<string, unknown>) {
  if (body.action === 'withdraw') {
    if (body.confirmWithdraw !== true) throw new ApiError(400, 'Confirm that you want to withdraw Etsy access.');
    await invalidateEtsyApproval('withdrawn'); await writeSetting('etsy_credentials', null); await writeSetting('connection_status', null);
    return { ...await ownerEtsyAccess(), withdrawn: true };
  }
  if (body.action === 'purge') {
    if (body.confirmCleanup !== true || body.confirmation !== 'REMOVE ETSY DATA') throw new ApiError(400, 'Type REMOVE ETSY DATA and confirm the cleanup.');
    await purgeLegacyEtsyData(); return { ...await ownerEtsyAccess(), purged: true };
  }
  if (body.action !== 'approve' || body.confirmApprovedPurpose !== true || body.confirmSameApplication !== true) throw new ApiError(400, 'Confirm Etsy’s actual approval of this application and its current own-listing purpose.');
  if (!['seller', 'personal', 'commercial'].includes(String(body.accessMode)) || !['developer_portal', 'etsy_email', 'written_agreement'].includes(String(body.approvalSource))) throw new ApiError(400, 'Choose the actual approved access mode and approval source.');
  const applicationPurpose = text(body.applicationPurpose, 'the approved application purpose', 2000, 20);
  if (applicationPurpose !== ETSY_REQUIRED_PURPOSE) throw new ApiError(400, 'Approval must cover the supported seller-owned listing-preparation purpose.');
  const approvalReference = text(body.approvalReference, 'an approval reference without secrets or email content', 500, 3);
  const approvedAt = text(body.approvedAt, 'the approval date', 40);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(approvedAt) || !Number.isFinite(new Date(approvedAt).getTime()) || new Date(approvedAt).toISOString().slice(0, 10) !== approvedAt.slice(0, 10) || new Date(approvedAt).getTime() > Date.now()) throw new ApiError(400, 'Enter a valid approval date that is not in the future.');
  const keyFingerprint = await etsyKeyFingerprint(); if (!keyFingerprint) throw new ApiError(400, 'Save the approved application’s API key and shared secret before recording approval.');
  const value: EtsyApprovalRecord = { revision: crypto.randomUUID(), state: 'approved', purposeVersion: ETSY_PURPOSE_VERSION, applicationPurpose, approvalSource: body.approvalSource as EtsyApprovalRecord['approvalSource'], approvalReference, approvedAt: new Date(approvedAt).toISOString(), recordedAt: new Date().toISOString(), accessMode: body.accessMode as EtsyAccessMode, keyFingerprint, operatorUserId: userId };
  await writeSetting(settingKey, value); await purgeEtsyGrants(); return ownerEtsyAccess();
}
