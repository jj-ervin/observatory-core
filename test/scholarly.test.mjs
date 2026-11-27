import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {NewsroomDiscovery,normalizeDiscovery} from '../src/discovery/newsroom.mjs';
import {canonicalDoi,fromOpenAlex,decodeAbstract} from '../src/discovery/scholarly.mjs';
test('scholarly normalization preserves supplied fields and unknowns',()=>{
  const s=fromOpenAlex({id:'https://openalex.org/W1',doi:'https://doi.org/10.1234/ABC',publication_year:2020,type:'article',primary_location:{source:{display_name:'Journal'}},authorships:[{author:{display_name:'B',id:'A2',orcid:'O2'}},{author:{display_name:'A'}}],abstract_inverted_index:{one:[0,2],two:[1]},open_access:{is_oa:false,oa_status:'closed'},is_retracted:false});
  assert.deepEqual(s,{doi:'10.1234/abc',openAlexId:'https://openalex.org/W1',publicationDate:'2020',publicationDatePrecision:'year',venue:'Journal',publicationType:'article',openAccessStatus:'closed',abstract:'one two one',isOpenAccess:false,isRetracted:false,authors:[{name:'B',openAlexId:'A2',orcid:'O2'},{name:'A'}]});
  assert.deepEqual(fromOpenAlex({id:'W2'}),{openAlexId:'W2'});
  assert.equal(canonicalDoi('doi:10.1234/ABC'),'10.1234/abc');
  assert.equal(canonicalDoi('https://doi.org/10.1234%2FABC'),'10.1234/abc');
  assert.equal(canonicalDoi('not a DOI'),undefined);
  assert.equal(decodeAbstract({word:[2]}),undefined);
  assert.equal(fromOpenAlex({publication_date:'2026-02-30'}),undefined);
  assert.equal(Object.hasOwn(normalizeDiscovery({url:'https://example.org/a',title:'Legacy'},'rss'),'scholarly'),false);
});
test('legacy record enrichment, DOI alias, repeated sighting and restart retain ID and triage',async()=>{
  const scratch=join(process.cwd(),'.scratch');await mkdir(scratch,{recursive:true});
  const dir=await mkdtemp(join(scratch,'oc-sm-'));
  try{
    const file=join(dir,'news.json'),n=await NewsroomDiscovery.open(file);
    await n.ingest('rss',[{url:'https://example.org/paper',title:'Paper'}]);
    const id=n.list()[0].id;await n.triage(id,'accept');
    const item={url:'https://example.org/paper',title:'Paper',externalId:'W1',rawRef:'W1',scholarly:{doi:'10.1234/X',openAlexId:'W1',publicationDate:'2020'}};
    await n.ingest('openalex',[item]);
    await n.ingest('openalex',[{...item,scholarly:{...item.scholarly,publicationDate:'2020-05-01',isRetracted:false}}]);
    await n.ingest('openalex',[{...item,url:'https://doi.org/10.1234/x',scholarly:{...item.scholarly,authors:[{name:'Author'}],isRetracted:true}}]);
    const reopened=await NewsroomDiscovery.open(file),rows=reopened.list();
    assert.equal(rows.length,1);assert.equal(rows[0].id,id);assert.equal(rows[0].reviewStatus,'accept');
    assert.equal(rows[0].scholarly.doi,'10.1234/x');assert.equal(rows[0].scholarly.publicationDate,'2020-05-01');
    assert.equal(rows[0].scholarly.isRetracted,false);assert.deepEqual(rows[0].scholarly.authors,[{name:'Author'}]);
    assert.equal(reopened.state.events.length,2);
    assert.equal(reopened.state.events[1].scholarly.doi,'10.1234/x');
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('OpenAlex collection retains optional scholarly metadata',async()=>{
  const scratch=join(process.cwd(),'.scratch');await mkdir(scratch,{recursive:true});
  const dir=await mkdtemp(join(scratch,'oc-sm-api-')),original=globalThis.fetch;
  try{
    const n=await NewsroomDiscovery.open(join(dir,'news.json'));
    await n.configure({id:'openalex',type:'openalex',enabled:true,query:'test'});
    globalThis.fetch=async()=>new Response(JSON.stringify({results:[{id:'https://openalex.org/W1',title:'Paper',doi:'https://doi.org/10.1234/X',authorships:[{author:{display_name:'A'}}],is_retracted:false}]}));
    await n.collect('openalex');assert.equal(n.list()[0].scholarly.doi,'10.1234/x');assert.deepEqual(n.list()[0].scholarly.authors,[{name:'A'}]);
  }finally{globalThis.fetch=original;await rm(dir,{recursive:true,force:true});}
});
