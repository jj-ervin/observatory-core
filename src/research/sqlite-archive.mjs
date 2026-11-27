/**
 * OC-09B experimental immutable SQLite research document archive.
 * Independent of evidence record schemas; capture/source refs must be checked by caller.
 */
import {DatabaseSync} from "node:sqlite";
import {preparePrivateSQLite,protectSQLiteSidecars} from "../core/sqlite-permissions.mjs";
import {mkdir} from "node:fs/promises";
import {resolve,dirname} from "node:path";
import {makeResearchDocument,makeResearchPassage,makeResearchCitation} from "./references.mjs";
export class SQLiteResearchArchive {
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
   db.exec("CREATE TABLE IF NOT EXISTS research_documents (id TEXT PRIMARY KEY, descriptor TEXT NOT NULL, content TEXT NOT NULL)");
   db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS research_fts USING fts5(document_id UNINDEXED, content, tokenize='unicode61')");
   protectSQLiteSidecars(path);
   return new SQLiteResearchArchive(db);
  }catch(error){db.close();throw error;}
 }
 put({sourceRef,captureRef,content,mediaType}){
  const descriptor=makeResearchDocument({sourceRef,captureRef,content,mediaType});
  const existing=this.#db.prepare("SELECT descriptor,content FROM research_documents WHERE id=?").get(descriptor.id);
  if(existing){
   if(existing.content!==content||existing.descriptor!==JSON.stringify(descriptor))throw new Error("document identity collision");
   return descriptor;
  }
  this.#db.exec("BEGIN IMMEDIATE");
  try {
   this.#db.prepare("INSERT INTO research_documents(id,descriptor,content) VALUES(?,?,?)").run(descriptor.id,JSON.stringify(descriptor),content);
   this.#db.prepare("INSERT INTO research_fts(document_id,content) VALUES(?,?)").run(descriptor.id,content);
   this.#db.exec("COMMIT");
  } catch(error) {this.#db.exec("ROLLBACK");throw error;}
  return descriptor;
 }
 get(documentId){
  const row=this.#db.prepare("SELECT descriptor,content FROM research_documents WHERE id=?").get(documentId);
  if(!row)return null;
  const descriptor=JSON.parse(row.descriptor);
  const checked=makeResearchDocument({...descriptor,content:row.content});
  if(JSON.stringify(checked)!==JSON.stringify(descriptor))throw new Error("stored research document integrity failure");
  return Object.freeze({document:checked,content:row.content});
 }
 resolveCitation({documentId,start,end,quotedText}){
  const stored=this.get(documentId);
  if(!stored)throw new Error("research document not found");
  const passage=makeResearchPassage({document:stored.document,content:stored.content,start,end});
  const citation=makeResearchCitation({passage,content:stored.content,quotedText});
  return Object.freeze({document:stored.document,passage,citation});
 }
 searchCitations(query,{limit=20,offset=0}={}){
  if(typeof query!=="string"||!query.trim()||query.length>256)throw new TypeError("nonempty bounded query required");
  if(!Number.isSafeInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(offset)||offset<0||offset>10000)throw new RangeError("invalid pagination");
  const matches=this.search(query,{limit,offset});
  const items=[];
  for(const document of matches.items){
   const stored=this.get(document.id);
   // Literal substring lookup: only return citations whose exact offsets are verified.
   // FTS token matches may not be literal substrings; those documents are omitted.
   const start=stored.content.indexOf(query);
   if(start<0)continue;
   const end=start+query.length;
   if(end>stored.content.length)continue;
   const quotedText=stored.content.slice(start,end);
   items.push(this.resolveCitation({documentId:document.id,start,end,quotedText}));
  }
  return Object.freeze({items,nextOffset:matches.nextOffset});
 }
 search(query,{limit=20,offset=0}={}){
  if(typeof query!=="string"||!query.trim()||query.length>256)throw new TypeError("nonempty bounded query required");
  if(!Number.isSafeInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(offset)||offset<0||offset>10000)throw new RangeError("invalid pagination");
  const phrase='"'+query.replaceAll('"','""')+'"';
  const rows=this.#db.prepare("SELECT document_id FROM research_fts WHERE research_fts MATCH ? ORDER BY rank,document_id LIMIT ? OFFSET ?").all(phrase,limit,offset);
  return Object.freeze({items:rows.map(row=>this.get(row.document_id).document),nextOffset:rows.length===limit?offset+limit:null});
 }
 close(){this.#db.close();}
}
