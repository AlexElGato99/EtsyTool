import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), {
    exports: module.exports, require: name => imports[name] || {},
    Request, Response, URL, AbortSignal, ...globals,
  });
  return module.exports;
}

function setup(respond, configured = true) {
  const requests = [];
  const cache = new Map();
  const etsy = load('lib/etsy.ts', {
    './settings': {
      readSetting: async () => configured,
      decryptCredentials: async () => configured ? { key: 'test-key', secret: 'secret-not-for-users' } : null,
    },
    './supabase': { db: async (_resource, options) => {
      if (options.method === 'POST') { cache.set(options.body.key, options.body.payload); return null; }
      if (options.method === 'DELETE') return null;
      const payload = cache.get(options.params.key.slice(3));
      return payload ? [{ payload }] : [];
    } },
  }, { fetch: async (url, options) => {
    assert.equal(url.origin, 'https://openapi.etsy.com');
    requests.push({ url, options });
    const value = await respond(url, options);
    return value instanceof Response ? value : Response.json(value);
  } });
  const search = load('lib/search-options.ts', { './etsy': etsy });
  const api = load('lib/api.ts', { './etsy': etsy, './admin': { json: (data, status = 200) => Response.json(data, { status }) } });
  const options = params => search.searchOptionsFrom(new Request('https://scout.example/api/products?' + new URLSearchParams(params)));
  return { etsy, search, api, requests, cache, options };
}

const listing = (id = 42) => ({
  listing_id: id, shop_id: 99, title: 'Real listing', description: 'Seller description', type: 'download',
  price: { amount: 499, divisor: 100, currency_code: 'USD' }, tags: ['png', 'floral'], num_favorers: 17,
});

test('Marketplace browse and documented filters are parsed without requiring keywords', () => {
  const { options } = setup(() => ({}));
  assert.equal(options({}).q, '');
  assert.equal(options({}).sortOn, 'created');
  assert.equal(options({ q: 'floral png' }).sortOn, 'score');
  const parsed = options({ q: 'floral', min_price: '.50', max_price: '10.00', currency: 'eur', buyer_country: 'gb', taxonomy_id: '123', shop_location: 'London', is_safe: 'false', sort_on: 'price', sort_order: 'ascending' });
  assert.equal(parsed.minPrice, '0.5');
  assert.equal(parsed.maxPrice, '10');
  assert.equal(parsed.currency, 'EUR');
  assert.equal(parsed.buyerCountry, 'GB');
  assert.equal(parsed.sortOrder, 'up');
  assert.equal(parsed.isSafe, false);
});

test('Invalid filters and pagination are rejected before an Etsy request', () => {
  const { options, requests } = setup(() => ({}));
  for (const params of [
    { mode: 'private' }, { offset: '-1' }, { offset: '12001' }, { offset: '1.5' }, { limit: '0' }, { limit: '101' },
    { min_price: '-1' }, { max_price: 'NaN' }, { min_price: '10', max_price: '2' }, { taxonomy_id: '0' },
    { currency: 'EU' }, { buyer_country: 'USA' }, { is_safe: 'yes' }, { sort_on: 'sales' }, { sort_order: 'bad' },
    { shop_location: 'City\nInjected' },
  ]) assert.throws(() => options(params), error => error.status === 400);
  assert.equal(options({ offset: '12000', limit: '100' }).offset, 12000);
  assert.equal(requests.length, 0);
});

test('Etsy links are parsed locally and arbitrary hosts, credentials, and invalid IDs are rejected', () => {
  const { search, options } = setup(() => ({}));
  assert.equal(search.listingIdFrom('https://www.etsy.com/uk/listing/12345/design?ref=search'), '12345');
  assert.equal(search.listingIdFrom('etsy.com/listing/12345'), '12345');
  assert.equal(search.shopFrom('https://www.etsy.com/shop/RealShop').shopName, 'RealShop');
  assert.equal(search.shopFrom('000123').shopId, '123');
  for (const input of [
    'https://evil.example/listing/123', 'https://etsy.com.evil.example/listing/123',
    'https://name:secret@www.etsy.com/listing/123', 'javascript:alert(1)',
    'https://etsy.com:8443/listing/123', '0', '-1', '9223372036854775808',
  ]) assert.throws(() => search.listingIdFrom(input), error => error.status === 400);
  const parsed = options({ mode: 'listing', q: '123, https://etsy.com/listing/456/name\n123' });
  assert.equal(parsed.listingIds.join(','), '123,456');
  assert.throws(() => options({ mode: 'listing', q: Array.from({ length: 101 }, (_, index) => index + 1).join(',') }), error => error.status === 400);
});

