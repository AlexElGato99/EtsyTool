import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), { module: ts.ModuleKind.CommonJS }), {
    exports: module.exports,
    require: name => imports[name] || {},
    Request,
    Response,
    URL,
  });
  return module.exports;
}

function contactHelper(readSetting = async () => null) {
  return load('lib/public-contact.ts', { './settings': { readSetting }, './brand': load('lib/brand.ts', {}) });
}

test('Public contact rejects unsafe mailto input and invalid operator names', () => {
  const { validatePublicContact } = contactHelper();
  for (const email of [
    'javascript:alert(1)',
    'you@example.com?subject=unexpected',
    'you@example.com#fragment',
    'you%0D%0A@example.com',
    'you@example.com\r\nBcc:other@example.com',
    'you..name@example.com',
    'you@-example.com',
    'you@example..com',
    `${'a'.repeat(65)}@example.com`,
  ]) assert.equal(validatePublicContact({ email, operatorName: 'podadd' }), null);
  for (const operatorName of ['', '  ', 'x'.repeat(101), 'Operator\nInjected']) {
    assert.equal(validatePublicContact({ email: 'you@example.com', operatorName }), null);
  }
  assert.equal(validatePublicContact(null), null);
  const valid = validatePublicContact({ email: ' contact+support@example.com ', operatorName: ' podadd ' });
  assert.equal(valid.email, 'contact+support@example.com');
  assert.equal(valid.operatorName, 'podadd');
});

test('Public contact reads only the allowlisted public setting and falls back safely', async () => {
  const reads = [];
  let stored = { email: 'support@example.com', operatorName: 'Scout Operator', secret: 'must-not-leak' };
  const helper = contactHelper(async key => {
    reads.push(key);
    return stored;
  });
  let result = await helper.getPublicContact();
  assert.equal(result.email, 'support@example.com');
  assert.equal(result.operatorName, 'Scout Operator');
  assert.equal(Object.keys(result).length, 2);
  assert(!JSON.stringify(result).includes('must-not-leak'));
  for (const operatorName of ['PNG Scout', 'png-scout', 'podadd', 'PODADD']) {
    stored = { email: 'support@example.com', operatorName };
    assert.equal((await helper.getPublicContact()).operatorName, 'AYOUB CHIBANE');
    assert.equal((await helper.getPublicContact()).email, 'support@example.com');
  }
  stored = { email: 'support@example.com', operatorName: 'Custom Operator Ltd' };
  assert.equal((await helper.getPublicContact()).operatorName, 'Custom Operator Ltd');
  stored = { email: 'you@example.com?bcc=other@example.com', operatorName: 'podadd' };
  result = await helper.getPublicContact();
  assert.equal(result.email, 'elgatoa82@gmail.com');
  assert.equal(result.operatorName, 'AYOUB CHIBANE');
  assert(reads.every(key => key === 'publicContact'));
  const unavailable = contactHelper(async () => { throw Error('Database unavailable'); });
  assert.equal((await unavailable.getPublicContact()).email, 'elgatoa82@gmail.com');
  assert.equal((await unavailable.getPublicContact()).operatorName, 'AYOUB CHIBANE');
});

function settingsRoute(owner = true) {
  const writes = [];
  const reads = [];
  const contact = contactHelper();
  const route = load('app/api/admin/settings/route.ts', {
    '../../../../lib/api': { parseBody: request => request.json() },
    '../../../../lib/admin': {
      isOwner: async () => owner,
      sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin,
      json: (data, status = 200) => Response.json(data, { status }),
    },
    '../../../../lib/settings': {
      publicSettings: async () => ({ name: 'podadd' }),
      readSetting: async key => { reads.push(key); return key === 'etsy_credentials' ? { secret: 'integration-secret' } : null; },
      writeSetting: async (key, value) => { writes.push({ key, value }); },
    },
    '../../../../lib/public-contact': contact,
  });
  return { route, writes, reads };
}

function post(body, origin = 'https://scout.example') {
  return new Request('https://scout.example/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin },
    body: JSON.stringify(body),
  });
}

test('Only the owner on the same origin can save public contact settings', async () => {
  const body = { action: 'publicContact', email: 'support@example.com', operatorName: 'podadd' };
  const denied = settingsRoute(false);
  assert.equal((await denied.route.GET()).status, 403);
  assert.equal((await denied.route.POST(post(body))).status, 403);
  assert.equal(denied.reads.length, 0);
  assert.equal(denied.writes.length, 0);
  const owner = settingsRoute();
  assert.equal((await owner.route.POST(post(body, 'https://evil.example'))).status, 403);
  assert.equal(owner.writes.length, 0);
  assert.equal((await owner.route.POST(post({ ...body, email: 'support@example.com?bcc=other@example.com' }))).status, 400);
  assert.equal(owner.writes.length, 0);
  const saved = await owner.route.POST(post({ ...body, email: ' support@example.com ', operatorName: ' podadd ' }));
  assert.equal(saved.status, 200);
  assert.equal(owner.writes.length, 1);
  assert.equal(owner.writes[0].key, 'publicContact');
  assert.equal(owner.writes[0].value.email, 'support@example.com');
  assert.equal(owner.writes[0].value.operatorName, 'podadd');
});

test('Admin settings return contact details and credential status without integration secrets', async () => {
  const { route } = settingsRoute();
  const response = await route.GET();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.publicContact.email, 'elgatoa82@gmail.com');
  assert.equal(result.publicContact.operatorName, 'AYOUB CHIBANE');
  assert.equal(result.credentialsSaved, true);
  assert(!JSON.stringify(result).includes('integration-secret'));
});
