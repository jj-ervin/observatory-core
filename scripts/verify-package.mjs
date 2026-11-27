import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const scratch=join(root,'.scratch');await mkdir(scratch,{recursive:true});
const dir=await mkdtemp(join(scratch,'sdk-package-'));
const npm=process.platform==='win32'?'npm.cmd':'npm';
function run(args,cwd){return execFileSync(npm,args,{cwd,encoding:'utf8',shell:process.platform==='win32',env:{...process.env,npm_config_audit:'false',npm_config_fund:'false'}});}
try{
  const [packed]=JSON.parse(run(['pack','--json','--pack-destination',dir],root));
  assert.ok(packed.files.some(f=>f.path==='schemas/core/0.1.0/records.schema.json'));
  assert.ok(!packed.files.some(f=>/^(test|tests|\.scratch)\//.test(f.path)));
  const consumer=join(dir,'consumer');await mkdir(consumer);
  await writeFile(join(consumer,'package.json'),JSON.stringify({name:'independent-research-fixture',private:true,type:'module'}));
  run(['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',join(dir,packed.filename)],consumer);
  await writeFile(join(consumer,'exercise.mjs'), [
    "import assert from 'node:assert/strict';",
    "import {InMemoryEvidenceStore,SQLiteEvidenceStore,NewsroomDiscovery,preparePublication,validatePublication,sha256,RESEARCH_CONTRACT_VERSION} from '@governancecommons/observatory-core';",
    "import {NewsroomDiscovery as LegacyDiscovery} from '@governancecommons/observatory-core/src/discovery/newsroom.mjs';",
    "assert.equal(LegacyDiscovery,NewsroomDiscovery);assert.equal(RESEARCH_CONTRACT_VERSION,'oc.research.v1');",
    "const time='2026-01-01T00:00:00Z';const base=(recordType,id)=>({schemaVersion:'0.1.0',recordType,id,version:1,createdAt:time,producer:'independent-fixture'});",
    "const records=[{...base('source','s'),locator:'https://example.org/source',sourceType:'web',displayName:'Synthetic'}, {...base('capture','c'),sourceRef:'source:s@1',capturedAt:time,contentDigest:'sha256:'+sha256(Buffer.from('fixture')),mediaType:'text/plain',retrievalMethod:'http'}, {...base('evidence','e'),captureRefs:['capture:c@1'],assertion:'Synthetic',method:'extract',limitations:'Test only'}];",
    "const mem=new InMemoryEvidenceStore();for(const record of records)mem.append(record);assert.deepEqual(mem.get('evidence:e@1').captureRefs,['capture:c@1']);",
    "let db=await SQLiteEvidenceStore.open('evidence.sqlite');for(const record of records)db.append(record);db.close();db=await SQLiteEvidenceStore.open('evidence.sqlite');assert.deepEqual(db.get('evidence:e@1'),mem.get('evidence:e@1'));db.close();",
    "const news=await NewsroomDiscovery.open('news.json');await news.ingest('rss',[{url:'https://example.org/source',title:'Synthetic'}]);assert.equal(news.list()[0].schema,'gc.discovery/1');",
    "const record={id:'example-1',subjectId:'example-subject',subjectVersion:'1.0',claim:'Synthetic',evaluator:'fixture',method:'fixture',methodVersion:'1.0',limitations:'Test only',approvalRecordId:'fixture-approval',evidenceClass:'documentation',sourceUrl:'https://example.org/reference',capturedAt:time,publicationStatus:'approved',classification:{specVersion:'1.0.0',assetId:'example-1',impact:'low',access:'open',quadrant:'Q3',dataLabels:[],publication:{status:'approved',approvedBy:'fixture-reviewer',approvalRecordId:'fixture-approval'}}};",
    "const input={records:[record],publicationId:'fixture-release',generatedAt:time,recordsUrl:'https://example.org/records.json',approvedBy:'fixture-reviewer',approvalRecordId:'fixture-approval',sourceCommit:'a'.repeat(40),methodologyVersion:'1.0'};",
    "const candidate=preparePublication(input);assert.deepEqual(validatePublication(candidate.manifest,candidate.recordsBytes),[]);assert.deepEqual(candidate.recordsBytes,preparePublication(input).recordsBytes);"
  ].join('\n'));
  execFileSync(process.execPath,['exercise.mjs'],{cwd:consumer,stdio:'inherit'});
  console.log('Independent offline SDK installation and provenance round trip passed');
}finally{await rm(dir,{recursive:true,force:true});}