test('Marketplace results hydrate real images through the documented batch endpoint and preserve original currency', async () => {
  const { etsy, options, requests } = setup(url => {
    if (url.pathname.endsWith('/listings/active')) return { count: 60, results: [listing()] };
    return { count: 1, results: [{ ...listing(), converted_price: { amount: 460, divisor: 100, currency_code: 'EUR' }, images: [{ url_570xN: 'https://i.etsystatic.com/real.jpg' }], shop: { shop_name: 'RealShop' } }] };
  });
  const result = await etsy.cachedProducts(options({ q: 'floral', min_price: '1', max_price: '10', currency: 'EUR', buyer_country: 'GB', taxonomy_id: '12', shop_location: 'London', sort_on: 'price', sort_order: 'up' }));
  const searchParams = requests[0].url.searchParams;
  assert.equal(searchParams.get('keywords'), 'floral');
  assert.equal(searchParams.get('min_price'), '1');
  assert.equal(searchParams.get('buyer_country'), 'GB');
  assert.equal(searchParams.get('includes'), null);
  assert.equal(requests[1].url.pathname, '/v3/application/listings/batch');
  assert.equal(requests[1].url.searchParams.get('includes'), 'Images,Shop');
  assert.equal(requests[1].url.searchParams.get('listing_ids'), '42');
  const product = result.results[0];
  assert.equal(product.image, 'https://i.etsystatic.com/real.jpg');
  assert.equal(product.price, 4.6);
  assert.equal(product.currency, 'EUR');
  assert.equal(product.originalPrice, 4.99);
  assert.equal(product.originalCurrency, 'USD');
  assert.equal(product.shopName, 'RealShop');
  assert.equal(product.sales, null);
  assert.equal(result.hasMore, true);
  assert(!JSON.stringify(result).includes('secret-not-for-users'));
});

test('Caching reuses identical searches and keeps filters isolated', async () => {
  const { etsy, options, requests } = setup(url => ({ count: 1, results: [listing()] }));
  const first = await etsy.cachedProducts(options({ q: 'floral', min_price: '1' }));
  const repeated = await etsy.cachedProducts(options({ q: 'floral', min_price: '1' }));
  assert.equal(first.cached, false);
  assert.equal(repeated.cached, true);
  assert.equal(requests.length, 2);
  await etsy.cachedProducts(options({ q: 'floral', min_price: '2' }));
  assert.equal(requests.length, 4);
});

test('Shop search resolves an exact name and forwards only supported shop filters', async () => {
  const { etsy, options, requests } = setup(url => {
    if (url.pathname.endsWith('/shops')) return { results: [{ shop_id: 98, shop_name: 'RealShopExtra' }, { shop_id: 99, shop_name: 'RealShop' }] };
    if (url.pathname.endsWith('/sections')) return { results: [{ shop_section_id: 7, title: 'Downloads', active_listing_count: 12 }] };
    return { count: 1, results: [listing()] };
  });
  const result = await etsy.cachedProducts(options({ mode: 'shop', q: 'realshop', keywords: 'floral', currency: 'EUR', min_price: '1', sort_on: 'price', sort_order: 'up' }));
  const request = requests.find(item => item.url.pathname.endsWith('/shops/99/listings/active'));
  assert(request);
  assert.equal(request.url.searchParams.get('keywords'), 'floral');
  assert.equal(request.url.searchParams.get('sort_on'), 'price');
  assert.equal(request.url.searchParams.get('currency'), null);
  assert.equal(request.url.searchParams.get('min_price'), null);
  assert.equal(result.shop.name, 'RealShop');
  assert.equal(result.shop.sections[0].id, '7');
});

