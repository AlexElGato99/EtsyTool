import 'server-only';
import { db } from './supabase';
import { encryptCredentials, readSetting } from './settings';
import { decryptConnectionValue } from './connections';
import { ApiError } from './etsy';
import { DRAFT_LIMIT, validateDraftInput, type ListingDraft } from './listing-draft';

type Store = { ownerId: string; drafts: ListingDraft[] };
type Envelope = { revision: string; encrypted: { iv: string; ciphertext: string } };
const keyFor = (userId: string) => `listing-drafts:${userId}`;
const validId = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
async function read(userId: string) {
  const envelope = await readSetting(keyFor(userId)) as Envelope | null;
  if (!envelope) return { envelope: null, store: { ownerId: userId, drafts: [] } as Store };
  let store: Store;
  try { store = await decryptConnectionValue<Store>(envelope.encrypted); }
  catch { throw new ApiError(503, 'Your saved drafts could not be loaded. Please try again later.'); }
  if (store.ownerId !== userId || !Array.isArray(store.drafts) || store.drafts.length > DRAFT_LIMIT || typeof envelope.revision !== 'string') throw new ApiError(503, 'Your saved drafts could not be loaded. Please try again later.');
  return { envelope, store };
}
export async function listingDrafts(userId: string) { return { drafts: (await read(userId)).store.drafts, limit: DRAFT_LIMIT }; }
export async function changeDraft(userId: string, body: Record<string, unknown>) {
  if (typeof body.action !== 'string' || !['save', 'delete', 'clear'].includes(body.action)) throw new ApiError(400, 'Choose a valid draft action.');
  if (body.action === 'clear' && body.confirmDelete !== true) throw new ApiError(400, 'Confirm that you want to delete your saved drafts.');
  if (body.action !== 'clear' && !validId(body.id)) throw new ApiError(400, 'Choose a valid draft.');
  let input;
  if (body.action === 'save') { try { input = validateDraftInput(body); } catch (error) { throw new ApiError(400, (error as Error).message); } }
  const { envelope, store } = await read(userId);
  if (body.revision !== (envelope?.revision ?? null)) throw new ApiError(409, 'Your drafts changed in another tab. Reload them before saving again.');
  const now = new Date().toISOString();
  if (body.action === 'clear') store.drafts = [];
  else if (body.action === 'delete') store.drafts = store.drafts.filter(draft => draft.id !== body.id);
  else {
    const index = store.drafts.findIndex(draft => draft.id === body.id);
    if (index < 0 && store.drafts.length >= DRAFT_LIMIT) throw new ApiError(409, 'You can save up to 30 drafts. Remove a draft before adding another.');
    const draft: ListingDraft = { id: body.id as string, ...input!, createdAt: index < 0 ? now : store.drafts[index].createdAt, updatedAt: now };
    if (index < 0) store.drafts.unshift(draft); else store.drafts[index] = draft;
  }
  const next: Envelope = { revision: crypto.randomUUID(), encrypted: await encryptCredentials(store) };
  let saved: boolean;
  if (envelope) {
    const rows = await db<{ key: string }[]>('app_settings', { method: 'PATCH', params: { key: 'eq.' + keyFor(userId), 'value->>revision': 'eq.' + envelope.revision }, body: { value: next }, prefer: 'return=representation' });
    saved = Array.isArray(rows) && rows.length === 1;
  } else {
    const rows = await db<{ key: string }[]>('app_settings', { method: 'POST', body: { key: keyFor(userId), value: next }, prefer: 'resolution=ignore-duplicates,return=representation' });
    saved = Array.isArray(rows) && rows.length === 1;
  }
  if (!saved) throw new ApiError(409, 'Your drafts changed in another tab. Reload them before saving again.');
  return { drafts: store.drafts, limit: DRAFT_LIMIT, revision: next.revision };
}
export async function listingDraftState(userId: string) { const { envelope, store } = await read(userId); return { drafts: store.drafts, limit: DRAFT_LIMIT, revision: envelope?.revision ?? null }; }
