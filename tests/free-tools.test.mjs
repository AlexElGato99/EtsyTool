import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const module = { exports: {} };
vm.runInNewContext(ts.transpile(fs.readFileSync('lib/free-tools.ts', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), { exports: module.exports, URL, TextEncoder });
const tools = module.exports;
const feeInput = { price: 20, shippingCharged: 0, giftWrap: 0, buyerTax: 0, productCost: 4, shippingCost: 0, listingFee: .20, listingUnits: 1, transactionPercent: 6.5, processingPercent: 3, processingFixed: .25, regulatoryPercent: 0, offsitePercent: 0, offsiteCap: 100, feeTaxPercent: 0, otherFees: 0 };
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);

test('US fee calculation separates fees, entered costs and profit', () => {
  const result = tools.calculateEtsyFees(feeInput);
  close(result.transaction, 1.30); close(result.processing, .85); close(result.fees, 2.35);
  close(result.profit, 13.65); close(result.margin, 68.25);
});

test('Shipping, wrapping and buyer tax use their correct separate fee bases', () => {
  const result = tools.calculateEtsyFees({ ...feeInput, shippingCharged: 5, giftWrap: 2, buyerTax: 3, shippingCost: 4 });
  close(result.revenue, 27); close(result.transaction, 1.755); close(result.processing, 1.15);
  close(result.costs, 8);
  close(result.profit, 27 - 1.755 - 1.15 - .2 - 8);
});

test('Offsite ad cap, allocated listing units and fee tax are modeled explicitly', () => {
  const result = tools.calculateEtsyFees({ ...feeInput, price: 1000, offsitePercent: 15, listingUnits: 3, feeTaxPercent: 20, otherFees: 2 });
  close(result.offsite, 100); close(result.listing, .6);
  close(result.feeTax, (65 + 30.25 + .6 + 100) * .2);
  close(result.fees, 65 + 30.25 + .6 + 100 + result.feeTax + 2);
  assert.equal(tools.feePresets.UK.listingFee, '');
  assert.equal(tools.feePresets.MA.offsiteCap, '');
});

test('Invalid financial inputs and fractional order counts never produce misleading output', () => {
  for (const value of [-1, NaN, Infinity, 1e100]) assert.throws(() => tools.calculateEtsyFees({ ...feeInput, price: value }));
  assert.throws(() => tools.calculateEtsyFees({ ...feeInput, processingPercent: 101 }));
  assert.throws(() => tools.calculateEtsyFees({ ...feeInput, listingUnits: 1.5 }));
  assert.throws(() => tools.numberInput('', 'Price'));
  assert.equal(tools.calculateEtsyFees({ ...feeInput, price: 0 }).margin, null);
});

test('Listing checks report boundaries, duplicate tags and missing content without a ranking score', () => {
  const result = tools.checkListing('🌸'.repeat(141), 'floral print, Floral Print, this tag is definitely too long', '');
  assert.equal(result.titleLength, 141); assert.equal(result.duplicateTags.length, 1); assert.equal(result.longTags.length, 1);
  assert.equal(result.checks.find(check => check.label.includes('140')).ok, false);
  assert.equal(result.checks.at(-1).ok, false);
  assert(!('score' in result));
  assert.equal(tools.checkListing('A real print', 'floral, print', 'Details of the item.').checks.every(check => check.ok), true);
});

test('Shop names are deterministic, unique, valid alphanumeric lengths and based on the entered seed', () => {
  const first = tools.generateShopNames('Willow Paper', 'studio');
  assert.equal(JSON.stringify(first), JSON.stringify(tools.generateShopNames('Willow Paper', 'studio')));
  assert(first.every(name => /^[A-Za-z0-9]{4,20}$/.test(name)));
  assert(first.some(name => name.includes('Willow')));
  assert.equal(new Set(first).size, first.length);
  assert.equal(tools.generateShopNames('!!').length, 0);
  assert(tools.generateShopNames('Extremelylongmeaningfulbrandname', 'modern').some(name => name.endsWith('Lab')));
});

