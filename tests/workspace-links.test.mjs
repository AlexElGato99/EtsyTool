import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpile(fs.readFileSync(path, 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true });
  vm.runInNewContext(code, { exports: module.exports, require: name => imports[name] || {}, Request, Response, URL, URLSearchParams, ...globals });
  return module.exports;
}
const links = load('lib/workspace-link.ts');

test('Only allowlisted workspace deep links survive destination parsing', () => {
  for (const destination of [
    '/workspace?section=drafts', '/workspace?section=connections', '/workspace?section=tools',
    '/workspace?section=connections&connection=etsy&result=connected',
    '/workspace?section=connections&connection=etsy&result=cancelled',
    '/workspace?section=connections&connection=etsy&result=failed',
  ]) assert.equal(links.safeWorkspaceDestination(destination), destination);
  assert.equal(links.safeWorkspaceDestination('/workspace?result=connected&connection=etsy&section=connections'), '/workspace?section=connections&connection=etsy&result=connected');
});

test('External, nested, ambiguous, and unrecognized destinations fall back to the workspace', () => {
  for (const destination of [
    undefined, null, {}, 42, '', 'https://outside.example/workspace', 'https://scout.example/workspace',
    '//outside.example/workspace', '/admin', '/workspace/admin', '/workspace/', '/workspace/../admin',
    '/%77orkspace?section=keywords', '/workspace#connections', '/workspace?section=keywords#admin',
    '/workspace?next=/admin', '/workspace?next=' + encodeURIComponent('/workspace?section=keywords'),
    '/workspace?section=keywords&redirect=https://outside.example',
    '/workspace?section=keywords&section=connections', '/workspace?mode=shop&mode=listing',
    '/workspace?section=admin', '/workspace?mode=unknown', '/workspace?connection=other', '/workspace?result=error',
    '/workspace\\outside', '/workspace?section=keywords\r\nLocation: https://outside.example',
    '/workspace?q=%00', '/workspace?q=%7f',
  ]) assert.equal(links.safeWorkspaceDestination(destination), '/workspace', String(destination));
});

test('Retired research and marketing destinations cannot restore removed workspace tools', () => {
  for (const destination of [
    '/workspace?section=keywords', '/workspace?section=saved', '/workspace?section=campaigns',
    '/workspace?section=listings&mode=shop&q=ExampleShop', '/workspace?q=' + 'a'.repeat(8000),
    '/workspace?section=connections&connection=pinterest', '/workspace?section=connections&connection=email',
    '/workspace?section=drafts&result=connected&result=failed',
  ]) assert.equal(links.safeWorkspaceDestination(destination), '/workspace');
});

test('Authentication and refresh links preserve a safe destination while retaining default routes', () => {
  const destination = '/workspace?section=drafts';
  for (const mode of ['login', 'signup']) {
    const href = links.workspaceAuthHref(mode, destination);
    assert.equal(new URL(href, 'https://scout.example').pathname, '/' + mode);
    assert.equal(new URL(href, 'https://scout.example').searchParams.get('next'), destination);
    assert.equal(links.workspaceAuthHref(mode, '/workspace'), '/' + mode);
    assert.equal(links.workspaceAuthHref(mode, 'https://outside.example'), '/' + mode);
  }
  assert.equal(new URL(links.workspaceRefreshHref(destination), 'https://scout.example').searchParams.get('next'), destination);
  assert.equal(links.workspaceRefreshHref('/workspace'), '/workspace/session-refresh');
});

function workspaceFixture({ user = null, refreshRequired = false, refreshed = null, marker = false } = {}) {
  const cookieWrites = [];
  const jar = { get: () => marker ? { value: '1' } : undefined, set: (...args) => cookieWrites.push(args) };
  const auth = { WORKSPACE_REFRESH_COOKIE: 'scout_workspace_refresh_attempt', getPageUser: async () => ({ user, refreshRequired }), getUser: async () => refreshed, clearSession: async () => {} };
  const route = load('app/workspace/session-refresh/route.ts', { 'next/headers': { cookies: async () => jar }, '../../../lib/auth': auth, '../../../lib/workspace-link': links }, { process: { env: { NODE_ENV: 'production' } } });
  const page = load('app/workspace/page.tsx', {
    '../../lib/auth': auth, '../../lib/workspace-link': links,
    '../../components/workspace': { __esModule: true, default: 'Workspace' },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'next/navigation': { redirect: location => { const error = new Error('Redirect'); error.location = location; throw error; } },
  });
  return { page, route, cookieWrites };
}