test('A partial shop-name match never researches the wrong shop', async () => {
  const { etsy, options, requests } = setup(() => ({ results: [{ shop_id: 99, shop_name: 'RealShopExtra' }] }));
  await assert.rejects(etsy.cachedProducts(options({ mode: 'shop', q: 'RealShop' })), error => error.status === 404);
  assert.equal(requests.length, 1);
});

test('Featured shop listings and sections use their documented endpoints and parameters', async () => {
  const { etsy, options, requests } = setup(url => {
    if (url.pathname.endsWith('/shops/99')) return { shop_id: 99, shop_name: 'RealShop' };
    if (url.pathname.endsWith('/sections')) return { results: [] };
    return { count: 1, results: [listing()] };
  });
  await etsy.cachedProducts(options({ mode: 'shop', q: '99', shop_view: 'featured', keywords: 'ignored', sort_on: 'price' }));
  const featured = requests.find(item => item.url.pathname.endsWith('/listings/featured')).url;
  assert.equal([...featured.searchParams.keys()].sort().join(','), 'limit,offset');
  await etsy.cachedProducts(options({ mode: 'shop', q: '99', shop_view: 'section', shop_section_ids: '7,8', keywords: 'ignored', sort_on: 'price' }));
  const section = requests.find(item => item.url.pathname.endsWith('/shop-sections/listings')).url;
  assert.equal(section.searchParams.get('shop_section_ids'), '7,8');
  assert.equal(section.searchParams.get('keywords'), null);
});

test('Single and batch lookup use fixed API paths and return every requested listing', async () => {
  const { etsy, options, requests } = setup(url => url.pathname.endsWith('/listings/batch') ? { count: 2, results: [listing(42), listing(43)] } : listing(42));
  const single = await etsy.cachedProducts(options({ mode: 'listing', q: 'https://www.etsy.com/listing/42/seller-design?ref=x' }));
  assert.equal(requests[0].url.pathname, '/v3/application/listings/42');
  assert.equal(single.count, 1);
  const batch = await etsy.cachedProducts(options({ mode: 'listing', q: '42,43', limit: '1' }));
  assert.equal(requests[1].url.searchParams.get('listing_ids'), '42,43');
  assert.equal(batch.results.length, 2);
  assert.equal(batch.limit, 2);
  assert.equal(batch.hasMore, false);
});

test('Pagination stops at the official 12,000 offset bound and score always sorts downward', async () => {
  const { etsy, options, requests } = setup(() => ({ count: 20000, results: [listing()] }));
  const result = await etsy.cachedProducts(options({ q: 'floral', offset: '12000', sort_on: 'score', sort_order: 'up' }));
  assert.equal(result.hasMore, false);
  assert.equal(requests[0].url.searchParams.get('sort_order'), 'down');
});

test('Taxonomy loads documented seller categories, flattens paths, and is cached', async () => {
  const { etsy, requests } = setup(() => ({ results: [{ id: 1, name: 'Art', children: [{ id: 2, name: 'Digital prints', children: [] }] }] }));
  const result = await etsy.cachedTaxonomy();
  assert.equal(requests[0].url.pathname, '/v3/application/seller-taxonomy/nodes');
  assert.equal(result.categories[1].path, 'Art / Digital prints');
  assert.equal((await etsy.cachedTaxonomy()).cached, true);
  assert.equal(requests.length, 1);
});

test('Public errors hide integration details while owner diagnostics remain available', async () => {
  const { etsy, api } = setup(() => new Response('{}', { status: 403 }));
  let error;
  try { await etsy.etsy('listings/active'); } catch (caught) { error = caught; }
  assert.equal(error.status, 403);
  const publicResponse = api.errorResponse(error);
  assert.equal(publicResponse.status, 503);
  assert(!JSON.stringify(await publicResponse.json()).match(/credentials|approval|secret-not-for-users/i));
  const ownerResponse = api.errorResponse(error, { admin: true });
  assert.equal(ownerResponse.status, 403);
  assert.match((await ownerResponse.json()).error, /credentials/);
  const missing = setup(() => ({}), false);
  await assert.rejects(missing.etsy.cachedSearch('floral'), error => error.status === 503);
  assert.equal(missing.requests.length, 0);
});

