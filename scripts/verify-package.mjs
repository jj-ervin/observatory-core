import assert from 'node:assert/strict';
import {verifyInstalledMcp} from './verify-mcp.mjs';
import {mkdir,mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const scratch=join(root,'.scratch');await mkdir(scratch,{recursive:true});
const dir=await mkdtemp(join(scratch,'sdk-package-'));
const npm=process.env.npm_execpath;
if(!npm)throw new Error('Run through npm run test:package');
function run(args,cwd){return execFileSync(process.execPath,[npm,...args],{cwd,encoding:'utf8',env:{...process.env,npm_config_audit:'false',npm_config_fund:'false'}});}
try{
  const [packed]=JSON.parse(run(['pack','--json','--pack-destination',dir],root));
  const artifact=process.env.OC_PACKAGE_ARTIFACT||join(dir,packed.filename);
  if(process.env.OC_PACKAGE_ARTIFACT)assert.deepEqual(await readFile(artifact),await readFile(join(dir,packed.filename)),'build artifact differs from verified pack');
  assert.ok(packed.files.some(f=>f.path==='schemas/core/0.1.0/records.schema.json'));
  for(const name of ['LICENSE','COPYRIGHT'])assert.ok(packed.files.some(f=>f.path===name),name+' must be included');
  assert.ok(!packed.files.some(f=>/^(test|tests|\.scratch)\//.test(f.path)));
  const consumer=join(dir,'consumer');await mkdir(consumer);
  await writeFile(join(consumer,'package.json'),JSON.stringify({name:'independent-research-fixture',private:true,type:'module'}));
  run(['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',artifact],consumer);
  await writeFile(join(consumer,'exercise.mjs'), [
    "import assert from 'node:assert/strict';",
    "import {InMemoryEvidenceStore,SQLiteEvidenceStore,NewsroomDiscovery,preparePublication,validatePublication,sha256,RESEARCH_CONTRACT_VERSION} from 'observatory-core';",
    "import {NewsroomDiscovery as LegacyDiscovery} from 'observatory-core/src/discovery/newsroom.mjs';",
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
  const installed=join(consumer,'node_modules','observatory-core','src','cli.mjs');
  const help=execFileSync(process.execPath,[installed,'--help'],{cwd:consumer,encoding:'utf8'});
  assert.match(help,/Observatory CLI/);
  const shim=join(consumer,'node_modules','.bin',process.platform==='win32'?'observatory.cmd':'observatory');
  await import('node:fs/promises').then(fs=>fs.access(shim));
  const version=run(['exec','--offline','--','observatory','--version'],consumer).trim();
  assert.equal(version,packed.version,'installed CLI shim version');
  const output=execFileSync(process.execPath,[installed,'discovery','list','--store','news.json'],{cwd:consumer,encoding:'utf8'});
  assert.equal(JSON.parse(output)[0].title,'Synthetic');
  const apiConfig=join(consumer,'api-config.json');
  const token=(await import('node:crypto')).randomBytes(32).toString('base64url');
  // Reserve an ephemeral port briefly; the actual child must bind it successfully.
  const reservation=(await import('node:net')).createServer();
  await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  await writeFile(apiConfig,JSON.stringify({port,archive:join(consumer,'archive.sqlite'),audit:join(consumer,'audit.sqlite'),workspace:{evidence:join(consumer,'evidence.sqlite'),discovery:join(consumer,'news.json'),operationAudit:join(consumer,'ops.sqlite')},principals:[{subject:'fixture',token,documentIds:[],actions:[],permissions:['evidence:read','discovery:read']}]}),{mode:0o600});
  const api=spawn(process.execPath,[join(consumer,'node_modules','observatory-core','src','api','start.mjs')],{cwd:consumer,env:{...process.env,OBSERVATORY_API_CONFIG:apiConfig},stdio:['ignore','pipe','pipe']});
  const exited=new Promise(resolve=>api.once('exit',resolve));
  try{
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('API startup timeout')),10000);api.once('error',e=>{clearTimeout(timer);reject(e);});api.once('exit',()=>{clearTimeout(timer);reject(Error('API exited before startup'));});let text='';api.stdout.on('data',chunk=>{text+=chunk;if(text.includes('\n')){clearTimeout(timer);resolve();}});});
   const response=await fetch('http://127.0.0.1:'+port+'/v1/evidence/get',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({ref:'evidence:e@1'}),signal:AbortSignal.timeout(5000)});
   assert.equal(response.status,200);assert.equal((await response.json()).result.assertion,'Synthetic');
   const denied=await fetch('http://127.0.0.1:'+port+'/v1/evidence/list',{method:'POST',headers:{'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});assert.equal(denied.status,401);
   console.log('Independent installed API process and HTTP consumer passed');
  }finally{if(api.exitCode===null&&api.signalCode===null)api.kill();await exited;}
  await verifyInstalledMcp(consumer);
  console.log('Independent offline SDK and CLI installation and provenance round trip passed');
}finally{await rm(dir,{recursive:true,force:true});}
