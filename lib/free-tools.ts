export type ToolIcon = 'file' | 'keywords' | 'compass' | 'lock' | 'history' | 'email' | 'bookmark' | 'search' | 'info';
export const freeTools = [
  { slug: 'etsy-fee-calculator', title: 'Etsy fee calculator', description: 'Understand an order’s fees, costs and estimated profit with editable regional rates.', icon: 'file' },
  { slug: 'listing-helper', title: 'Listing helper', description: 'Check your own title, tags and description before publishing a listing.', icon: 'keywords' },
  { slug: 'shop-name-generator', title: 'Shop name generator', description: 'Combine your own ideas into a shortlist of memorable shop names.', icon: 'compass' },
  { slug: 'privacy-policy-builder', title: 'Privacy policy draft', description: 'Create an editable starting point that reflects your shop’s data practices.', icon: 'lock' },
  { slug: 'profit-planner', title: 'Profit planner', description: 'Plan orders, expenses and the break-even point using your own numbers.', icon: 'history' },
  { slug: 'email-composer', title: 'Local email draft', description: 'Write and download your own text in this browser. No sending, subscribers, or provider connection.', icon: 'email' },
  { slug: 'followup-reminder', title: 'Local task reminders', description: 'Keep your own references and dates in this browser and export local reminders.', icon: 'history' },
] as const satisfies readonly { slug: string; title: string; description: string; icon: ToolIcon }[];
export type ToolSlug = typeof freeTools[number]['slug'];

export const feePresets = {
  US: { name: 'United States', currency: 'USD', processingPercent: 3, processingFixed: 0.25, regulatoryPercent: 0, listingFee: '0.20', offsiteCap: '100' },
  UK: { name: 'United Kingdom', currency: 'GBP', processingPercent: 4, processingFixed: 0.20, regulatoryPercent: 0.48, listingFee: '', offsiteCap: '' },
  FR: { name: 'France', currency: 'EUR', processingPercent: 4, processingFixed: 0.30, regulatoryPercent: 1.14, listingFee: '', offsiteCap: '' },
  MA: { name: 'Morocco', currency: 'MAD', processingPercent: 4.5, processingFixed: 5, regulatoryPercent: 0, listingFee: '', offsiteCap: '' },
} as const;
export const feeSources = {
  fees: 'https://www.etsy.com/legal/fees/',
  processing: 'https://www.etsy.com/legal/etsy-payments/',
  regulatory: 'https://help.etsy.com/hc/en-gb/articles/1500011073202-What-is-a-Regulatory-Operating-Fee',
};

function nonnegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw Error(`${label} must be a valid non-negative number.`);
  if (value > 1e12) throw Error(`${label} is too large for this planning tool.`);
  return value;
}
function percentage(value: number, label: string) {
  nonnegative(value, label);
  if (value > 100) throw Error(`${label} must be between 0 and 100.`);
  return value;
}
function whole(value: number, label: string) {
  nonnegative(value, label);
  if (!Number.isSafeInteger(value)) throw Error(`${label} must be a whole number.`);
  return value;
}
export function numberInput(value: string, label: string): number {
  if (!value.trim()) throw Error(`Enter ${label.toLowerCase()}.`);
  return nonnegative(Number(value), label);
}

export type FeeInput = {
  price: number; shippingCharged: number; giftWrap: number; buyerTax: number;
  productCost: number; shippingCost: number; listingFee: number; listingUnits: number;
  transactionPercent: number; processingPercent: number; processingFixed: number;
  regulatoryPercent: number; offsitePercent: number; offsiteCap?: number;
  feeTaxPercent: number; otherFees: number;
};
export function calculateEtsyFees(input: FeeInput) {
  for (const [key, value] of Object.entries(input)) if (value !== undefined) nonnegative(value, key);
  for (const key of ['transactionPercent', 'processingPercent', 'regulatoryPercent', 'offsitePercent', 'feeTaxPercent'] as const) percentage(input[key], key);
  whole(input.listingUnits, 'Listing units');
  if (input.listingUnits < 1) throw Error('Listing units must be at least one.');
  const revenue = input.price + input.shippingCharged + input.giftWrap;
  const transaction = revenue * input.transactionPercent / 100;
  const processing = (revenue + input.buyerTax) * input.processingPercent / 100 + input.processingFixed;
  const listing = input.listingFee * input.listingUnits;
  const regulatory = revenue * input.regulatoryPercent / 100;
  const rawOffsite = revenue * input.offsitePercent / 100;
  const offsite = input.offsiteCap === undefined ? rawOffsite : Math.min(rawOffsite, input.offsiteCap);
  const baseFees = transaction + processing + listing + regulatory + offsite;
  const feeTax = baseFees * input.feeTaxPercent / 100;
  const fees = baseFees + feeTax + input.otherFees;
  const costs = input.productCost + input.shippingCost;
  const profit = revenue - fees - costs;
  return { revenue, transaction, processing, listing, regulatory, offsite, feeTax, otherFees: input.otherFees, fees, costs, profit, margin: revenue > 0 ? profit / revenue * 100 : null };
}

