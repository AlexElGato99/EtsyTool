import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function component() {
  const module = { exports: {} };
  const code = ts.transpile(fs.readFileSync('components/own-listing-review.tsx', 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX });
  vm.runInNewContext(code, {
    exports: module.exports,
    require: name => name.endsWith('.css') ? {} : require(name),
    Intl,
    fetch: () => { throw Error('A read-only listing reference must not make requests.'); },
  });
  return module.exports.OwnListingReview;
}
const listing = {
  id: '1234', title: 'My original notebook', description: 'First line\n<script>alert("untrusted")</script>',
  tags: ['linen notebook', '<b>plain text</b>'], state: 'active', url: 'https://www.etsy.com/listing/1234',
  images: [], price: { amount: 12.5, currency: 'USD' },
};

test('Own listing references render returned text safely without interpreting markup or offering data-transfer actions', () => {
  const html = renderToStaticMarkup(React.createElement(component(), { listing }));
  assert(html.includes('My original notebook'));
  assert(html.includes('linen notebook'));
  assert(html.includes('&lt;script&gt;')); assert(!html.includes('<script>'));
  assert(html.includes('&lt;b&gt;plain text&lt;/b&gt;'));
  assert.match(html, /12\.50/);
  assert.match(html, /<details[\s>]/); assert.match(html, /<summary[\s>]/);
  assert(html.includes('href="https://www.etsy.com/listing/1234"'));
  assert(!/<(?:form|textarea|input|button)[\s>]/.test(html));
});

test('Private draft listings show manual editing guidance without a broken public listing link', () => {
  const html = renderToStaticMarkup(React.createElement(component(), { listing: { ...listing, state: 'draft', description: '', tags: [], price: null } }));
  assert(!html.includes('href="https://www.etsy.com/listing/1234"'));
  assert.match(html, /Shop Manager/i);
  assert(!html.includes('12.50'));
  assert(!html.includes('undefined')); assert(!html.includes('NaN'));
});
