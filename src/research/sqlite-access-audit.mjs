/**
 * OC-AI-04: append-only research access decision audit.
 * Caller supplies the clock and subject correlation identifier.
 * Audit sink is synchronous so governed tools can fail closed.
 */
import {DatabaseSync} from "node:sqlite";
import {preparePrivateSQLite,protectSQLiteSidecars} from "../core/sqlite-permissions.mjs";
import {mkdir} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {GENESIS,digest} from "./audit-chain.mjs";
export class SQLiteResearchAccessAudit {
 #db;
 constructor(db){this.#db=db;}
 static async open(filePath){
  if(typeof filePath!=="string"||!filePath.trim())throw new TypeError("file path required");
  const path=resolve(filePath);
  await mkdir(dirname(path),{recursive:true});
  preparePrivateSQLite(path);
  const db=new DatabaseSync(path);
  try{
   db.exec("PRAGMA busy_timeout=5000");
   db.exec("PRAGMA journal_mode=WAL");
   db.exec("PRAGMA synchronous=FULL");
   db.exec("CREATE TABLE IF NOT EXISTS research_access_audit (sequence INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at TEXT NOT NULL, subject TEXT NOT NULL, document_id TEXT NOT NULL, action TEXT NOT NULL, allowed INTEGER NOT NULL CHECK(allowed IN (0,1)), previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL)");
   const cols=db.prepare("PRAGMA table_info(research_access_audit)").all().map(x=>x.name);
   if(!cols.includes("entry_hash")||!cols.includes("previous_hash"))throw new Error("legacy audit database requires explicit migration");
   protectSQLiteSidecars(path);
   return new SQLiteResearchAccessAudit(db);
  }catch(error){db.close();throw error;}
 }
 record({occurredAt,subject,documentId,action,allowed}){
  if(typeof occurredAt!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(occurredAt)||!Number.isFinite(Date.parse(occurredAt)))throw new TypeError("valid timestamp required");
  if(typeof subject!=="string"||!subject.trim()||subject.length>256)throw new TypeError("bounded subject required");
  if(typeof documentId!=="string"||!/^doc-[a-f0-9]{64}$/.test(documentId))throw new TypeError("invalid documentId");
  if(!["search","read","verify"].includes(action)||typeof allowed!=="boolean")throw new TypeError("invalid audit decision");
  this.#db.exec("BEGIN IMMEDIATE");
  try{
   const last=this.#db.prepare("SELECT sequence,entry_hash FROM research_access_audit ORDER BY sequence DESC LIMIT 1").get();
   const sequence=last?Number(last.sequence)+1:1;
   const previousHash=last?last.entry_hash:GENESIS;
   const entry={sequence,occurredAt,subject,documentId,action,allowed};
   const entryHash=digest(previousHash,entry);
   this.#db.prepare("INSERT INTO research_access_audit(sequence,occurred_at,subject,document_id,action,allowed,previous_hash,entry_hash) VALUES(?,?,?,?,?,?,?,?)").run(sequence,occurredAt,subject,documentId,action,allowed?1:0,previousHash,entryHash);
   this.#db.exec("COMMIT");
   return sequence;
  }catch(error){this.#db.exec("ROLLBACK");throw error;}
 }
 list({limit=50,afterSequence=0}={}){
  if(!Number.isSafeInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(afterSequence)||afterSequence<0)throw new RangeError("invalid audit pagination");
  const rows=this.#db.prepare("SELECT sequence,occurred_at,subject,document_id,action,allowed,previous_hash,entry_hash FROM research_access_audit WHERE sequence>? ORDER BY sequence LIMIT ?").all(afterSequence,limit);
  return Object.freeze(rows.map(r=>Object.freeze({sequence:Number(r.sequence),occurredAt:r.occurred_at,subject:r.subject,documentId:r.document_id,action:r.action,allowed:r.allowed===1,previousHash:r.previous_hash,entryHash:r.entry_hash})));
 }
 close(){this.#db.close();}
}
export function createResearchAuditCallback(audit,{subject,clock=()=>new Date().toISOString()}={}){
 if(!audit||typeof audit.record!=="function"||typeof subject!=="string"||!subject.trim()||typeof clock!=="function")throw new TypeError("audit, subject and clock required");
 return decision=>audit.record({...decision,subject,occurredAt:clock()});
}
