import test from 'node:test';
import assert from 'node:assert/strict';
import {createGovernedResearchTools} from '../src/research/governed-tools.mjs';
import {createResearchIntegration,RESEARCH_CONTRACT_VERSION as version} from '../src/research/integration-contract.mjs';
import {createResearchJsonTransport} from '../src/research/json-transport.mjs';

test('ZTA boundary denies untrusted context, cross-scope access, revocation and audit outage before reads',()=>{
 const a='doc-'+'a'.repeat(64),b='doc-'+'b'.repeat(64);
 const reads=[],events=[];
 const archive={get(id){reads.push(id);return null;},resolveCitation(args){reads.push(args.documentId);throw Error('unexpected citation read');}};
 const authenticated=new WeakMap();
 const alice={},bob={};authenticated.set(alice,{subject:'alice',scope:[a]});authenticated.set(bob,{subject:'bob',scope:[b]});
 let revoked=false,auditDown=false;
 const transport=createResearchJsonTransport(context=>{
  const identity=authenticated.get(context);
  if(!identity)throw Error('unauthenticated');
  return createResearchIntegration(createGovernedResearchTools(archive,{
   candidateDocumentIds:identity.scope,
   authorize:({documentId,action})=>!revoked&&identity.scope.includes(documentId)&&action==='read',
   audit:event=>{if(auditDown)throw Error('audit unavailable');events.push({...event,subject:identity.subject});}
  }));
 });
 const call=(context,id,extra={})=>transport.handle(JSON.stringify({version,operation:'getDocument',arguments:{documentId:id},...extra}),context);
 assert.equal(call({subject:'alice',authenticated:true},a).status,503);
 assert.equal(call(alice,b).status,403);
 assert.equal(call(bob,a).status,403);
 assert.deepEqual(reads,[]);
 assert.equal(call(alice,a,{subject:'bob'}).status,400);
 assert.deepEqual(reads,[]);
 assert.equal(call(alice,a).status,200);
 assert.deepEqual(reads,[a]);
 assert.equal(call(bob,b).status,200);
 assert.deepEqual(reads,[a,b]);
 revoked=true;
 assert.equal(call(alice,a).status,403);
 revoked=false;auditDown=true;
 assert.equal(call(alice,a).status,403);
 assert.deepEqual(reads,[a,b]);
 assert.ok(events.some(e=>e.subject==='alice'&&e.documentId===b&&!e.allowed));
 assert.ok(events.some(e=>e.subject==='bob'&&e.documentId===a&&!e.allowed));
 assert.ok(events.some(e=>e.subject==='alice'&&e.documentId===a&&!e.allowed));
});
