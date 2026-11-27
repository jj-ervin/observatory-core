/**
 * OC-05 experimental SQLite adapter (Node >=22.13 with node:sqlite).
 * Uses WAL and BEGIN IMMEDIATE to serialize cross-process writers.
 * Appends replay history through core integrity rules; reads use SQL indexes.
 */
import {DatabaseSync} from "node:sqlite";
import {preparePrivateSQLite} from "./sqlite-permissions.mjs";
import {resolve,dirname} from "node:path";
import {mkdir} from "node:fs/promises";
import {InMemoryEvidenceStore} from "./store.mjs";

export class SQLiteEvidenceStore {
  #db;
  constructor(db) {this.#db=db;}
  static async open(filePath,{busyTimeout=5000}={}) {
    if(typeof filePath!=="string" || !filePath.trim()) throw new TypeError("file path required");
    if(!Number.isSafeInteger(busyTimeout)||busyTimeout<0||busyTimeout>60000) throw new RangeError("invalid busy timeout");
    const path=resolve(filePath);
    await mkdir(dirname(path),{recursive:true});
    preparePrivateSQLite(path);
    const db=new DatabaseSync(path);
    try {
      // Set busy timeout before any PRAGMA that may need a write lock.
      db.exec("PRAGMA busy_timeout="+busyTimeout);
      db.exec("PRAGMA journal_mode=WAL");
      db.exec("PRAGMA synchronous=FULL");
      db.exec("PRAGMA foreign_keys=ON");
      db.exec("CREATE TABLE IF NOT EXISTS evidence_records (seq INTEGER PRIMARY KEY AUTOINCREMENT, ref TEXT NOT NULL UNIQUE, record_type TEXT NOT NULL, record_id TEXT NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL, UNIQUE(record_type,record_id,version))");
      db.exec("CREATE INDEX IF NOT EXISTS evidence_records_identity_idx ON evidence_records(record_type,record_id,version)");
      db.exec("CREATE INDEX IF NOT EXISTS evidence_records_type_seq_idx ON evidence_records(record_type,seq)");
      const adapter=new SQLiteEvidenceStore(db);
      adapter.#load();
      return adapter;
    } catch(error) {db.close();throw error;}
  }
  #load() {
    const store=new InMemoryEvidenceStore();
    for(const row of this.#db.prepare("SELECT payload FROM evidence_records ORDER BY seq").all())
      store.append(JSON.parse(row.payload));
    return store;
  }
  append(record) {
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      const store=this.#load();
      const ref=store.append(record);
      const persisted=store.get(ref);
      this.#db.prepare("INSERT INTO evidence_records(ref,record_type,record_id,version,payload) VALUES(?,?,?,?,?)")
        .run(ref,persisted.recordType,persisted.id,persisted.version,JSON.stringify(persisted));
      this.#db.exec("COMMIT");
      return ref;
    } catch(error) {this.#db.exec("ROLLBACK");throw error;}
  }
  #decode(row) {return row ? Object.freeze(JSON.parse(row.payload)) : null;}
  get(ref) {
    return this.#decode(this.#db.prepare("SELECT payload FROM evidence_records WHERE ref=?").get(ref));
  }
  getLatest(type,id) {
    // Keep identity validation consistent with the in-memory adapter.
    new InMemoryEvidenceStore().getLatest(type,id);
    return this.#decode(this.#db.prepare("SELECT payload FROM evidence_records WHERE record_type=? AND record_id=? ORDER BY version DESC LIMIT 1").get(type,id));
  }
  history(type,id) {
    new InMemoryEvidenceStore().history(type,id);
    return this.#db.prepare("SELECT payload FROM evidence_records WHERE record_type=? AND record_id=? ORDER BY version").all(type,id).map(row=>this.#decode(row));
  }
  query({recordType,limit=50,offset=0}={}) {
    // Reuse the existing query contract's type and pagination validation.
    new InMemoryEvidenceStore().query({recordType,limit,offset});
    const where=recordType===undefined?"":" WHERE record_type=?";
    const args=recordType===undefined?[]:[recordType];
    const total=this.#db.prepare("SELECT COUNT(*) AS total FROM evidence_records"+where).get(...args).total;
    const rows=this.#db.prepare("SELECT payload FROM evidence_records"+where+" ORDER BY seq LIMIT ? OFFSET ?").all(...args,limit,offset);
    return {items:rows.map(row=>this.#decode(row)),total,nextOffset:offset+limit<total?offset+limit:null};
  }
  integrityCheck() {
    return this.#db.prepare("PRAGMA integrity_check").all().map(row=>row.integrity_check);
  }
  close() {this.#db.close();}
}
