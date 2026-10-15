import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';

const require=createRequire(import.meta.url);
function load(file,dependencies={}){
  const module={exports:{}};
  const code=ts.transpile(fs.readFileSync(file,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX});
  vm.runInNewContext(code,{exports:module.exports,URL,TextEncoder,require:name=>{
    if(name==='react/jsx-runtime')return require(name);
    if(name in dependencies)return dependencies[name];
    throw Error('Unexpected dependency: '+name);
  }});
  return module.exports;
}
const catalog=load('lib/site-content.ts');
const tools=load('lib/free-tools.ts');

test('Current feature links go directly to retained tools or account pages',()=>{
  const staticPaths=['/','/signup','/login','/about','/contact','/privacy','/terms','/tools','/workspace'];
  const paths=new Set([...staticPaths,...tools.freeTools.map(tool=>'/tools/'+tool.slug)]);
  const hrefs=catalog.features.map(feature=>feature.href);
  for(const href of hrefs){const url=new URL(href,'https://podadd.example');assert(paths.has(url.pathname),href);if(url.pathname==='/workspace')assert(['drafts','tools','connections',null].includes(url.searchParams.get('section')),href);}
  for(const feature of catalog.features){assert(catalog.featureGroups.includes(feature.category));assert(!catalog.retiredFeatures.includes(feature.slug));if('tool' in feature)assert(tools.freeTools.some(tool=>tool.slug===feature.tool),feature.slug);}
});

const redirectTo=destination=>{const error=new Error('Redirect');error.destination=destination;throw error;};

test('Former feature pages redirect to the current purpose or working tool without recreating marketing pages',async()=>{
  const page=load('app/features/[slug]/page.tsx',{
    'next/navigation':{notFound:()=>{throw Error('404');},permanentRedirect:redirectTo},'../../../lib/site-content':catalog,
  });
  for(const slug of catalog.retiredFeatures)await assert.rejects(page.default({params:Promise.resolve({slug})}),error=>error.destination==='/about#application-purpose',slug);
  for(const feature of catalog.features)await assert.rejects(page.default({params:Promise.resolve({slug:feature.slug})}),error=>error.destination===feature.href,feature.slug);
  await assert.rejects(page.default({params:Promise.resolve({slug:'unrecognized-feature'})}),/404/);
});

test('Retired tool URLs cannot instantiate the previous Pinterest, ads, or analytics editors',async()=>{
  const page=load('app/tools/[slug]/page.tsx',{
    'next/link':{default:()=>null},'next/navigation':{notFound:()=>{throw Error('404');},permanentRedirect:redirectTo},
    '../../../components/site-shell':{SiteHeader:()=>null,SiteFooter:()=>null},'../../../components/free-tools':{FreeTool:()=>null},
    '../../../lib/free-tools':tools,
  });
  const redirects=await load('next.config.ts').default.redirects();
  for(const slug of ['pinterest-pin-composer','ads-budget-planner','ab-test-planner']){
    const redirect=redirects.find(rule=>rule.source==='/tools/'+slug);
    assert.equal(redirect?.destination,'/tools',slug);assert.equal(redirect.permanent,true);
    await assert.rejects(page.default({params:Promise.resolve({slug})}),/404/);
  }
  await assert.rejects(page.default({params:Promise.resolve({slug:'unrecognized-tool'})}),/404/);
});