test('Missing listings produce actionable 404 errors and unsupported resources never fetch', async () => {
  const { etsy, requests } = setup(() => new Response('{}', { status: 404 }));
  await assert.rejects(etsy.etsy('listings/42'), error => error.status === 404 && /link or ID/.test(error.message));
  await assert.rejects(etsy.etsy('https://evil.example/steal'), error => error.status === 400);
  await assert.rejects(etsy.etsy('../outside'), error => error.status === 400);
  assert.equal(requests.length, 1);
});

test('Seller text decodes common entities and valid Unicode without throwing on invalid references', () => {
  const { etsy } = setup(() => ({}));
  assert.equal(etsy.decodeEtsyText('Art &amp; &#39;flowers&#39; &#x1F338; &quot;PNG&quot;'), 'Art & \'flowers\' 🌸 "PNG"');
  const invalid = '&#0; &#55296; &#xDFFF; &#1114112; &#x110000; &#999999999999999999999999999999999999;';
  assert.equal(etsy.decodeEtsyText(invalid), invalid);
  const product = etsy.normalizeListing({ ...listing(), title: 'Art &amp; Prints', description: '&lt;script&gt;literal seller text&lt;/script&gt;', tags: ['art &amp; craft'], shop: { shop_name: 'Shop &amp; Co' } });
  assert.equal(product.title, 'Art & Prints');
  assert.equal(product.description, '<script>literal seller text</script>');
  assert.equal(product.tags[0], 'art & craft');
  assert.equal(product.shopName, 'Shop & Co');
});

test('Empty batch responses retain a positive page size', async () => {
  const { etsy, options } = setup(() => ({ count: 0, results: [] }));
  const result = await etsy.cachedProducts(options({ mode: 'listing', q: '42,43' }));
  assert.equal(result.count, 0);
  assert.equal(result.limit, 1);
  assert.equal(result.hasMore, false);
});

test('Watchlist save and refresh preserve seller metadata from Etsy, not caller-supplied product data', async () => {
  for (const action of ['save', 'refresh']) {
    const { etsy, api, search, requests } = setup(() => ({ ...listing(), shop: { shop_name: 'RealShop' }, images: [{ url_570xN: 'https://i.etsystatic.com/real.jpg' }] }));
    const writes = [];
    const route = load('app/api/watchlist/route.ts', {
      '../../../lib/supabase': { db: async (_resource, options) => {
        if (options.method === 'POST') { writes.push(options.body); return null; }
        return action === 'refresh' ? [{ listing_id: '42' }] : [];
      } },
      '../../../lib/api': {
        userAccess: async () => ({ userId: 'verified-user' }),
        researchAccess: async () => ({ userId: 'verified-user' }),
        parseBody: request => request.json(), errorResponse: api.errorResponse,
      },
      '../../../lib/etsy': etsy,
      '../../../lib/search-options': search,
      '../../../lib/admin': { json: (data, status = 200) => Response.json(data, { status }), sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin },
    });
    const response = await route.POST(new Request('https://scout.example/api/watchlist', {
      method: 'POST', headers: { origin: 'https://scout.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id: '42', userId: 'other-account', product: { title: 'Forged', shopName: 'ForgedShop' } }),
    }));
    assert.equal(response.status, 200);
    assert.equal(requests[0].url.searchParams.get('includes'), 'Images,Shop');
    assert.equal(writes[0].user_id, 'verified-user');
    assert.equal(writes[0].payload.title, 'Real listing');
    assert.equal(writes[0].payload.shopName, 'RealShop');
    assert.equal((await response.json()).product.shopName, 'RealShop');
  }
});
