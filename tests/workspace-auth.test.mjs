import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpile(fs.readFileSync(path, 'utf8'), {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  });
  vm.runInNewContext(code, {
    exports: module.exports,
    require: name => imports[name] || {},
    Response, Request, URL,
    ...globals,
  });
  return module.exports;
}

function setup(initialCookies, responder) {
  const values = new Map(Object.entries(initialCookies));
  const writes = [];
  const calls = [];
  const jar = {
    get: name => values.has(name) ? { value: values.get(name) } : undefined,
    set: (name, value, options) => { values.set(name, value); writes.push([name, value, options]); },
  };
  const headers = { cookies: async () => jar };
  const globals = { process: { env: { NODE_ENV: 'production' } } };
  const auth = load('lib/auth.ts', {
    'next/headers': headers,
    './supabase': { authFetch: async (path, options) => { calls.push([path, options]); return responder(path, options); } },
  }, globals);
  const route = load('app/workspace/session-refresh/route.ts', {
    'next/headers': headers,
    '../../../lib/auth': auth,
  }, globals);
  const component = () => null;
  const page = load('app/workspace/page.tsx', {
    '../../lib/auth': auth,
    '../../components/workspace': { __esModule: true, default: component },
    'next/navigation': { redirect: location => { const error = new Error('Redirect'); error.location = location; throw error; } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
  });
  return { auth, route, page, component, values, writes, calls };
}

const request = () => new Request('https://scout.example/workspace/session-refresh?next=https://untrusted.example');

test('Workspace renders only a remotely verified email without refreshing or writing cookies', async () => {
  const fixture = setup({ scout_access: 'valid-access', scout_refresh: 'refresh-token' }, async () => Response.json({ id: 'verified-user', email: 'creator@example.com', role: 'authenticated' }));
  const result = await fixture.page.default();
  assert.equal(result.type, fixture.component);
  assert.equal(result.props.email, 'creator@example.com');
  assert.deepEqual(Object.keys(result.props), ['email']);
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0][0], 'user');
  assert.equal(fixture.writes.length, 0);
});

test('Missing access token with a refresh cookie redirects to the fixed handler without mutations', async () => {
  const fixture = setup({ scout_refresh: 'refresh-token' }, async () => { throw new Error('No auth request expected'); });
  await assert.rejects(fixture.page.default(), error => error.location === '/workspace/session-refresh');
  assert.equal(fixture.calls.length, 0);
  assert.equal(fixture.writes.length, 0);
});

test('Expired access is not trusted and RSC defers all refresh work to the handler', async () => {
  const fixture = setup({ scout_access: 'expired-access', scout_refresh: 'refresh-token' }, async () => new Response('{}', { status: 401 }));
  await assert.rejects(fixture.page.default(), error => error.location === '/workspace/session-refresh');
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0][0], 'user');
  assert.equal(fixture.writes.length, 0);
  assert.equal(fixture.values.get('scout_access'), 'expired-access');
});

test('Forged access or malformed successful identity does not expose the workspace', async () => {
  for (const responder of [async () => new Response('{}', { status: 401 }), async () => Response.json({ email: 'creator@example.com' })]) {
    const fixture = setup({ scout_access: 'forged-access' }, responder);
    await assert.rejects(fixture.page.default(), error => error.location === '/login');
    assert.equal(fixture.writes.length, 0);
  }
});

test('Refresh verifies the new access token, sets secure cookies, and ignores redirect parameters', async () => {
  const fixture = setup({ scout_access: 'expired-access', scout_refresh: 'refresh-token' }, async (path, options) => {
    if (path.startsWith('token')) return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh' });
    return options.token === 'new-access'
      ? Response.json({ id: 'verified-user', email: 'creator@example.com' })
      : new Response('{}', { status: 401 });
  });
  const response = await fixture.route.GET(request());
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://scout.example/workspace');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(fixture.values.get('scout_access'), 'new-access');
  assert.equal(fixture.values.get('scout_refresh'), 'new-refresh');
  assert.equal(fixture.calls.at(-1)[0], 'user');
  assert.equal(fixture.calls.at(-1)[1].token, 'new-access');
  const marker = fixture.writes.find(([name]) => name === fixture.auth.WORKSPACE_REFRESH_COOKIE);
  assert.equal(marker[2].path, '/workspace');
  assert.equal(marker[2].maxAge, 120);
  assert(fixture.writes.every(([, , options]) => options.httpOnly && options.secure && options.sameSite === 'lax'));
  const writeCount = fixture.writes.length;
  assert.equal((await fixture.page.default()).props.email, 'creator@example.com');
  assert.equal(fixture.writes.length, writeCount);
});

test('Failed refresh clears the session and subsequent requests go to login without a loop', async () => {
  const fixture = setup({ scout_access: 'expired-access', scout_refresh: 'invalid-refresh' }, async () => new Response('{}', { status: 401 }));
  const response = await fixture.route.GET(request());
  assert.equal(response.headers.get('location'), 'https://scout.example/login');
  assert.equal(fixture.values.get('scout_access'), '');
  assert.equal(fixture.values.get('scout_refresh'), '');
  await assert.rejects(fixture.page.default(), error => error.location === '/login');
  const callCount = fixture.calls.length;
  const repeated = await fixture.route.GET(request());
  assert.equal(repeated.headers.get('location'), 'https://scout.example/login');
  assert.equal(fixture.calls.length, callCount);
  assert.equal(fixture.calls.filter(([path]) => path.startsWith('token')).length, 1);
});

test('Access rejected immediately after a successful refresh cannot trigger another refresh loop', async () => {
  let rejectNewAccess = false;
  const fixture = setup({ scout_access: 'expired-access', scout_refresh: 'refresh-token' }, async (path, options) => {
    if (path.startsWith('token')) return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh' });
    if (options.token === 'new-access' && !rejectNewAccess) return Response.json({ id: 'verified-user', email: 'creator@example.com' });
    return new Response('{}', { status: 401 });
  });
  assert.equal((await fixture.route.GET(request())).headers.get('location'), 'https://scout.example/workspace');
  rejectNewAccess = true;
  await assert.rejects(fixture.page.default(), error => error.location === '/login');
  const response = await fixture.route.GET(request());
  assert.equal(response.headers.get('location'), 'https://scout.example/login');
  assert.equal(fixture.calls.filter(([path]) => path.startsWith('token')).length, 1);
});

test('An unavailable auth service denies workspace access without exposing configuration', async () => {
  const fixture = setup({ scout_access: 'access-token', scout_refresh: 'refresh-token' }, async () => { throw new Error('Internal configuration: private-secret'); });
  const response = await fixture.route.GET(request());
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://scout.example/login');
  assert.equal(await response.text(), '');
  await assert.rejects(fixture.page.default(), error => error.location === '/login');
});