test('Privacy drafts preserve missing-detail review instructions and do not claim compliance', () => {
  const input = { shop: 'Willow Paper', operator: 'Owner', email: 'owner@example.com', country: '', collected: '', purposes: '', sharing: '', retention: '', transfers: '', marketing: true, updated: '2026-10-11' };
  const draft = tools.privacyDraft(input);
  assert.match(draft, /Willow Paper/); assert.match(draft, /owner@example.com/);
  assert.match(draft, /\[Describe/); assert.match(draft, /lawful basis/); assert.match(draft, /not legal advice or a guarantee/);
});

test('Profit planner computes break-even and leaves impossible or undefined metrics unavailable', () => {
  const input = { price: 20, orders: 50, unitCost: 5, feePercent: 10, feePerOrder: 1, fixedCosts: 100, marketingCosts: 20, refunds: 0 };
  const result = tools.planProfit(input);
  close(result.contribution, 12); close(result.profit, 480); assert.equal(result.breakEvenOrders, 10);
  assert.equal(tools.planProfit({ ...input, unitCost: 25 }).breakEvenOrders, null);
  assert.equal(tools.planProfit({ ...input, orders: 0 }).margin, null);
  assert.throws(() => tools.planProfit({ ...input, orders: 1.5 }));
});

test('Email composer produces an editable draft with accurate user content and review placeholders', () => {
  const result = tools.composeEmail({ kind: 'launch', shop: 'Willow Paper', product: 'Floral printable', details: 'Three files included.', link: 'https://www.etsy.com/listing/123/name', address: '', unsubscribe: '' });
  assert.equal(result.subject, 'Introducing Floral printable');
  assert.match(result.body, /Three files included/); assert.match(result.body, /working unsubscribe link/); assert.match(result.body, /valid business postal address/);
  assert.throws(() => tools.composeEmail({ kind: 'offer', shop: 'Shop', product: 'Print', details: '', link: 'javascript:alert(1)', address: '', unsubscribe: '' }));
});

test('Manual draft links reject unsafe schemes, embedded credentials, and control characters', () => {
  assert.equal(tools.safePublicUrl('https://example.com/item?x=1'), 'https://example.com/item?x=1');
  for (const source of ['javascript:alert(1)', 'https://user:pass@example.com/item', 'file:///private/image.jpg', 'https://exa\nmple.com/image']) assert.throws(() => tools.safePublicUrl(source));
});

test('Reminder restoration validates dates and data shape; calendar export skips completed tasks and escapes text', () => {
  assert.equal(tools.validDate('2026-02-30'), false); assert.equal(tools.validDate('2024-02-29'), true);
  const open = { id: 'task-1', reference: 'Order, 1042', due: '2026-10-15', note: 'Check; delivery\nContact if needed', completed: false };
  const complete = { ...open, id: 'task-2', completed: true };
  assert.equal(tools.parseReminders(JSON.stringify([open, { ...open, due: 'bad' }, { ...open, completed: 'false' }])).length, 1);
  const calendar = tools.reminderCalendar([open, complete], new Date('2026-10-11T10:00:00Z'));
  assert.match(calendar, /DTSTART;VALUE=DATE:20261015/); assert.match(calendar, /DTSTAMP:20261011T100000Z/);
  assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.match(calendar, /Order\\, 1042/); assert.match(calendar, /Check\\; delivery\\n/);
  const long = tools.reminderCalendar([{ ...open, note: '🌸'.repeat(100) }]);
  assert(long.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75));
});

test('CSV export escapes quotes and neutralizes spreadsheet formula injection', () => {
  const csv = tools.csvExport([['Order "one"', '=SUM(A1:A2)', ' @payload', 'normal']]);
  assert.equal(csv, '"Order ""one""","\'=SUM(A1:A2)","\' @payload","normal"');
});

test('The public catalog exposes manual preparation tools without retired marketing or analytics functions', () => {
  assert.deepEqual(Array.from(tools.freeTools, tool => tool.slug), ['etsy-fee-calculator', 'listing-helper', 'shop-name-generator', 'privacy-policy-builder', 'profit-planner', 'email-composer', 'followup-reminder']);
  for (const retired of ['pinterestShare', 'etsyListingUrl', 'planAds', 'compareVariants']) assert.equal(tools[retired], undefined);
});
