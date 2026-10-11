import { db } from './supabase';
import { decryptCredentials, readSetting } from './settings';
import type { SearchOptions } from './search-options';

const MAX_OFFSET = 12000;
const ETSY_PATH = /^(?:listings\/(?:active|batch|\d+)|shops(?:\/\d+(?:\/(?:listings\/(?:active|featured)|sections|shop-sections\/listings))?)?|(?:seller|buyer)-taxonomy\/nodes)$/;

export class ApiError extends Error {
  constructor(public status: number, message: string, public source?: 'etsy') { super(message); }
}

export async function etsy(path: string, params: Record<string, string> = {}) {
  if (!ETSY_PATH.test(path)) throw new ApiError(400, 'Unsupported Etsy resource.');
  let credentials: { key: string; secret: string } | null;
  try { credentials = await decryptCredentials(); }
  catch { throw new ApiError(503, 'The Etsy integration is not configured correctly. Check saved credentials and encryption settings.', 'etsy'); }
  if (!credentials?.key || !credentials.secret) throw new ApiError(503, 'The owner must configure an approved Etsy API key before research can start.', 'etsy');
  const url = new URL('https://openapi.etsy.com/v3/application/' + path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'x-api-key': credentials.key + ':' + credentials.secret },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
  } catch { throw new ApiError(502, 'Etsy could not be reached. Try again later.', 'etsy'); }
  if (response.status === 429) throw new ApiError(429, 'Etsy API quota reached. Wait before searching again.', 'etsy');
  if (response.status === 401 || response.status === 403) throw new ApiError(403, 'Etsy rejected access. Check your credentials and application approval.', 'etsy');
  if (response.status === 404) throw new ApiError(404, 'No matching Etsy listing or shop was found. Check the link or ID and try again.', 'etsy');
  if (response.status === 400) throw new ApiError(400, 'Etsy could not apply these search filters. Check the values and try again.', 'etsy');
  if (!response.ok) throw new ApiError(502, 'Etsy returned an error. Please retry later.', 'etsy');
  let value: unknown;
  try { value = await response.json(); }
  catch { throw new ApiError(502, 'Invalid response from Etsy.', 'etsy'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(502, 'Invalid response from Etsy.', 'etsy');
  return value as Record<string, any>;
}

async function ensureConfigured() {
  try {
    if (await readSetting('etsy_credentials')) return;
  } catch { /* Report the configuration issue only through the owner endpoint. */ }
  throw new ApiError(503, 'The owner must configure the Etsy integration before research can start.', 'etsy');
}

async function readCache(key: string): Promise<Record<string, any> | null> {
  try {
    const rows = await db<{ payload: Record<string, any> }[]>('research_cache', {
      params: { key: 'eq.' + key, expires: 'gt.' + new Date().toISOString(), select: 'payload', limit: '1' },
    });
    return rows[0]?.payload || null;
  } catch { return null; }
}

async function saveCache(key: string, payload: unknown, duration = 15 * 60000) {
  try {
    await db('research_cache', {
      method: 'POST', body: { key, payload, expires: new Date(Date.now() + duration).toISOString() },
      prefer: 'resolution=merge-duplicates,return=minimal',
    });
    await db('research_cache', { method: 'DELETE', params: { expires: 'lt.' + new Date().toISOString() }, prefer: 'return=minimal' });
  } catch { /* Research results remain usable when the optional cache is unavailable. */ }
}

function rawListings(data: Record<string, any>): Record<string, any>[] {
  return Array.isArray(data.results) ? data.results.filter((listing: any) => listing && /^\d{1,19}$/.test(String(listing.listing_id))) : [];
}

async function hydrateListings(listings: Record<string, any>[], options: SearchOptions) {
  if (!listings.length) return listings;
  const params: Record<string, string> = { listing_ids: listings.map(listing => String(listing.listing_id)).join(','), includes: 'Images,Shop' };
  if (options.mode === 'marketplace') {
    if (options.currency) params.currency = options.currency;
    if (options.buyerCountry) params.buyer_country = options.buyerCountry;
  }
  // Search endpoints do not document `includes`; the batch endpoint does.
  // A listing can disappear between search and hydration, so retain the actual
  // search record when Etsy returns 404 for that batch.
  let data: Record<string, any>;
  try { data = await etsy('listings/batch', params); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return listings; throw error; }
  const details = new Map(rawListings(data).map(listing => [String(listing.listing_id), listing]));
  return listings.map(listing => {
    const detail = details.get(String(listing.listing_id));
    return detail ? { ...listing, ...detail, converted_price: detail.converted_price ?? listing.converted_price } : listing;
  });
}

type ShopSummary = { id: string; name: string; url: string; sections: { id: string; name: string; count: number }[] };
type ProductSearchResult = {
  count: number; results: ReturnType<typeof normalizeListing>[]; mode: SearchOptions['mode'];
  limit: number; offset: number; hasMore: boolean; shop?: ShopSummary;
  capturedAt: string; cached: boolean;
};
type TaxonomyResult = { categories: { id: string; name: string; path: string }[]; capturedAt: string; cached: boolean };

async function resolveShop(options: SearchOptions): Promise<ShopSummary> {
  let shop: Record<string, any> | undefined;
  if (options.shopId) shop = await etsy('shops/' + options.shopId);
  else {
    const data = await etsy('shops', { shop_name: options.shopName || '', limit: '100', offset: '0' });
    shop = (Array.isArray(data.results) ? data.results : []).find((item: any) => typeof item?.shop_name === 'string' && item.shop_name.toLowerCase() === options.shopName?.toLowerCase());
  }
  if (!shop || !/^\d{1,19}$/.test(String(shop.shop_id))) throw new ApiError(404, 'No shop with that exact name or ID was found. Check the shop name and try again.');
  const id = String(shop.shop_id);
  const name = String(shop.shop_name || options.shopName || id);
  let sections: ShopSummary['sections'] = [];
  try {
    const data = await etsy('shops/' + id + '/sections');
    sections = (Array.isArray(data.results) ? data.results : []).filter((section: any) => section && /^\d{1,19}$/.test(String(section.shop_section_id))).map((section: any) => ({ id: String(section.shop_section_id), name: decodeEtsyText(String(section.title || 'Shop section')), count: Math.max(0, Number(section.active_listing_count) || 0) }));
  } catch { /* Sections are optional; active shop research still works. */ }
  return { id, name, url: 'https://www.etsy.com/shop/' + encodeURIComponent(name), sections };
}

export async function cachedProducts(options: SearchOptions): Promise<ProductSearchResult> {
  await ensureConfigured();
  const key = JSON.stringify(['products', 'v3', options]);
  const cached = await readCache(key);
  if (cached) return { ...cached, cached: true } as ProductSearchResult;
  let listings: Record<string, any>[];
  let count: number;
  let shop: ShopSummary | undefined;
  const params: Record<string, string> = { limit: String(options.limit), offset: String(options.offset) };
  if (options.mode === 'listing') {
    const ids = options.listingIds || [];
    if (!ids.length) throw new ApiError(400, 'Enter an Etsy listing link or ID.');
    // Direct lookups return the complete set, rather than silently omitting IDs
    // based on the marketplace page size.
    if (ids.length === 1) {
      const listing = await etsy('listings/' + ids[0], { includes: 'Images,Shop' });
      if (String(listing.listing_id) !== ids[0]) throw new ApiError(502, 'Etsy returned incomplete listing data. Please retry.', 'etsy');
      listings = [listing];
    }
    else listings = rawListings(await etsy('listings/batch', { listing_ids: ids.join(','), includes: 'Images,Shop' }));
    count = listings.length;
  } else {
    let path = 'listings/active';
    params.sort_on = options.sortOn;
    params.sort_order = options.sortOn === 'score' ? 'down' : options.sortOrder;
    if (options.mode === 'marketplace') {
      if (options.q) params.keywords = options.q;
      if (options.minPrice !== undefined) params.min_price = options.minPrice;
      if (options.maxPrice !== undefined) params.max_price = options.maxPrice;
      if (options.taxonomyId) params.taxonomy_id = options.taxonomyId;
      if (options.location) params.shop_location = options.location;
      if (options.currency) params.currency = options.currency;
      if (options.buyerCountry) params.buyer_country = options.buyerCountry;
      params.is_safe = String(options.isSafe);
    } else {
      shop = await resolveShop(options);
      if (options.shopView === 'featured') {
        path = 'shops/' + shop.id + '/listings/featured';
        delete params.sort_on;
        delete params.sort_order;
      } else if (options.shopView === 'section') {
        path = 'shops/' + shop.id + '/shop-sections/listings';
        params.shop_section_ids = (options.sectionIds || []).join(',');
      } else {
        path = 'shops/' + shop.id + '/listings/active';
        if (options.keywords) params.keywords = options.keywords;
      }
    }
    const data = await etsy(path, params);
    listings = await hydrateListings(rawListings(data), options);
    count = Math.max(0, Number(data.count) || 0);
  }
  const result = {
    count, results: listings.map(normalizeListing), mode: options.mode,
    limit: options.mode === 'listing' ? Math.max(1, count) : options.limit,
    offset: options.mode === 'listing' ? 0 : options.offset,
    hasMore: options.mode !== 'listing' && listings.length > 0 && options.offset + options.limit < count && options.offset + options.limit <= MAX_OFFSET,
    ...(shop ? { shop } : {}),
    capturedAt: new Date().toISOString(), cached: false,
  };
  await saveCache(key, result);
  return result;
}

// Kept for the existing keyword competition endpoint and older callers.
export async function cachedSearch(query: string, offset = 0) {
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) throw new ApiError(400, 'Invalid page offset.');
  return cachedProducts({ mode: 'marketplace', q: query.trim(), limit: 24, offset, sortOn: 'score', sortOrder: 'down', shopView: 'active', isSafe: true });
}

