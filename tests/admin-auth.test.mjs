import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }), {
    exports: module.exports, require: name => imports[name] || {}, Response, Request, URL, ...globals,
  });
  return module.exports;
}

function setup(initialCookies, responder, membership = async (_resource, options) => options.params.user_id === 'eq.verified-owner' ? [{ user_id: 'verified-owner' }] : []) {
  const values = new Map(Object.entries(initialCookies));
  const writes = [];
  const authCalls = [];
  const dbCalls = [];
  const jar = {
    get: name => values.has(name) ? { value: values.get(name) } : undefined,
    set: (name, value, options) => { values.set(name, value); writes.push([name, value, options]); },
  };
  const headers = { cookies: async () => jar };
  const globals = { process: { env: { NODE_ENV: 'production' } } };
  const auth = load('lib/auth.ts', {
    'next/headers': headers,
    './supabase': { authFetch: async (path, options) => { authCalls.push([path, options]); return responder(path, options); } },
  }, globals);
  const admin = load('lib/admin.ts', {
    './auth': auth,
    './supabase': { db: async (resource, options) => { dbCalls.push([resource, options]); return membership(resource, options); } },
  });
  const route = load('app/admin/session-refresh/route.ts', {
    'next/headers': headers, '../../../lib/auth': auth,
  }, globals);
  const component = () => null;
  const element = (type, props) => ({ type, props });
  const page = load('app/admin/page.tsx', {
    '../../lib/auth': auth,
    '../../lib/admin': admin,
    '../../components/admin-dashboard': { __esModule: true, default: component },
    '../../components/site-icon': { BrandMark: () => null },
    'react-icons/pi': { PiArrowRightBold: () => null, PiHouseBold: () => null, PiLockKeyBold: () => null },
    'next/navigation': { redirect: location => { const error = new Error('Redirect'); error.location = location; throw error; } },
    'react/jsx-runtime': { jsx: element, jsxs: element },
  });
  return { auth, admin, route, page, component, values, writes, authCalls, dbCalls };
}

const request = () => new Request('https://scout.example/admin/session-refresh?next=https://untrusted.example');

function children(node) {
  if (!node || typeof node !== 'object') return [];
  const list = Array.isArray(node.props?.children) ? node.props.children : [node.props?.children];
  return list.filter(value => value !== undefined);
}

function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of children(node)) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return undefined;
}

test('Admin page verifies user ID membership before exposing only the owner email to the dashboard', async () => {
  const fixture = setup({ scout_access: 'verified-access', scout_refresh: 'refresh-token' }, async () => Response.json({ id: 'verified-owner', email: 'owner@example.com' }));
  const result = await fixture.page.default();
  assert.equal(result.type, fixture.component);
  assert.equal(result.props.email, 'owner@example.com');
  assert.deepEqual(Object.keys(result.props), ['email']);
  assert.equal(fixture.authCalls.length, 1);
  assert.equal(fixture.authCalls[0][0], 'user');
  assert.equal(fixture.dbCalls.length, 1);
  assert.equal(fixture.dbCalls[0][0], 'app_admins');
  assert.equal(fixture.dbCalls[0][1].params.user_id, 'eq.verified-owner');
  assert.equal(fixture.dbCalls[0][1].params.select, 'user_id');
  assert.equal(fixture.writes.length, 0);
});

test('Signed-out and forged identities never query admin membership or render the dashboard', async () => {
  for (const cookies of [{}, { scout_access: 'forged-access' }]) {
    const fixture = setup(cookies, async () => new Response('{}', { status: 401 }));
    await assert.rejects(fixture.page.default(), error => error.location === '/login');
    assert.equal(fixture.dbCalls.length, 0);
    assert.equal(fixture.writes.length, 0);
  }
});

test('Matching an owner email does not authorize an ordinary Supabase user ID', async () => {
  const fixture = setup({ scout_access: 'ordinary-access' }, async () => Response.json({ id: 'ordinary-user', email: 'owner@example.com' }));
  const result = await fixture.page.default();
  assert.equal(result.type, 'main');
  assert(find(result, node => node === 'Access restricted'));
  assert(!find(result, node => node?.type === fixture.component));
  assert(find(result, node => node?.type === 'a' && node.props.href === '/workspace'));
  assert(find(result, node => node?.type === 'a' && node.props.href === '/'));
  assert(!JSON.stringify(result).includes('owner@example.com'));
  assert.equal(fixture.dbCalls[0][1].params.user_id, 'eq.ordinary-user');
  assert(fixture.dbCalls.every(([resource]) => resource === 'app_admins'));
});

