import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), { module: ts.ModuleKind.CommonJS }), {
    exports: module.exports,
    require: name => imports[name] || {},
    Response, Request, URL,
    ...globals,
  });
  return module.exports;
}

function setup(authFetch) {
  const writes = [];
  const auth = load('lib/auth.ts', {
    'next/headers': { cookies: async () => ({ set: (...args) => writes.push(args) }) },
    './supabase': { authFetch },
  }, { process: { env: { NODE_ENV: 'production' } } });
  const admin = load('lib/admin.ts', { './auth': auth });
  const actions = load('lib/auth-actions.ts', {
    './admin': admin,
    './supabase': { authFetch },
    './auth': auth,
  });
  return { ...actions, writes };
}

function credentials(body, origin = 'https://scout.example') {
  return new Request('https://scout.example/api/auth/signup', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('Signup rejects short passwords before contacting the auth service', async () => {
  let calls = 0;
  const { credentialsAction, writes } = setup(async () => { calls++; });
  const response = await credentialsAction(credentials({ email: 'creator@example.com', password: 'short' }), true);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /at least 8 characters/);
  assert.equal(calls, 0);
  assert.equal(writes.length, 0);
});

test('Successful password login writes secure HTTP-only session cookies', async () => {
  const calls = [];
  const { credentialsAction, writes } = setup(async (path, options) => {
    calls.push([path, options]);
    return Response.json({ access_token: 'verified-access', refresh_token: 'verified-refresh' });
  });
  const response = await credentialsAction(credentials({ email: 'creator@example.com', password: 'long-password' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(calls[0][0], 'token?grant_type=password');
  assert.equal(calls[0][1].body.email, 'creator@example.com');
  assert.equal(writes.length, 2);
  assert.equal(writes[0][0], 'scout_access');
  assert.equal(writes[1][0], 'scout_refresh');
  assert(writes.every(([, , options]) => options.httpOnly && options.secure && options.sameSite === 'lax'));
});

test('Signup requiring email confirmation does not establish a session', async () => {
  let path;
  const { credentialsAction, writes } = setup(async value => {
    path = value;
    return Response.json({ user: { id: 'unconfirmed-user', email: 'creator@example.com' } });
  });
  const response = await credentialsAction(credentials({ email: 'creator@example.com', password: 'long-password' }), true);
  const result = await response.json();
  assert.equal(path, 'signup');
  assert.equal(result.ok, true);
  assert.equal(result.confirmationRequired, true);
  assert.equal(writes.length, 0);
});

test('Auth failures do not expose upstream messages or tokens', async () => {
  const { credentialsAction, writes } = setup(async () => Response.json({ error: 'Internal key: private-secret', access_token: 'sensitive-token' }, { status: 401 }));
  const response = await credentialsAction(credentials({ email: 'creator@example.com', password: 'long-password' }));
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.equal(result.error, 'Unable to sign in. Check your email, password, and email confirmation.');
  assert(!JSON.stringify(result).includes('private-secret'));
  assert(!JSON.stringify(result).includes('sensitive-token'));
  assert.equal(writes.length, 0);
});

test('Cross-origin login and signup requests are rejected before authentication', async () => {
  let calls = 0;
  const { credentialsAction, writes } = setup(async () => { calls++; });
  for (const signup of [false, true]) {
    const response = await credentialsAction(credentials({ email: 'creator@example.com', password: 'long-password' }, 'https://untrusted.example'), signup);
    assert.equal(response.status, 403);
  }
  assert.equal(calls, 0);
  assert.equal(writes.length, 0);
});
