import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('The retired shortcut has no permissions, background code, or executable popup content',()=>{
  const manifest=JSON.parse(fs.readFileSync('extension/png-scout/manifest.json','utf8'));
  assert.equal(manifest.manifest_version,3);
  assert.match(manifest.name,/retired/i);
  for(const field of ['permissions','optional_permissions','host_permissions','optional_host_permissions','background','content_scripts','externally_connectable']) assert.equal(manifest[field],undefined,field);
  const html=fs.readFileSync('extension/png-scout/popup.html','utf8');
  assert.match(html,/shortcut[\s\S]*retired/i);
  assert.match(html,/Remove this extension/);
  assert.match(html,/connect-src 'none'/);
  assert.doesNotMatch(html,/<script\b|<iframe\b|<form\b|<a\b|<img\b/i);
});

test('The retained retirement script cannot access tabs, storage, navigation, or network services',()=>{
  const calls=[];
  const blocked=new Proxy(()=>{}, {get:(_,name)=>{calls.push(String(name));throw Error('Unexpected browser or network access');},apply:()=>{calls.push('call');throw Error('Unexpected function call');}});
  vm.runInNewContext(fs.readFileSync('extension/png-scout/popup.js','utf8'),{chrome:blocked,fetch:blocked,XMLHttpRequest:blocked,document:blocked,window:blocked,localStorage:blocked});
  assert.deepEqual(calls,[]);
});

test('Extension ZIP distribution has been withdrawn',()=>{
  for(const archive of ['public/downloads/png-scout-extension.zip','public/downloads/podadd-extension.zip']) assert.equal(fs.existsSync(archive),false,archive);
  const readme=fs.readFileSync('extension/png-scout/README.txt','utf8');
  assert.match(readme,/Do not distribute/);
  assert.match(readme,/Remove any earlier version/);
});
