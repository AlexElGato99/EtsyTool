import { ApiError } from './etsy';

export const MAX_SEARCH_OFFSET = 12000;
const MAX_ID = 9223372036854775807n;

export type SearchOptions = {
  mode: 'marketplace' | 'shop' | 'listing';
  q: string;
  keywords?: string;
  listingIds?: string[];
  shopId?: string;
  shopName?: string;
  shopView: 'active' | 'featured' | 'section';
  sectionIds?: string[];
  limit: number;
  offset: number;
  sortOn: 'created' | 'updated' | 'price' | 'score';
  sortOrder: 'up' | 'down';
  minPrice?: string;
  maxPrice?: string;
  taxonomyId?: string;
  location?: string;
  currency?: string;
  buyerCountry?: string;
  isSafe: boolean;
};

function fail(message: string): never { throw new ApiError(400, message); }

export function positiveId(value: string, label = 'ID'): string {
  if (!/^\d{1,19}$/.test(value) || BigInt(value) < 1n || BigInt(value) > MAX_ID) fail(`Enter a valid ${label}.`);
  return String(BigInt(value));
}

function etsyPath(value: string): string {
  try {
    const input = /^(?:www\.)?etsy\.com\//i.test(value) ? 'https://' + value : value;
    const url = new URL(input);
    if (!['https:', 'http:'].includes(url.protocol) || !['etsy.com', 'www.etsy.com'].includes(url.hostname.toLowerCase()) || url.port || url.username || url.password || value.length > 1000) fail('Use a link from etsy.com.');
    return url.pathname;
  } catch {
    return fail('Use a valid Etsy link or numeric ID.');
  }
}

export function listingIdFrom(value: string): string {
  if (/^\d+$/.test(value)) return positiveId(value, 'listing ID');
  const match = etsyPath(value).match(/^\/(?:[A-Za-z-]{2,8}\/)?listing\/(\d+)(?:\/|$)/);
  if (!match) fail('Use an Etsy listing link or numeric listing ID.');
  return positiveId(match[1], 'listing ID');
}

export function shopFrom(value: string): { shopId?: string; shopName?: string } {
  if (/^\d+$/.test(value)) return { shopId: positiveId(value, 'shop ID') };
  let shopName = value;
  if (/[/:.]/.test(value)) {
    const match = etsyPath(value).match(/^\/(?:[A-Za-z-]{2,8}\/)?shop\/([A-Za-z0-9]+)(?:\/|$)/);
    if (!match) fail('Use an Etsy shop link, shop name, or numeric shop ID.');
    shopName = match[1];
  }
  if (!/^[A-Za-z0-9]{1,50}$/.test(shopName)) fail('Enter the exact Etsy shop name, its shop link, or numeric ID.');
  return { shopName };
}

function integer(params: URLSearchParams, key: string, fallback: number, min: number, max: number): number {
  const raw = params.get(key);
  if (raw === null || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) fail(`Enter a valid ${key}.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${key === 'offset' ? 'Page offset' : 'Results per page'} must be between ${min} and ${max.toLocaleString('en-US')}.`);
  return value;
}

function optionalText(params: URLSearchParams, key: string, max: number): string | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return undefined;
  if (/[\u0000-\u001f\u007f]/.test(raw) || raw.trim().length > max) fail(`Enter a valid ${key.replaceAll('_', ' ')}.`);
  return raw.trim();
}

function price(params: URLSearchParams, key: string): string | undefined {
  const value = optionalText(params, key, 30);
  if (value === undefined) return undefined;
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) || !Number.isFinite(Number(value))) fail('Prices must be valid non-negative amounts.');
  return String(Number(value));
}

// Only documented Etsy parameters are forwarded. An empty marketplace query
// is a browse request; shop keywords are separate from the shop locator.
export function searchOptionsFrom(request: Request): SearchOptions {
  const params = new URL(request.url).searchParams;
  const mode = params.get('mode') || 'marketplace';
  if (!['marketplace', 'shop', 'listing'].includes(mode)) fail('Choose a supported search method.');
  const q = (params.get('q') || '').trim();
  if (q.length > (mode === 'listing' ? 8000 : mode === 'shop' ? 1000 : 100)) fail('The search is too long. Use shorter links or listing IDs.');
  if (mode !== 'listing' && /[\u0000-\u001f\u007f]/.test(q)) fail('Enter a valid search.');
  const sortOn = params.get('sort_on') || ((mode === 'marketplace' && q) ? 'score' : 'created');
  if (!['created', 'updated', 'price', 'score'].includes(sortOn)) fail('Choose a valid sort option.');
  const rawOrder = params.get('sort_order') || 'down';
  if (!['asc', 'ascending', 'desc', 'descending', 'up', 'down'].includes(rawOrder)) fail('Choose a valid sort order.');
  const shopView = params.get('shop_view') || 'active';
  if (!['active', 'featured', 'section'].includes(shopView)) fail('Choose a valid shop view.');
  const options: SearchOptions = {
    mode: mode as SearchOptions['mode'], q,
    shopView: shopView as SearchOptions['shopView'],
    limit: integer(params, 'limit', 24, 1, 100),
    offset: integer(params, 'offset', 0, 0, MAX_SEARCH_OFFSET),
    sortOn: sortOn as SearchOptions['sortOn'],
    sortOrder: ['asc', 'ascending', 'up'].includes(rawOrder) ? 'up' : 'down',
    isSafe: true,
  };
  if (mode === 'listing') {
    if (!q) fail('Enter an Etsy listing link or ID.');
    const values = q.split(/[\s,]+/).filter(Boolean);
    if (values.length > 100) fail('Look up no more than 100 listings at a time.');
    options.listingIds = [...new Set(values.map(listingIdFrom))];
    return options;
  }
  if (mode === 'shop') {
    if (!q) fail('Enter an Etsy shop name, link, or ID.');
    Object.assign(options, shopFrom(q));
    options.keywords = optionalText(params, 'keywords', 100);
    if (shopView === 'section') {
      const ids = optionalText(params, 'shop_section_ids', 2000);
      if (!ids) fail('Choose a shop section.');
      const values = ids.split(',').map(value => value.trim());
      if (values.length > 100) fail('Choose no more than 100 shop sections.');
      options.sectionIds = [...new Set(values.map(value => positiveId(value, 'shop section ID')))];
    }
    return options;
  }
  options.minPrice = price(params, 'min_price');
  options.maxPrice = price(params, 'max_price');
  if (options.minPrice !== undefined && options.maxPrice !== undefined && Number(options.minPrice) > Number(options.maxPrice)) fail('Minimum price cannot exceed maximum price.');
  const taxonomy = optionalText(params, 'taxonomy_id', 19);
  if (taxonomy) options.taxonomyId = positiveId(taxonomy, 'category');
  options.location = optionalText(params, 'shop_location', 100);
  const currency = optionalText(params, 'currency', 3)?.toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) fail('Use a three-letter currency code such as USD or EUR.');
  options.currency = currency;
  const country = optionalText(params, 'buyer_country', 2)?.toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country)) fail('Use a two-letter country code such as US or GB.');
  options.buyerCountry = country;
  const safe = params.get('is_safe');
  if (safe !== null && !['true', 'false', '1', '0'].includes(safe)) fail('Choose a valid mature-content setting.');
  options.isSafe = safe === null || safe === 'true' || safe === '1';
  return options;
}
