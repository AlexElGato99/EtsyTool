export const DRAFT_LIMIT = 30;
export type ListingDraft = { id: string; title: string; description: string; tags: string[]; notes: string; listingUrl: string; createdAt: string; updatedAt: string };
export type DraftInput = Pick<ListingDraft, 'title' | 'description' | 'tags' | 'notes' | 'listingUrl'>;

export function validateDraftInput(value: Record<string, unknown>): DraftInput {
  const text = (input: unknown, label: string, max: number, required = false) => {
    if (typeof input !== 'string' || input.length > max || (required && !input.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input)) throw Error(`Enter ${label} up to ${max.toLocaleString('en-US')} characters.`);
    return input.trim();
  };
  const title = text(value.title, 'a title', 140, true);
  if (/[\r\n\t]/.test(title)) throw Error('Keep the listing title on one line.');
  const description = text(value.description ?? '', 'a description', 10000);
  const notes = text(value.notes ?? '', 'notes', 2000);
  if (!Array.isArray(value.tags) || value.tags.length > 13) throw Error('Add up to 13 tags.');
  const tags = value.tags.map(tag => text(tag, 'each tag', 20, true));
  if (tags.some(tag => /[\r\n\t]/.test(tag)) || new Set(tags.map(tag => tag.toLowerCase())).size !== tags.length) throw Error('Use unique tags on one line, up to 20 characters each.');
  let listingUrl = text(value.listingUrl ?? '', 'your own listing link', 2048);
  if (listingUrl) {
    let url: URL; try { url = new URL(listingUrl); } catch { throw Error('Enter an HTTPS Etsy listing link from your own shop.'); }
    if (url.protocol !== 'https:' || !['etsy.com', 'www.etsy.com'].includes(url.hostname) || url.username || url.password || url.port || !/^\/listing\/[1-9]\d*(?:\/[^/]*)?\/?$/.test(url.pathname)) throw Error('Enter an HTTPS Etsy listing link from your own shop.');
    listingUrl = url.origin + url.pathname;
  }
  return { title, description, tags, notes, listingUrl };
}
