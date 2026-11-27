import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {SQLiteResearchArchive} from "../src/research/sqlite-archive.mjs";
import {createGovernedResearchTools} from "../src/research/governed-tools.mjs";
test("governed research rechecks permissions and fails closed on audit failures",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"oc-governed-"));
 const archive=await SQLiteResearchArchive.open(join(dir,"research.sqlite"));
 try{
  const a=archive.put({sourceRef:"source:a@1",captureRef:"capture:a@1",content:"Shared evidence."});
  const b=archive.put({sourceRef:"source:b@1",captureRef:"capture:b@1",content:"Shared evidence. Restricted."});
  let allowB=false;
  const events=[];
  const tools=createGovernedResearchTools(archive,{candidateDocumentIds:[a.id,b.id],authorize:({documentId})=>documentId===a.id||allowB,audit:event=>events.push(event)});
  assert.deepEqual(tools.searchEvidence({query:"Shared"}).results.map(x=>x.document.id),[a.id]);
  assert.throws(()=>tools.getDocument({documentId:b.id}),/unavailable/);
  allowB=true;
  assert.deepEqual(tools.searchEvidence({query:"Shared"}).results.map(x=>x.document.id),[a.id,b.id]);
  allowB=false;
  assert.throws(()=>tools.verifyCitation({documentId:b.id,start:0,end:6,quotedText:"Shared"}),/unavailable/);
  assert.equal(events.some(e=>e.documentId===b.id&&e.allowed===false),true);
  assert.throws(()=>createGovernedResearchTools(archive,{candidateDocumentIds:[a.id],authorize:()=>true}),/audit callbacks/);
  const denied=createGovernedResearchTools(archive,{candidateDocumentIds:[a.id],authorize:()=>{throw Error("policy unavailable");},audit:()=>{}});
  assert.deepEqual(denied.searchEvidence({query:"Shared"}).results,[]);
  const auditFailure=createGovernedResearchTools(archive,{candidateDocumentIds:[a.id],authorize:()=>true,audit:()=>{throw Error("audit unavailable");}});
  assert.throws(()=>auditFailure.getDocument({documentId:a.id}),/audit unavailable/);
 }finally{archive.close();await rm(dir,{recursive:true,force:true});}
});

test("async or explicitly rejected audit never permits archive access",()=>{
 const id="doc-"+"a".repeat(64);let reads=0;
 const archive={get(){reads++;return null;},resolveCitation(){reads++;}};
 for(const audit of [async()=>{},async()=>{throw Error("audit unavailable");},()=>false]){
  const tools=createGovernedResearchTools(archive,{candidateDocumentIds:[id],authorize:()=>true,audit});
  assert.throws(()=>tools.getDocument({documentId:id}),/audit/);
  assert.throws(()=>tools.searchEvidence({query:"x"}),/audit/);
  assert.throws(()=>tools.verifyCitation({documentId:id,start:0,end:1,quotedText:"x"}),/audit/);
 }
 const tools=createGovernedResearchTools(archive,{candidateDocumentIds:[id],authorize:async()=>{throw Error("policy unavailable");},audit:()=>{}});
 assert.throws(()=>tools.getDocument({documentId:id}),/unavailable/);
 assert.equal(reads,0);
});
