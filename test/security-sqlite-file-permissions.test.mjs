import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {SQLiteEvidenceStore} from "../src/core/sqlite-store.mjs";
import {SQLiteResearchArchive} from "../src/research/sqlite-archive.mjs";
import {SQLiteResearchAccessAudit} from "../src/research/sqlite-access-audit.mjs";

// OC-SEC-001 finding: unlike src/core/file-store.mjs and src/discovery/newsroom.mjs,
// which explicitly create their JSON state files with mode 0o600, none of the three
// SQLite-backed stores set an explicit file mode when creating their database file.
// node:sqlite's DatabaseSync opens/creates the file honoring only the process umask,
// so on a shared host with a permissive umask (022 or, worse, 002) evidence content,
// full research document text, and the access-audit trail are left group/world
// readable (and, with umask 002, group-writable) by default. This is a POSIX-only
// permission-bit gap; Windows ACL inheritance is a separate, not-yet-assessed concern.
test("SQLite stores do not currently restrict database file permissions to the owner",{skip:process.platform==="win32"?"POSIX file-mode bits do not apply on Windows":false},async()=>{
 const dir=await mkdtemp(join(tmpdir(),"oc-sec-001-perm-"));
 const priorUmask=process.umask(0o022);
 try{
  const evidencePath=join(dir,"evidence.sqlite");
  const researchPath=join(dir,"research.sqlite");
  const auditPath=join(dir,"audit.sqlite");

  const evidence=await SQLiteEvidenceStore.open(evidencePath);
  const archive=await SQLiteResearchArchive.open(researchPath);
  const audit=await SQLiteResearchAccessAudit.open(auditPath);
  try{
   const evidenceMode=(await stat(evidencePath)).mode&0o777;
   const researchMode=(await stat(researchPath)).mode&0o777;
   const auditMode=(await stat(auditPath)).mode&0o777;

   // Documents today's actual (insecure) behavior: with a 022 umask the files come
   // out group/world-readable (0o644), not owner-only (0o600) like file-store.mjs.
   // If this assertion ever fails because someone hardened the mode, that is the
   // fix landing -- flip this test to assert 0o600 and close OC-SEC-001 finding 1.
   assert.equal(evidenceMode,0o644,"evidence.sqlite is group/world-readable under a standard umask");
   assert.equal(researchMode,0o644,"research.sqlite is group/world-readable under a standard umask");
   assert.equal(auditMode,0o644,"audit.sqlite (the access-audit trail) is group/world-readable under a standard umask");
  }finally{
   evidence.close();archive.close();audit.close();
  }
 }finally{
  process.umask(priorUmask);
  await rm(dir,{recursive:true,force:true});
 }
});
