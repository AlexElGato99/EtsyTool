import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function popup(tabUrl, site = 'https://scout.example') {
  const handlers = {}; const created = []; const stored = [];
  const elements = Object.fromEntries(['site','status','open','settings'].map(id => [id,{ value:site,textContent:'',disabled:false,addEventListener:(event,fn) => {handlers[id + ':' + event] = fn;} }]));
  vm.runInNewContext(fs.readFileSync('extension/png-scout/popup.js','utf8'),{URL,Error,document:{getElementById:id => elements[id]},chrome:{storage:{local:{get:async()=>({siteOrigin:site}),set:async value=>stored.push(value)}},tabs:{query:async()=>[{url:tabUrl}],create:async value=>created.push(value)}},window:{close:()=>{}}});
  return {handlers,elements,created,stored};
}
test('Browser shortcut opens only the selected Etsy listing with a safe workspace deep link',async()=>{
  const result=popup('https://www.etsy.com/listing/12345678/a-title?ref=tracking');
  await Promise.resolve(); await result.handlers['open:click']();
  assert.equal(result.created.length,1);const target=new URL(result.created[0].url);
  assert.equal(target.origin,'https://scout.example');assert.equal(target.pathname,'/workspace');
  assert.equal(target.searchParams.get('section'),'listings');assert.equal(target.searchParams.get('mode'),'listing');
  assert.equal(target.searchParams.get('q'),'https://www.etsy.com/listing/12345678/a-title');assert.equal(result.elements.open.disabled,false);
});
test('Browser shortcut rejects unrelated tabs and unsafe destination origins',async()=>{
  for(const [tab,site] of [['https://evil.example/listing/1234','https://scout.example'],['https://www.etsy.com.evil.example/listing/1234','https://scout.example'],['https://www.etsy.com/shop/example','https://scout.example'],['https://www.etsy.com/listing/1234','http://public.example'],['https://www.etsy.com/listing/1234','https://user:pass@scout.example'],['https://www.etsy.com/listing/1234','javascript:alert(1)']]){
    const result=popup(tab,site);await Promise.resolve();await result.handlers['open:click']();assert.equal(result.created.length,0);assert.ok(result.elements.status.textContent);assert.equal(result.elements.open.disabled,false);
  }
});
test('Browser shortcut supports localhost and stores only the chosen website origin',async()=>{
  const result=popup('https://www.etsy.com/listing/1234/title','http://localhost:3000/subpage');await Promise.resolve();await result.handlers['settings:submit']({preventDefault(){}});
  assert.equal(result.stored[0].siteOrigin,'http://localhost:3000');assert.equal(result.elements.site.value,'http://localhost:3000');
  await result.handlers['open:click']();assert.equal(new URL(result.created[0].url).origin,'http://localhost:3000');
  const manifest=JSON.parse(fs.readFileSync('extension/png-scout/manifest.json','utf8'));assert.deepEqual(manifest.permissions,['activeTab','storage']);assert.equal(manifest.host_permissions,undefined);assert.equal(manifest.background,undefined);
});