export function checkListing(title: string, rawTags: string, description: string) {
  const tags = rawTags.split(/[,\n]/).map(tag => tag.trim()).filter(Boolean);
  const seen = new Set<string>();
  const duplicateTags: string[] = [];
  for (const tag of tags) { const key = tag.toLocaleLowerCase(); if (seen.has(key)) duplicateTags.push(tag); seen.add(key); }
  const titleLength = Array.from(title.trim()).length;
  const longTags = tags.filter(tag => Array.from(tag).length > 20);
  return {
    titleLength, tags, duplicateTags, longTags,
    checks: [
      { label: 'A title is present', ok: titleLength > 0 },
      { label: 'Title is within Etsy’s 140-character limit', ok: titleLength > 0 && titleLength <= 140 },
      { label: 'Between 1 and 13 tags are provided', ok: tags.length > 0 && tags.length <= 13 },
      { label: 'Each tag is at most 20 characters', ok: tags.length > 0 && longTags.length === 0 },
      { label: 'Tags contain no exact duplicates', ok: tags.length > 0 && duplicateTags.length === 0 },
      { label: 'A description is present', ok: description.trim().length > 0 },
    ],
  };
}

export function generateShopNames(seed: string, style: 'studio' | 'craft' | 'modern' = 'studio') {
  const words = seed.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[A-Za-z0-9]+/g)?.slice(0, 4) || [];
  if (!words.length) return [];
  const bases = [...new Set([words.map(word => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(''), ...words.map(word => word[0].toUpperCase() + word.slice(1).toLowerCase())])];
  const suffixes = { studio: ['Studio', 'Atelier', 'Works', 'House', 'Edit', 'Co'], craft: ['Made', 'Craft', 'Workshop', 'Nest', 'Goods', 'Collective'], modern: ['Lab', 'Form', 'Supply', 'Design', 'Lane', 'Space'] }[style];
  const suggestions = bases.flatMap(base => suffixes.map(suffix => base.slice(0, 20 - suffix.length) + suffix)).filter(name => name.length >= 4);
  return [...new Set(suggestions)].slice(0, 18);
}

export type PrivacyInput = { shop: string; operator: string; email: string; country: string; collected: string; purposes: string; sharing: string; retention: string; transfers: string; marketing: boolean; updated: string };
export function privacyDraft(input: PrivacyInput) {
  const value = (text: string, placeholder: string) => text.trim() || `[${placeholder}]`;
  return `PRIVACY POLICY DRAFT — REVIEW BEFORE PUBLICATION\n\n${value(input.shop, 'Shop name')}\nLast updated: ${value(input.updated, 'Date')}\n\n1. Who is responsible\n${value(input.operator, 'Operator’s legal name')}, based in ${value(input.country, 'Country and business address')}, is responsible for the customer information used to run this shop. Contact: ${value(input.email, 'Privacy contact email')}. This draft covers this shop’s own practices; Etsy operates under its separate privacy policy.\n\n2. Information received\n${value(input.collected, 'Describe the actual personal information you receive and its sources.')}\n\n3. Purposes and legal grounds\n${value(input.purposes, 'Describe why you use information and the legal grounds that apply in your jurisdiction.')}\n\n4. Sharing and service providers\n${value(input.sharing, 'List actual recipients, service providers and reasons for sharing information.')}\n\n5. Retention\n${value(input.retention, 'State actual retention periods and legal record-keeping requirements.')}\n\n6. International processing\n${value(input.transfers, 'Describe processing locations, international transfers and safeguards, if applicable.')}\n\n7. Marketing\n${input.marketing ? '[Explain the consent or other lawful basis you use for marketing, your email provider and how recipients unsubscribe.]' : 'This shop does not use customer information for marketing. [Confirm this accurately describes your practices.]'}\n\n8. Your choices and rights\nDepending on the laws that apply to your circumstances, you may have rights to access, correct, delete or restrict the use of your information, object to processing, withdraw consent or complain to a data protection authority. Contact ${value(input.email, 'Privacy contact email')} for requests. [Review which rights and exceptions apply.]\n\n9. Changes\nWe will update this policy when our actual data practices change.\n\nTEMPLATE REVIEW: Replace every bracketed instruction, confirm each statement, and review applicable local laws before publishing. This is a drafting aid, not legal advice or a guarantee of compliance.`;
}

