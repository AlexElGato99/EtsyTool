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
const resources=load('lib/resources.ts');

test('Current feature and guide links lead to available manual tools or account pages',()=>{
  const staticPaths=['/','/signup','/login','/contact','/privacy','/terms','/etsy-disclaimer','/api-docs','/etsy-docs','/application','/tools','/free','/workspace'];
  const paths=new Set([...staticPaths,...tools.freeTools.map(tool=>'/tools/'+tool.slug),...catalog.features.map(feature=>'/features/'+feature.slug),...[...resources.articles,...resources.guides].map(resources.resourceHref)]);
  const hrefs=[...catalog.features.map(feature=>feature.href),...[...resources.articles,...resources.guides].flatMap(entry=>entry.related)];
  for(const href of hrefs){const url=new URL(href,'https://podadd.example');assert(paths.has(url.pathname),href);if(url.pathname==='/workspace')assert(['drafts','tools','connections',null].includes(url.searchParams.get('section')),href);}
  for(const feature of catalog.features){assert(catalog.featureGroups.includes(feature.category));assert(!catalog.retiredFeatures.includes(feature.slug));if('tool' in feature)assert(tools.freeTools.some(tool=>tool.slug===feature.tool),feature.slug);}
});

test('Retired feature URLs render a retirement notice rather than a marketing or research interface',async()=>{
  const RetiredFeature=()=>null;
  const page=load('app/features/[slug]/page.tsx',{
    '../../../components/retired-feature':{RetiredFeature},'next/navigation':{notFound:()=>{throw Error('404');}},
    '../../../components/site-shell':{SiteHeader:()=>null,SiteFooter:()=>null},'../../../components/site-icon':{SiteIcon:()=>null},
    '../../../components/product-tour':{HeroWorkspace:()=>null},'../../../components/free-tools':{FreeTool:()=>null},'../../../lib/site-content':catalog,
  });
  for(const slug of catalog.retiredFeatures){const result=await page.default({params:Promise.resolve({slug})});assert.equal(result.type,RetiredFeature,slug);assert.match((await page.generateMetadata({params:Promise.resolve({slug})})).title,/retired/i);}
  await assert.rejects(page.default({params:Promise.resolve({slug:'unrecognized-feature'})}),/404/);
});

test('Retired tool URLs cannot instantiate the previous Pinterest, ads, or analytics editors',async()=>{
  const RetiredFeature=()=>null;
  const page=load('app/tools/[slug]/page.tsx',{
    'next/link':{default:()=>null},'next/navigation':{notFound:()=>{throw Error('404');}},
    '../../../components/site-shell':{SiteHeader:()=>null,SiteFooter:()=>null},'../../../components/free-tools':{FreeTool:()=>null},
    '../../../lib/free-tools':tools,'../../../components/retired-feature':{RetiredFeature},
  });
  for(const slug of ['pinterest-pin-composer','ads-budget-planner','ab-test-planner']){const result=await page.default({params:Promise.resolve({slug})});assert.equal(result.type,RetiredFeature,slug);}
  await assert.rejects(page.default({params:Promise.resolve({slug:'unrecognized-tool'})}),/404/);
});