export async function cachedTaxonomy(): Promise<TaxonomyResult> {
  await ensureConfigured();
  const key = JSON.stringify(['taxonomy', 'seller', 'v1']);
  const cached = await readCache(key);
  if (cached) return { ...cached, cached: true } as TaxonomyResult;
  const data = await etsy('seller-taxonomy/nodes');
  const categories: { id: string; name: string; path: string }[] = [];
  function visit(nodes: unknown, parents: string[] = [], depth = 0) {
    if (!Array.isArray(nodes) || depth > 20) return;
    for (const node of nodes) {
      if (!node || !/^\d{1,19}$/.test(String(node.id)) || typeof node.name !== 'string') continue;
      const name = decodeEtsyText(node.name);
      const path = [...parents, name];
      categories.push({ id: String(node.id), name, path: path.join(' / ') });
      visit(node.children, path, depth + 1);
    }
  }
  visit(data.results);
  const result = { categories, capturedAt: new Date().toISOString(), cached: false };
  await saveCache(key, result, 24 * 60 * 60000);
  return result;
}

function safeImage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { return new URL(value).protocol === 'https:' ? value : null; } catch { return null; }
}

// Etsy encodes common HTML entities in text fields. Decode them into plain
// strings; the UI renders these through React's text escaping, never as HTML.
// Invalid numeric references remain readable tokens rather than throwing or
// inserting replacement characters into a seller's text.
export function decodeEtsyText(value: string): string {
  const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' };
  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|(amp|quot|apos|lt|gt|nbsp));/gi, (token, decimal, hex, name) => {
    if (name) return named[String(name).toLowerCase()];
    const codePoint = Number.parseInt(decimal || hex, hex ? 16 : 10);
    if (!Number.isInteger(codePoint) || codePoint <= 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return token;
    return String.fromCodePoint(codePoint);
  });
}

