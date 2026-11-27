/**
 * OC-AI-06: explicit one-time in-place migration for legacy OC-AI-04 audit files.
 * Run only after taking and retaining a verified backup.
 */
import {DatabaseSync} from "node:sqlite";
import {resolve} from "node:path";
import {preparePrivateSQLite,protectSQLiteSidecars} from "../core/sqlite-permissions.mjs";
import {GENESIS,digest} from "./audit-chain.mjs";
export function migrateLegacyResearchAudit(filePath,{backupConfirmed=false}={}){
 if(typeof filePath!=="string"||!filePath.trim()||backupConfirmed!==true)throw new TypeError("file path and confirmed backup required");
 const path=resolve(filePath);
 preparePrivateSQLite(path,{create:false});
 const db=new DatabaseSync(path);
 try{
  db.exec("PRAGMA busy_timeout=5000");
  db.exec("PRAGMA synchronous=FULL");
  db.exec("BEGIN IMMEDIATE");
  try{
   const cols=db.prepare("PRAGMA table_info(research_access_audit)").all().map(x=>x.name);
   if(cols.length===0)throw new Error("audit table missing");
   if(cols.includes("entry_hash")||cols.includes("previous_hash"))throw new Error("audit schema already migrated or inconsistent");
   const expected=["sequence","occurred_at","subject","document_id","action","allowed"];
   if(cols.length!==expected.length||expected.some(x=>!cols.includes(x)))throw new Error("unexpected legacy audit schema");
   const rows=db.prepare("SELECT sequence,occurred_at,subject,document_id,action,allowed FROM research_access_audit ORDER BY sequence").all();
   let previousHash=GENESIS,sequence=1;
   const updates=[];
   for(const row of rows){
    if(Number(row.sequence)!==sequence||![0,1].includes(row.allowed))throw new Error("legacy audit sequence or decision invalid");
    const entry={sequence,occurredAt:row.occurred_at,subject:row.subject,documentId:row.document_id,action:row.action,allowed:row.allowed===1};
    const entryHash=digest(previousHash,entry);
    updates.push({sequence,previousHash,entryHash});
    previousHash=entryHash;sequence++;
   }
   db.exec("ALTER TABLE research_access_audit ADD COLUMN previous_hash TEXT");
   db.exec("ALTER TABLE research_access_audit ADD COLUMN entry_hash TEXT");
   const update=db.prepare("UPDATE research_access_audit SET previous_hash=?,entry_hash=? WHERE sequence=?");
   for(const row of updates)update.run(row.previousHash,row.entryHash,row.sequence);
   protectSQLiteSidecars(path);
   db.exec("COMMIT");
   return Object.freeze({migrated:true,count:rows.length,headHash:previousHash});
  }catch(error){db.exec("ROLLBACK");throw error;}
 }finally{db.close();}
}