test('Signed-out workspace requests retain the selected feature through sign-in or refresh', async () => {
  const destination = '/workspace?section=tools';
  for (const refreshRequired of [false, true]) {
    const fixture = workspaceFixture({ refreshRequired });
    const expected = refreshRequired ? links.workspaceRefreshHref(destination) : links.workspaceAuthHref('login', destination);
    await assert.rejects(fixture.page.default({ searchParams: Promise.resolve({ section: 'tools' }) }), error => error.location === expected);
    assert.equal(fixture.cookieWrites.length, 0);
  }
});

test('The verified workspace still receives only the remotely verified email', async () => {
  const fixture = workspaceFixture({ user: { userId: 'verified-user', email: 'creator@example.com' } });
  const result = await fixture.page.default({ searchParams: Promise.resolve({ section: 'connections' }) });
  assert.equal(result.type, 'Workspace');
  assert.deepEqual(Object.keys(result.props), ['email']);
  assert.equal(result.props.email, 'creator@example.com');
  assert.equal(fixture.cookieWrites.length, 0);
});

test('Session refresh retains safe queries on success, failure, and already-attempted refresh', async () => {
  const destination = '/workspace?section=connections&connection=etsy&result=connected';
  const request = () => new Request('https://scout.example' + links.workspaceRefreshHref(destination));
  for (const marker of [false, true]) {
    for (const valid of [false, true]) {
      const identity = valid ? { userId: 'verified-user', email: 'creator@example.com' } : null;
      const fixture = workspaceFixture({ marker, user: identity, refreshed: identity });
      const response = await fixture.route.GET(request());
      assert.equal(response.status, 303);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('location'), 'https://scout.example' + (valid ? destination : links.workspaceAuthHref('login', destination)));
    }
  }
});

test('Invalid workspace page and refresh destinations cannot become open redirects', async () => {
  const fixture = workspaceFixture({ refreshed: { userId: 'verified-user', email: 'creator@example.com' } });
  await assert.rejects(fixture.page.default({ searchParams: Promise.resolve({ next: 'https://outside.example', section: 'keywords' }) }), error => error.location === '/login');
  for (const next of ['https://outside.example', '/admin', '/workspace?next=/admin']) {
    const response = await fixture.route.GET(new Request('https://scout.example/workspace/session-refresh?next=' + encodeURIComponent(next)));
    assert.equal(response.headers.get('location'), 'https://scout.example/workspace');
  }
});

function authFixture(mode, next, confirmationRequired = false) {
  const state = []; let cursor = 0; const effects = []; const destinations = [];
  const react = { useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = value; }]; }, useEffect: callback => effects.push(callback) };
  const window = { location: { search: '?next=' + encodeURIComponent(next), assign: value => destinations.push(value) } };
  const component = load('components/auth-form.tsx', {
    react, '../lib/workspace-link': links, 'next/link': { __esModule: true, default: 'Link' },
    '../lib/terms-version': load('lib/terms-version.ts'),
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  }, {
    window,
    FormData: class { get(name) { return { email: 'creator@example.com', password: 'long-password', confirmPassword: 'long-password', acceptTerms: 'on' }[name]; } },
    fetch: async () => Response.json({ ok: true, confirmationRequired }),
  });
  function render() { cursor = 0; return component.default({ mode }); }
  let tree = render(); effects.splice(0).forEach(effect => effect()); tree = render();
  return { getTree: render, tree, destinations };
}
function findNodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(item => findNodes(item, predicate));
  return [...(predicate(tree) ? [tree] : []), ...findNodes(tree.props?.children, predicate)];
}

test('Switching sign-in/signup and successful authentication preserve the feature destination', async () => {
  const destination = '/workspace?section=drafts';
  for (const mode of ['login', 'signup']) {
    const fixture = authFixture(mode, destination);
    const switched = findNodes(fixture.tree, node => node.type === 'Link' && node.props.href.startsWith(mode === 'login' ? '/signup' : '/login'));
    assert.equal(switched[0].props.href, links.workspaceAuthHref(mode === 'login' ? 'signup' : 'login', destination));
    const form = findNodes(fixture.tree, node => node.type === 'form')[0];
    await form.props.onSubmit({ preventDefault() {}, currentTarget: {} });
    assert.equal(fixture.destinations[0], destination);
  }
});

test('Email confirmation offers sign-in with the retained destination and unsafe next values are ignored', async () => {
  const destination = '/workspace?section=connections';
  const fixture = authFixture('signup', destination, true);
  await findNodes(fixture.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {}, currentTarget: { reset() {} } });
  const confirmationLink = findNodes(fixture.getTree(), node => node.type === 'Link' && node.props.className === 'button button-secondary')[0];
  assert.equal(confirmationLink.props.href, links.workspaceAuthHref('login', destination));
  assert.equal(fixture.destinations.length, 0);
  const unsafe = authFixture('login', 'https://outside.example');
  await findNodes(unsafe.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {}, currentTarget: {} });
  assert.equal(unsafe.destinations[0], '/workspace');
});
