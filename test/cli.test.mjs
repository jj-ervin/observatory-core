import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {NewsroomDiscovery,SQLiteEvidenceStore,SQLiteResearchArchive,preparePublication} from '../src/index.mjs';
const cli=fileURLToPath(new URL('../src/cli.mjs',import.meta.url));
const scratch=fileURLToPath(new URL('../.scratch/',import.meta.url));
function run(...args){return spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:30000});}
function result(...args){const r=run(...args);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
async function workspace(fn){await mkdir(scratch,{recursive:true});const dir=await mkdtemp(join(scratch,'cli-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}}
const time='2026-01-01T00:00:00Z';
test('CLI help, version, usage errors and no store side effects',async()=>workspace(async dir=>{
 const help=run('--help');assert.equal(help.status,0);assert.match(help.stdout,/discovery collect/);
 const version=run('--version');assert.equal(version.status,0);assert.equal(version.stdout.trim(),JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version);
 const store=join(dir,'missing.json');
 for(const args of [['unknown','command'],['discovery','list'],['discovery','list','--store',store,'--store',store],['discovery','list','--store',store,'--status','bad'],['evidence','list','--store',store,'--limit','0']]){
  const r=run(...args);assert.equal(r.status,2,r.stderr);assert.equal(r.stdout,'');assert.match(r.stderr,/observatory:/);
 }
 await assert.rejects(readFile(store),{code:'ENOENT'});
}));
test('CLI discovery config, ingestion, triage, restart and SDK parity',async()=>workspace(async dir=>{
 const store=join(dir,'news.json'),input=join(dir,'input.json');
 await writeFile(input,JSON.stringify({id:'research',type:'openalex',enabled:true,query:'basketball'}));
 assert.equal(result('discovery','configure','--store',store,'--input',input).id,'research');
 await writeFile(input,JSON.stringify([{url:'https://example.org/paper',title:'Paper',scholarly:{doi:'10.1234/ABC',authors:[{name:'Example'}]}}]));
 assert.equal(result('discovery','ingest','--store',store,'--provider','research','--input',input).added,1);
 const rows=result('discovery','list','--store',store);
 assert.equal(rows[0].scholarly.doi,'10.1234/abc');
 result('discovery','triage','--store',store,'--id',rows[0].id,'--decision','accept');
 const sdk=await NewsroomDiscovery.open(store);
 assert.deepEqual(result('discovery','list','--store',store,'--status','accept'),sdk.list());
 assert.equal(result('discovery','list','--store',store,'--status','dismiss').length,0);
 assert.deepEqual(result('discovery','providers','--store',store),sdk.providers());
 await writeFile(input,'{bad');
 const bad=run('discovery','ingest','--store',store,'--provider','research','--input',input);assert.equal(bad.status,1);assert.equal(bad.stdout,'');
}));
test('CLI evidence persistence and research citation search parity',async()=>workspace(async dir=>{
 const store=join(dir,'evidence.sqlite'),input=join(dir,'record.json');
 const source={schemaVersion:'0.1.0',recordType:'source',id:'s',version:1,createdAt:time,producer:'fixture',locator:'https://example.org',sourceType:'web',displayName:'Synthetic'};
 await writeFile(input,JSON.stringify(source));
 assert.equal(result('evidence','append','--store',store,'--input',input).ref,'source:s@1');
 const sdk=await SQLiteEvidenceStore.open(store);
 try{assert.deepEqual(result('evidence','get','--store',store,'--ref','source:s@1'),sdk.get('source:s@1'));assert.deepEqual(result('evidence','list','--store',store),sdk.query());}
 finally{sdk.close();}
 assert.equal(run('evidence','get','--store',store,'--ref','source:missing@1').status,1);
 const archivePath=join(dir,'archive.sqlite'),archive=await SQLiteResearchArchive.open(archivePath);
 try{archive.put({sourceRef:'source:s@1',captureRef:'capture:c@1',content:'basketball research',mediaType:'text/plain'});assert.deepEqual(result('research','search','--store',archivePath,'--query','basketball'),archive.searchCitations('basketball'));}
 finally{archive.close();}
}));
test('CLI verifies exact publication bytes without claiming authority',async()=>workspace(async dir=>{
 const record={id:'example-1',subjectId:'example-subject',subjectVersion:'1.0',claim:'Synthetic',evaluator:'fixture',method:'fixture',methodVersion:'1.0',limitations:'Test only',approvalRecordId:'fixture-approval',evidenceClass:'documentation',sourceUrl:'https://example.org/reference',capturedAt:time,publicationStatus:'approved',classification:{specVersion:'1.0.0',assetId:'example-1',impact:'low',access:'open',quadrant:'Q3',dataLabels:[],publication:{status:'approved',approvedBy:'fixture-reviewer',approvalRecordId:'fixture-approval'}}};
 const p=preparePublication({records:[record],publicationId:'fixture-release',generatedAt:time,recordsUrl:'https://example.org/records.json',approvedBy:'fixture-reviewer',approvalRecordId:'fixture-approval',sourceCommit:'a'.repeat(40),methodologyVersion:'1.0'});
 const manifest=join(dir,'manifest.json'),records=join(dir,'records.json');
 await writeFile(manifest,p.manifestBytes);await writeFile(records,p.recordsBytes);
 assert.deepEqual(result('publication','validate','--manifest',manifest,'--records',records),{valid:true,authority:'candidate-only'});
 await writeFile(records,p.recordsBytes.toString().trimEnd());
 const bad=run('publication','validate','--manifest',manifest,'--records',records);assert.equal(bad.status,1);assert.equal(bad.stdout,'');
}));