test('Unmatched membership rows and database failures deny access without leaking details', async () => {
  for (const membership of [async () => [{ user_id: 'somebody-else' }], async () => { throw new Error('Database secret: private-secret'); }]) {
    const fixture = setup({ scout_access: 'verified-access' }, async () => Response.json({ id: 'verified-owner', email: 'owner@example.com' }), membership);
    const result = await fixture.page.default();
    assert(find(result, node => node === 'Access restricted'));
    assert(!find(result, node => node?.type === fixture.component));
    assert(!JSON.stringify(result).includes('private-secret'));
  }
});

test('Expired or missing access defers admin refresh to the fixed handler without writing cookies', async () => {
  for (const cookies of [{ scout_refresh: 'refresh-token' }, { scout_access: 'expired-access', scout_refresh: 'refresh-token' }]) {
    const fixture = setup(cookies, async () => new Response('{}', { status: 401 }));
    await assert.rejects(fixture.page.default(), error => error.location === '/admin/session-refresh');
    assert.equal(fixture.writes.length, 0);
    assert.equal(fixture.dbCalls.length, 0);
    assert(fixture.authCalls.every(([path]) => path === 'user'));
  }
});

test('Admin and workspace refresh guards use independent cookies', async () => {
  const fixture = setup({ scout_refresh: 'refresh-token', scout_workspace_refresh_attempt: '1' }, async () => { throw new Error('No auth request expected'); });
  await assert.rejects(fixture.page.default(), error => error.location === '/admin/session-refresh');
  fixture.values.set(fixture.auth.WORKSPACE_REFRESH_COOKIE, '');
  fixture.values.set(fixture.auth.ADMIN_REFRESH_COOKIE, '1');
  await assert.rejects(fixture.page.default(), error => error.location === '/login');
  assert.equal((await fixture.auth.getPageUser()).refreshRequired, true);
  assert.equal(fixture.authCalls.length, 0);
  assert.equal(fixture.writes.length, 0);
});

test('Successful admin refresh verifies the new token and returns only to the fixed admin page', async () => {
  const fixture = setup({ scout_access: 'expired-access', scout_refresh: 'refresh-token' }, async (path, options) => {
    if (path.startsWith('token')) return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh' });
    return options.token === 'new-access' ? Response.json({ id: 'verified-owner', email: 'owner@example.com' }) : new Response('{}', { status: 401 });
  });
  const response = await fixture.route.GET(request());
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://scout.example/admin');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(fixture.authCalls.at(-1)[0], 'user');
  assert.equal(fixture.authCalls.at(-1)[1].token, 'new-access');
  const marker = fixture.writes.find(([name]) => name === fixture.auth.ADMIN_REFRESH_COOKIE);
  assert.equal(marker[2].path, '/admin');
  assert.equal(marker[2].maxAge, 120);
  assert(fixture.writes.every(([, , options]) => options.httpOnly && options.secure && options.sameSite === 'lax'));
  assert.equal((await fixture.page.default()).type, fixture.component);
  assert.equal(fixture.dbCalls.length, 1);
});

test('Failed admin refresh clears sessions and subsequent page/handler requests cannot loop', async () => {
  const fixture = setup({ scout_access: 'expired-access', scout_refresh: 'invalid-refresh' }, async () => new Response('{}', { status: 401 }));
  assert.equal((await fixture.route.GET(request())).headers.get('location'), 'https://scout.example/login');
  assert.equal(fixture.values.get('scout_access'), '');
  assert.equal(fixture.values.get('scout_refresh'), '');
  await assert.rejects(fixture.page.default(), error => error.location === '/login');
  assert.equal((await fixture.route.GET(request())).headers.get('location'), 'https://scout.example/login');
  assert.equal(fixture.authCalls.filter(([path]) => path.startsWith('token')).length, 1);
  assert.equal(fixture.dbCalls.length, 0);
});

test('A refreshed admin token immediately rejected by verification cannot trigger another refresh', async () => {
  let rejectNewAccess = false;
  const fixture = setup({ scout_access: 'expired-access', scout_refresh: 'refresh-token' }, async (path, options) => {
    if (path.startsWith('token')) return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh' });
    if (options.token === 'new-access' && !rejectNewAccess) return Response.json({ id: 'verified-owner', email: 'owner@example.com' });
    return new Response('{}', { status: 401 });
  });
  assert.equal((await fixture.route.GET(request())).headers.get('location'), 'https://scout.example/admin');
  rejectNewAccess = true;
  await assert.rejects(fixture.page.default(), error => error.location === '/login');
  assert.equal((await fixture.route.GET(request())).headers.get('location'), 'https://scout.example/login');
  assert.equal(fixture.authCalls.filter(([path]) => path.startsWith('token')).length, 1);
  assert.equal(fixture.dbCalls.length, 0);
});
