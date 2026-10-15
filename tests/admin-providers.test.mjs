import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('Retired marketing provider settings cannot read credentials or save new integrations', async () => {
  let activity = 0;
  const module = { exports: {} };
  vm.runInNewContext(ts.transpile(fs.readFileSync('app/api/admin/providers/route.ts', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), {
    exports: module.exports,
    require: name => name === '../../../../lib/admin' ? { json: (data, status) => Response.json(data, { status }) } : new Proxy({}, { get() { activity++; throw Error('Unexpected provider or storage access.'); } }),
    Request, Response,
    fetch: () => { activity++; throw Error('Unexpected provider request.'); },
  });
  for (const method of ['GET', 'POST']) {
    const request = new Request('https://podadd.example/api/admin/providers', { method, ...(method === 'POST' ? { body: JSON.stringify({ action: 'saveEmail', apiKey: 'must-never-be-used' }) } : {}) });
    const response = await module.exports[method](request);
    assert.equal(response.status, 410);
    assert.equal((await response.json()).code, 'FEATURE_RETIRED');
  }
  assert.equal(activity, 0);
});
