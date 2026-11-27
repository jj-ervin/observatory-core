import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,writeFile,readFile,cp} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const scratch=join(root,'.scratch');await mkdir(scratch,{recursive:true});
const dir=await mkdtemp(join(scratch,'release-'));
const npm=process.env.npm_execpath;
const baseline=process.env.OC_BASELINE_DIR;
if(!npm||!baseline)throw new Error('Run npm run test:release with OC_BASELINE_DIR pointing to pinned previous checkout');
const env={...process.env,npm_config_audit:'false',npm_config_fund:'false'};
const run=(args,cwd)=>execFileSync(process.execPath,[npm,...args],{cwd,encoding:'utf8',env});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function pack(source,name){
 const out=join(dir,name);await mkdir(out);
 const [p]=JSON.parse(run(['pack','--json','--pack-destination',out],source));
 const path=join(out,p.filename),bytes=await readFile(path);
 assert.equal(p.integrity,'sha512-'+createHash('sha512').update(bytes).digest('base64'));
 assert.equal(p.shasum,createHash('sha1').update(bytes).digest('hex'));
 return {path,hash:digest(bytes),version:p.version,name:p.name,files:p.files.map(f=>f.path).sort()};
}
try{
 const a=await pack(root,'candidate-a'),b=await pack(root,'candidate-b');
 assert.equal(a.hash,b.hash,'package bytes must be reproducible on same runner');
 assert.deepEqual(a.files,b.files);
 const old=await pack(baseline,'baseline');
 assert.notEqual(old.hash,a.hash);
 assert.equal(old.version,'0.1.4');
 assert.equal(a.version,JSON.parse(await readFile(join(root,'package.json'),'utf8')).version);
 assert.notEqual(a.version,old.version,'versioned upgrade must replace a distinct version');
 const consumer=join(dir,'consumer');await mkdir(consumer);
 await writeFile(join(consumer,'package.json'),JSON.stringify({name:'release-fixture',private:true,type:'module'}));
 let activeName;
 const install=async artifact=>{
  // Migrate package identity explicitly without removing consumer data.
  if(activeName&&activeName!==artifact.name){
   run(['uninstall','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',activeName],consumer);
   await assert.rejects(readFile(join(consumer,'node_modules',activeName,'package.json')),{code:'ENOENT'});
  }
  run(['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',artifact.path],consumer);
  const installed=JSON.parse(await readFile(join(consumer,'node_modules',artifact.name,'package.json'),'utf8'));
  assert.equal(installed.version,artifact.version);
  assert.equal(installed.name,artifact.name);
  activeName=artifact.name;
  assert.equal(installed.private,true);
  if(installed.bin?.observatory){
   assert.equal(execFileSync(process.execPath,[join(consumer,'node_modules',artifact.name,installed.bin.observatory),'--version'],{cwd:consumer,encoding:'utf8'}).trim(),artifact.version);
  }
 };
 const packageDir=join(consumer,'node_modules',a.name);
 const exercise=join(consumer,'exercise.mjs');
 await writeFile(exercise,[
 "import assert from 'node:assert/strict';",
 "const {SQLiteEvidenceStore,NewsroomDiscovery}=await import(process.argv[3]);",
 "const db=await SQLiteEvidenceStore.open('evidence.sqlite');",
 "try{if(process.argv[2]==='seed')db.append({schemaVersion:'0.1.0',recordType:'source',id:'s',version:1,createdAt:'2026-01-01T00:00:00Z',producer:'fixture',locator:'https://example.org',sourceType:'web',displayName:'Synthetic'});assert.equal(db.get('source:s@1').displayName,'Synthetic');assert.deepEqual(db.integrityCheck(),['ok']);}finally{db.close();}",
 "const news=await NewsroomDiscovery.open('news.json');if(process.argv[2]==='seed')await news.ingest('rss',[{url:'https://example.org/paper',title:'Synthetic',scholarly:{doi:'10.1234/abc'}}]);assert.equal(news.list()[0].scholarly.doi,'10.1234/abc');"
 ].join('\n'));
 const exerciseRun=mode=>execFileSync(process.execPath,[exercise,mode,activeName],{cwd:consumer,stdio:'inherit'});
 await install(old);exerciseRun('seed');
 // Closed SQLite database: retain a consistent backup, including sidecars if present.
 const backup=join(dir,'backup');await mkdir(backup);
 for(const name of ['evidence.sqlite','evidence.sqlite-wal','evidence.sqlite-shm','news.json']){
  try{await cp(join(consumer,name),join(backup,name));}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 await install(a);exerciseRun('verify');
 const cli=join(packageDir,'src','cli.mjs');
 assert.match(execFileSync(process.execPath,[cli,'--help'],{cwd:consumer,encoding:'utf8'}),/Observatory CLI/);
 await install(old);exerciseRun('verify');
 // Restore the closed backup into the isolated consumer directory.
 await install(a);
 for(const name of ['evidence.sqlite','evidence.sqlite-wal','evidence.sqlite-shm','news.json']){
  await rm(join(consumer,name),{force:true});
  try{await cp(join(backup,name),join(consumer,name));}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 exerciseRun('verify');
 console.log(JSON.stringify({candidateName:a.name,baselineName:old.name,candidateVersion:a.version,baselineVersion:old.version,candidateSha256:a.hash,baselineSha256:old.hash,reproducible:true,upgrade:true,rollback:true,restore:true},null,2));
}finally{await rm(dir,{recursive:true,force:true});}
