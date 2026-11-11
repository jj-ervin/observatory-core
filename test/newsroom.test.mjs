import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {NewsroomDiscovery,normalizeDiscovery} from '../src/discovery/newsroom.mjs';
const scratch=join(process.cwd(),'.scratch');
async function testDir(){await mkdir(scratch,{recursive:true});return mkdtemp(join(scratch,'obcore-news-'));}

test('versioned records preserve cross-provider discoveries and triage across restart',async()=>{
  const dir=await testDir();
  try{
    const file=join(dir,'news.json'),n=await NewsroomDiscovery.open(file);
    await n.configure({id:'research',type:'openalex',enabled:true,query:'governance'});
    const item={sourceUrl:'https://example.org/story?utm_source=a',title:'A finding',source:'Example',publishedAt:'2026-11-10',summary:'Summary',topics:['AI']};
    assert.deepEqual(await n.ingest('rss',[item],'2026-11-10T12:00:00.000Z'),{added:1,events:1});
    assert.deepEqual(await n.ingest('research',[{...item,sourceUrl:'https://example.org/story',rawRef:'work-1'}],'2026-11-11T12:00:00.000Z'),{added:0,events:1});
    const id=n.list()[0].id;await n.triage(id,'accept');
    const reopened=await NewsroomDiscovery.open(file),record=reopened.list()[0];
    assert.equal(record.schema,'gc.discovery/1');assert.equal(record.reviewStatus,'accept');assert.deepEqual(record.providers,['rss','research']);
    assert.equal(record.discoveredAt,'2026-11-10T12:00:00.000Z');
    assert.equal(reopened.state.events.length,2);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('structured briefing imports require an explicit supported shape',async()=>{
  const dir=await testDir();
  try{const n=await NewsroomDiscovery.open(join(dir,'news.json'));
    await assert.rejects(n.importBriefing({items:[]}),/gc.daily-ai-news/);
    await n.importBriefing({schema:'gc.daily-ai-news/1',items:[{url:'https://example.org/article',title:'Daily briefing'}]});
    assert.equal(n.list()[0].providers[0],'daily-ai');assert.equal(n.providers().find(p=>p.id==='daily-ai').status.health,'ok');
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('saved topic pull persists with its research context and validates its inputs',async()=>{
  const dir=await testDir();
  try{const file=join(dir,'news.json'),n=await NewsroomDiscovery.open(file);
    await assert.rejects(n.configure({id:'pull-empty',type:'rss',kind:'saved-pull',enabled:true,name:'Empty',feeds:[]}),/needs a feed or query/);
    await n.configure({id:'pull-policy',type:'rss',kind:'saved-pull',enabled:true,name:'AI policy',context:'Client research',feeds:['https://example.org/feed.xml']});
    const reopened=await NewsroomDiscovery.open(file),pull=reopened.providers().find(p=>p.id==='pull-policy');
    assert.equal(pull.kind,'saved-pull');assert.equal(pull.context,'Client research');assert.deepEqual(pull.feeds,['https://example.org/feed.xml']);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('normalization rejects unsafe article URLs and malformed title',()=>{
  assert.throws(()=>normalizeDiscovery({url:'http://127.0.0.1/a',title:'Bad'},'rss'),/HTTPS/);
  assert.throws(()=>normalizeDiscovery({url:'https://example.org/a',title:''},'rss'),/title/);
});
test('provider error is recorded and a later successful collection clears it',async()=>{
  const dir=await testDir();
  try{const n=await NewsroomDiscovery.open(join(dir,'news.json'));
    await n.configure({id:'brave',type:'brave',enabled:true,queries:['AI governance']});
    await assert.rejects(n.collect('brave',{braveKey:''}),/BRAVE_SEARCH_API_KEY/);
    assert.equal(n.providers().find(p=>p.id==='brave').status.health,'error');
    await n.configure({id:'brave',type:'brave',enabled:true,queries:[]});
    await n.collect('brave',{braveKey:'test-key'});
    assert.equal(n.providers().find(p=>p.id==='brave').status.health,'ok');
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('OpenAlex and Brave adapters normalize supported API responses',async()=>{
  const dir=await testDir(),original=globalThis.fetch;
  try{const n=await NewsroomDiscovery.open(join(dir,'news.json'));
    await n.configure({id:'openalex',type:'openalex',enabled:true,query:'AI governance'});
    await n.configure({id:'brave',type:'brave',enabled:true,queries:['governance news']});
    const urls=[];
    globalThis.fetch=async(url,options)=>{urls.push([url,options]);return new Response(JSON.stringify(url.includes('openalex')?{results:[{id:'https://openalex.org/W1',title:'Research',doi:'https://doi.org/10.1/1',publication_date:'2026-11-01',topics:[{display_name:'Governance'}]}]}:{web:{results:[{url:'https://example.org/news',title:'News',description:'A result'}]}}),{status:200});};
    await n.collect('openalex');await n.collect('brave',{braveKey:'secret'});
    assert.equal(n.list().length,2);assert.ok(urls[0][0].includes('search=AI%20governance'));
    assert.equal(urls[1][1].headers['X-Subscription-Token'],'secret');
  }finally{globalThis.fetch=original;await rm(dir,{recursive:true,force:true});}
});