export type ProfitInput = { price: number; orders: number; unitCost: number; feePercent: number; feePerOrder: number; fixedCosts: number; marketingCosts: number; refunds: number };
export function planProfit(input: ProfitInput) {
  for (const [key, value] of Object.entries(input)) nonnegative(value, key);
  whole(input.orders, 'Orders'); percentage(input.feePercent, 'Fee percentage');
  const gross = input.price * input.orders;
  const variableCosts = input.unitCost * input.orders;
  const fees = gross * input.feePercent / 100 + input.feePerOrder * input.orders;
  const fixed = input.fixedCosts + input.marketingCosts;
  const contribution = input.price - input.unitCost - input.feePerOrder - input.price * input.feePercent / 100;
  const revenue = gross - input.refunds;
  const profit = revenue - variableCosts - fees - fixed;
  return { gross, revenue, variableCosts, fees, fixed, profit, contribution, breakEvenOrders: contribution > 0 ? Math.ceil((fixed + input.refunds) / contribution) : null, margin: revenue > 0 ? profit / revenue * 100 : null };
}

export function safePublicUrl(value: string): string {
  if (/[\u0000-\u001f\u007f]/.test(value)) throw Error('Use a URL without control characters.');
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw Error('Enter a complete HTTPS URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || value.length > 2000) throw Error('Use a complete public HTTPS URL without account credentials.');
  return url.toString();
}
export type EmailInput = { kind: 'launch' | 'offer' | 'restock' | 'announcement'; shop: string; product: string; details: string; link: string; address: string; unsubscribe: string };
export function composeEmail(input: EmailInput) {
  const shop = input.shop.trim() || '[Shop name]';
  const product = input.product.trim() || '[Product or announcement]';
  const subjects = { launch: `Introducing ${product}`, offer: `An offer from ${shop}`, restock: `${product} is back`, announcement: `A note from ${shop}` };
  const intros = { launch: `We have something new to share: ${product}.`, offer: `Here is our current offer on ${product}.`, restock: `${product} is available again.`, announcement: `Here is what is new at ${shop}: ${product}.` };
  const link = input.link.trim() ? safePublicUrl(input.link) : '[Add your product or website link]';
  const unsubscribe = input.unsubscribe.trim() ? safePublicUrl(input.unsubscribe) : '[Add a working unsubscribe link]';
  return { subject: subjects[input.kind], body: `Hello,\n\n${intros[input.kind]}\n\n${input.details.trim() || '[Add accurate product details, dates or offer conditions.]'}\n\nTake a look: ${link}\n\nThank you,\n${shop}\n\n${input.address.trim() || '[Add your valid business postal address]'}\nUnsubscribe: ${unsubscribe}` };
}

export type Reminder = { id: string; reference: string; due: string; note: string; completed: boolean };
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function parseReminders(value: string): Reminder[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is Reminder => !!item && typeof item === 'object' && typeof item.id === 'string' && item.id.length <= 128 && typeof item.reference === 'string' && !!item.reference.trim() && item.reference.length <= 100 && typeof item.due === 'string' && validDate(item.due) && typeof item.note === 'string' && item.note.length <= 1000 && typeof item.completed === 'boolean').slice(0, 500);
}
export function csvExport(rows: (string | number)[][]) {
  return rows.map(row => row.map(value => {
    let text = String(value);
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  }).join(',')).join('\r\n');
}
export function reminderCalendar(reminders: Reminder[], generatedAt = new Date()) {
  const escape = (value: string) => value.replaceAll('\\', '\\\\').replaceAll('\r', '').replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
  const stamp = generatedAt.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
  const events = reminders.filter(reminder => !reminder.completed && validDate(reminder.due)).map(reminder => [
    'BEGIN:VEVENT', `UID:${escape(reminder.id)}@png-scout`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${reminder.due.replaceAll('-', '')}`, `SUMMARY:${escape('Task: ' + reminder.reference)}`, `DESCRIPTION:${escape(reminder.note)}`, 'END:VEVENT',
  ].join('\r\n'));
  const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//podadd//Local tasks//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
  // Calendar content lines are folded at 75 UTF-8 octets, without breaking an
  // emoji or other multibyte character. Continuation lines start with a space.
  const encoder = new TextEncoder();
  return content.split('\r\n').map(line => {
    let folded = ''; let bytes = 0;
    for (const char of line) {
      const size = encoder.encode(char).length;
      if (bytes + size > 75) { folded += '\r\n '; bytes = 1; }
      folded += char; bytes += size;
    }
    return folded;
  }).join('\r\n') + '\r\n';
}
