// Host-selected, single-workspace API operations. No client-selected store or network target.
import {createHash} from 'node:crypto';
import {validatePublication,RECORD_TYPES} from '../index.mjs';
const exact=(x,required,optional=[])=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&required.every(k=>Object.hasOwn(x,k))&&Object.keys(x).every(k=>required.includes(k)||optional.includes(k));
const str=(x,max=256)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const ref=x=>str(x,512)&&/^[A-Za-z]+:[^:@]+@[1-9]\d*$/.test(x);
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const page=x=>(x.limit===undefined||int(x.limit,1,100))&&(x.offset===undefined||int(x.offset,0,10000));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
export const routes=Object.freeze({
 '/v1/discovery/list':{permission:'discovery:read',valid:x=>exact(x,[],['status','limit','offset'])&&page(x)&&(x.status===undefined||['unreviewed','accept','defer','dismiss'].includes(x.status)),run:(s,x)=>{const rows=s.discovery.list().filter(r=>!x.status||r.reviewStatus===x.status),offset=x.offset??0,limit=x.limit??50;return {items:rows.slice(offset,offset+limit),nextOffset:offset+limit<rows.length?offset+limit:null};}},
 '/v1/discovery/providers':{permission:'discovery:read',valid:x=>exact(x,[]),run:s=>s.discovery.providers().map(({status,...p})=>({...p,status:{health:status?.health??'unknown'}}))},
 '/v1/discovery/ingest':{permission:'discovery:write',valid:x=>exact(x,['providerId','items'])&&str(x.providerId,40)&&Array.isArray(x.items)&&x.items.length>=1&&x.items.length<=100&&x.items.every(object),run:(s,x)=>s.discovery.ingest(x.providerId,x.items)},
 '/v1/discovery/triage':{permission:'discovery:write',valid:x=>exact(x,['id','decision'])&&typeof x.id==='string'&&/^article-[a-f0-9]{64}$/.test(x.id)&&['accept','defer','dismiss'].includes(x.decision),run:(s,x)=>s.discovery.triage(x.id,x.decision)},
 '/v1/discovery/import-briefing':{permission:'discovery:write',valid:x=>exact(x,['schema','items'])&&x.schema==='gc.daily-ai-news/1'&&Array.isArray(x.items)&&x.items.length<=100&&x.items.every(object),run:(s,x)=>s.discovery.importBriefing(x)},
 '/v1/discovery/collect':{permission:'discovery:collect',valid:x=>exact(x,['providerId'])&&str(x.providerId,40),run:(s,x)=>{if(!s.collectProviders?.includes(x.providerId))throw new Error('collection unavailable');const p=s.discovery.providers().find(p=>p.id===x.providerId);if(!p?.enabled||p.type!=='openalex')throw new Error('collection unavailable');return s.discovery.collect(x.providerId);}},
 '/v1/evidence/append':{permission:'evidence:write',valid:x=>exact(x,['record'])&&object(x.record),run:(s,x)=>({ref:s.evidence.append(x.record)})},
 '/v1/evidence/get':{permission:'evidence:read',valid:x=>exact(x,['ref'])&&ref(x.ref),run:(s,x)=>s.evidence.get(x.ref)},
 '/v1/evidence/list':{permission:'evidence:read',valid:x=>exact(x,[],['recordType','limit','offset'])&&page(x)&&(x.recordType===undefined||RECORD_TYPES.includes(x.recordType)),run:(s,x)=>s.evidence.query(x)},
 '/v1/archive/ingest':{permission:'archive:write',valid:x=>exact(x,['sourceRef','captureRef','content'],['mediaType'])&&ref(x.sourceRef)&&ref(x.captureRef)&&typeof x.content==='string'&&x.content.length<=12000&&(x.mediaType===undefined||x.mediaType==='text/plain'),run:(s,x)=>{const source=s.evidence.get(x.sourceRef),capture=s.evidence.get(x.captureRef);if(source?.recordType!=='source'||capture?.recordType!=='capture'||capture.sourceRef!==x.sourceRef||capture.contentDigest!==sha(x.content)||capture.mediaType!==(x.mediaType??'text/plain'))throw new Error('capture mismatch');return s.archive.put({...x,mediaType:x.mediaType??'text/plain'});}},
 '/v1/publication/validate':{permission:'publication:validate',valid:x=>exact(x,['manifest','recordsText'])&&object(x.manifest)&&typeof x.recordsText==='string'&&x.recordsText.length<=12000,run:(_s,x)=>({valid:validatePublication(x.manifest,Buffer.from(x.recordsText,'utf8')).length===0,authority:'candidate-only'})}
});
export const permissions=Object.freeze([...new Set(Object.values(routes).map(r=>r.permission))]);
