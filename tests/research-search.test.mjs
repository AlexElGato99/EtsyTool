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

// The application no longer requests marketplace data; test retained compatibility paths fail closed.
test('Retired search, taxonomy and snapshot helpers never read cache or call Etsy', async () => {
  let activity = 0;
  const etsy = load('lib/etsy.ts', { './settings': { readSetting: async () => { activity++; }, decryptCredentials: async () => { activity++; } }, './supabase': { db: async () => { activity++; } } }, { fetch: async () => { activity++; } });
  for (const action of [() => etsy.etsy('listings/active'), () => etsy.etsy('listings/42'), () => etsy.cachedProducts({ mode: 'marketplace' }), () => etsy.cachedSearch('original'), () => etsy.cachedTaxonomy(), () => etsy.snapshot({ id: '42' })]) await assert.rejects(action(), error => error.status === 410);
  assert.equal(activity, 0);
});
for (const resource of ['products', 'keywords', 'taxonomy', 'history', 'watchlist']) {
  test(`Retired ${resource} API returns 410 before identity, cache or data access`, async () => {
    let activity = 0; const fail = async () => { activity++; throw Error('Unexpected access'); };
    const route = load(`app/api/${resource}/route.ts`, { '../../../lib/admin': { json: (data, status = 200) => Response.json(data, { status }) }, '../../../lib/api': { userAccess: fail, researchAccess: fail }, '../../../lib/supabase': { db: fail } }, { fetch: fail });
    for (const method of ['GET', 'POST']) { const response = await route[method](new Request(`https://podadd.example/api/${resource}?q=original&id=42`, { method })); assert.equal(response.status, 410); assert.equal((await response.json()).code, 'FEATURE_RETIRED'); }
    assert.equal(activity, 0);
  });
}
test('Seller text decoding preserves Unicode and treats markup as plain text', () => {
  const etsy = load('lib/etsy.ts', {});
  assert.equal(etsy.decodeEtsyText('Own &amp; &#39;original&#39; &#x1F338;'), "Own & 'original' " + String.fromCodePoint(0x1F338));
  assert.equal(etsy.decodeEtsyText('&lt;script&gt;literal text&lt;/script&gt;'), '<script>literal text</script>');
  assert.equal(etsy.decodeEtsyText('&#0; &#55296; &#xDFFF; &#1114112;'), '&#0; &#55296; &#xDFFF; &#1114112;');
});
test('Private error details remain hidden from public error responses', async () => {
  const { etsy, api } = setup(() => ({})); const error = new etsy.ApiError(403, 'Owner credentials require review.', 'etsy');
  const publicResponse = api.errorResponse(error); assert.equal(publicResponse.status, 503); assert(!JSON.stringify(await publicResponse.json()).includes('credentials'));
  assert.equal(api.errorResponse(error, { admin: true }).status, 403);
});
test('Direct Supabase browser grants cannot expose retained legacy listing data', () => {
  const setupSql = fs.readFileSync('supabase/setup.sql', 'utf8'); const migration = fs.readFileSync('supabase/etsy-review-migration.sql', 'utf8');
  assert(!/grant\s+select\s+on\s+public\.watchlist\s+to\s+authenticated/i.test(setupSql)); assert(/revoke all on public\.watchlist,public\.research_cache,public\.listing_snapshots from anon,authenticated/i.test(migration));
  assert(!/delete\s+from|truncate/i.test(migration));
});