export function normalizeListing(p: any) {
  const original = p.price || {};
  const converted = p.converted_price;
  const money = converted && Number(converted.divisor) > 0 ? converted : original;
  const amount = Number(money.amount);
  const divisor = Number(money.divisor);
  const image = (p.images || [])[0];
  const isDigital = p.is_digital === true || p.type === 'download';
  const shop = p.shop || p.Shop;
  const created = Number(p.original_creation_timestamp || p.creation_timestamp || p.created_timestamp || Date.now() / 1000);
  return {
    id: String(p.listing_id), title: decodeEtsyText(String(p.title || 'Untitled listing')),
    description: typeof p.description === 'string' ? decodeEtsyText(p.description.slice(0, 25000)) : '',
    price: Number.isFinite(amount) && divisor > 0 ? amount / divisor : 0,
    currency: typeof money.currency_code === 'string' ? money.currency_code : 'USD',
    originalPrice: Number.isFinite(Number(original.amount)) && Number(original.divisor) > 0 ? Number(original.amount) / Number(original.divisor) : 0,
    originalCurrency: typeof original.currency_code === 'string' ? original.currency_code : 'USD',
    age: Math.max(0, Math.floor((Date.now() / 1000 - created) / 86400)),
    favorites: Math.max(0, Number(p.num_favorers) || 0),
    // Etsy tabulates views daily; this is a recorded listing value, not demand
    // or a sales estimate. Missing values stay unavailable rather than invented.
    views: typeof p.views === 'number' && Number.isFinite(p.views) && p.views >= 0 ? p.views : null,
    tags: Array.isArray(p.tags) ? p.tags.filter((tag: unknown) => typeof tag === 'string').slice(0, 100).map(decodeEtsyText) : [],
    image: safeImage(image?.url_570xN) || safeImage(image?.url_fullxfull) || safeImage(image?.url_170x135),
    url: 'https://www.etsy.com/listing/' + encodeURIComponent(String(p.listing_id)),
    isDigital, shopId: p.shop_id ? String(p.shop_id) : null,
    shopName: typeof shop?.shop_name === 'string' ? decodeEtsyText(shop.shop_name) : null,
    taxonomyId: p.taxonomy_id ? String(p.taxonomy_id) : null,
    quantity: typeof p.quantity === 'number' ? p.quantity : null,
    state: typeof p.state === 'string' ? p.state : null,
    source: 'etsy', sales: null, score: null,
    category: isDigital ? 'Digital download' : 'Marketplace listing',
  };
}

export async function snapshot(p: any) {
  const day = new Date().toISOString().slice(0, 10);
  await db('listing_snapshots', { method: 'POST', body: { key: p.id + ':' + day, listing_id: p.id, captured_at: new Date().toISOString(), payload: { price: p.price, currency: p.currency, favorites: p.favorites } }, prefer: 'resolution=merge-duplicates,return=minimal' });
  await db('listing_snapshots', { method: 'DELETE', params: { captured_at: 'lt.' + new Date(Date.now() - 30 * 86400000).toISOString() }, prefer: 'return=minimal' });
}
