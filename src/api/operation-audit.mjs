import {DatabaseSync} from 'node:sqlite';
import {preparePrivateSQLite} from '../core/sqlite-permissions.mjs';
import {createHash} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
export class SQLiteApiAudit{
 #db;
 constructor(db){this.#db=db;}
 static async open(path){
  path=resolve(path);await mkdir(dirname(path),{recursive:true});preparePrivateSQLite(path);
  const db=new DatabaseSync(path);
  try{db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS api_access_audit(sequence INTEGER PRIMARY KEY, occurred_at TEXT NOT NULL, subject TEXT NOT NULL, operation TEXT NOT NULL, allowed INTEGER NOT NULL CHECK(allowed IN (0,1)), previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL)');return new SQLiteApiAudit(db);}catch(e){db.close();throw e;}
 }
 record({subject,operation,allowed}){
  if(typeof subject!=='string'||!subject.trim()||subject.length>256||typeof operation!=='string'||!/^\/v1\/[a-z]+\/[a-z-]+$/.test(operation)||typeof allowed!=='boolean')throw new TypeError('invalid audit decision');
  this.#db.exec('BEGIN IMMEDIATE');
  try{
   const last=this.#db.prepare('SELECT sequence,entry_hash FROM api_access_audit ORDER BY sequence DESC LIMIT 1').get();
   const seq=(last?.sequence??0)+1,at=new Date().toISOString(),prev=last?.entry_hash??'0'.repeat(64);
   const hash=createHash('sha256').update(JSON.stringify([seq,at,subject,operation,allowed,prev])).digest('hex');
   this.#db.prepare('INSERT INTO api_access_audit VALUES(?,?,?,?,?,?,?)').run(seq,at,subject,operation,allowed?1:0,prev,hash);
   this.#db.exec('COMMIT');return seq;
  }catch(e){this.#db.exec('ROLLBACK');throw e;}
 }
 list(){return this.#db.prepare('SELECT * FROM api_access_audit ORDER BY sequence LIMIT 1000').all();}
 close(){this.#db.close();}
}
