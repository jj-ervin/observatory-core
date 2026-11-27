import test from "node:test";
import assert from "node:assert/strict";
import {mkdir,mkdtemp,rm,stat,chmod,symlink,writeFile,readFile} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {SQLiteEvidenceStore} from "../src/core/sqlite-store.mjs";
import {SQLiteResearchArchive} from "../src/research/sqlite-archive.mjs";
import {SQLiteResearchAccessAudit} from "../src/research/sqlite-access-audit.mjs";
const skip=process.platform==="win32"?"Windows ACLs are outside POSIX mode test":false;
const scratch=fileURLToPath(new URL("../.scratch/",import.meta.url));
const classes=[SQLiteEvidenceStore,SQLiteResearchArchive,SQLiteResearchAccessAudit];
async function workspace(fn){
 await mkdir(scratch,{recursive:true});const dir=await mkdtemp(join(scratch,"oc-sec-002-"));
 try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}
}
async function check(path){
 assert.equal((await stat(path)).mode&0o777,0o600,path);
 for(const suffix of ["-wal","-shm","-journal"]){
  let s;try{s=await stat(path+suffix);}catch(e){if(e.code==="ENOENT")continue;throw e;}
  assert.equal(s.mode&0o777,0o600,path+suffix);
 }
}
test("SQLite stores create owner-only files and repair legacy permissions",{skip},async()=>workspace(async dir=>{
 const old=process.umask(0o002);
 try{
  for(const [i,Store] of classes.entries()){
   const path=join(dir,i+".sqlite");
   let store=await Store.open(path);
   try{await check(path);}finally{store.close();}
   await chmod(path,0o664);
   store=await Store.open(path);
   try{await check(path);}finally{store.close();}
   await check(path);
  }
 }finally{process.umask(old);}
}));
test("SQLite stores reject symlink database and sidecar paths without changing targets",{skip},async()=>workspace(async dir=>{
 const target=join(dir,"target");await writeFile(target,"untouched",{mode:0o644});
 for(const [i,Store] of classes.entries()){
  const path=join(dir,i+".sqlite");
  await symlink(target,path);
  await assert.rejects(Store.open(path));
  await rm(path);
  await symlink(target,path+"-wal");
  await assert.rejects(Store.open(path));
  assert.equal(await readFile(target,"utf8"),"untouched");
  assert.equal((await stat(target)).mode&0o777,0o644);
 }
}));
