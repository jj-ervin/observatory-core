import {createServer} from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {createResearchIntegration} from '../index.mjs';
import {createGovernedResearchTools} from '../research/governed-tools.mjs';
import {createResearchJsonTransport} from '../research/json-transport.mjs';
import {createResearchAuditCallback} from '../research/sqlite-access-audit.mjs';

const digest=s=>createHash('sha256').update(s).digest();
const id=/^doc-[a-f0-9]{64}$/;
const scopes=['search','read','verify'];
const MAX=16*1024;
const fail=(res,status,code)=>send(res,status,JSON.stringify({ok:false,error:{code}}));
function send(res,status,body){
 if(res.destroyed||res.writableEnded)return;
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':Buffer.byteLength(body)});
 res.end(body);
}
export function createObservatoryApi({archive,audit,principals}={}){
 if(!archive||typeof archive.get!=='function'||typeof archive.resolveCitation!=='function'||!audit||typeof audit.record!=='function')throw new TypeError('archive and durable audit required');
 if(!Array.isArray(principals)||!principals.length||principals.length>100)throw new TypeError('bounded principals required');
 const entries=principals.map(p=>{
  if(typeof p.subject!=='string'||!p.subject.trim()||p.subject.length>256||typeof p.token!=='string'||! /^[A-Za-z0-9_-]{43,128}$/.test(p.token)||!Array.isArray(p.documentIds)||p.documentIds.length>100||p.documentIds.some(x=>typeof x!=='string'||!id.test(x))||new Set(p.documentIds).size!==p.documentIds.length||!Array.isArray(p.actions)||p.actions.some(x=>!scopes.includes(x)))throw new TypeError('invalid principal');
  return {subject:p.subject,hash:digest(p.token),documents:[...p.documentIds],actions:new Set(p.actions),active:true};
 });
 if(new Set(entries.map(p=>p.subject)).size!==entries.length||new Set(entries.map(p=>p.hash.toString('hex'))).size!==entries.length)throw new TypeError('duplicate principal');
 const transport=createResearchJsonTransport(p=>createResearchIntegration(createGovernedResearchTools(archive,{
  candidateDocumentIds:p.documents,
  authorize:({action})=>p.active&&p.actions.has(action),
  audit:createResearchAuditCallback(audit,{subject:p.subject})
 })),{maxRequestBytes:MAX});
 const server=createServer({requestTimeout:10000,headersTimeout:5000,keepAliveTimeout:1000,maxHeaderSize:8192},(req,res)=>{
  // Only exact paths; no URL parameters, cookies, forwarded identity or CORS.
  if(req.method==='GET'&&req.url==='/healthz'){send(res,200,'{"status":"ok","apiVersion":"v1"}');return;}
  if(req.url!=='/v1/research/invoke'){fail(res,404,'NOT_FOUND');return;}
  if(req.method!=='POST'){res.setHeader('Allow','POST');fail(res,405,'METHOD_NOT_ALLOWED');return;}
  const auth=req.headers.authorization;
  const match=typeof auth==='string'&&/^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(auth);
  let principal;
  if(match){const hash=digest(match[1]);for(const p of entries)if(timingSafeEqual(hash,p.hash)&&p.active)principal=p;}
  if(!principal){res.setHeader('WWW-Authenticate','Bearer');res.setHeader('Connection','close');fail(res,401,'UNAUTHENTICATED');return;}
  if(req.headers['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json'||req.headers['content-encoding']){res.setHeader('Connection','close');fail(res,415,'UNSUPPORTED_MEDIA_TYPE');return;}
  const len=req.headers['content-length'];
  if(len!==undefined&&Number(len)>MAX){res.setHeader('Connection','close');fail(res,413,'REQUEST_TOO_LARGE');return;}
  let total=0,done=false;const chunks=[];
  const timer=setTimeout(()=>{if(!done){done=true;res.setHeader('Connection','close');fail(res,408,'REQUEST_TIMEOUT');}},10000);
  timer.unref();
  res.once('close',()=>{done=true;clearTimeout(timer);});
  req.on('error',()=>{done=true;clearTimeout(timer);});
  req.on('data',chunk=>{
   if(done)return;
   total+=chunk.length;
   if(total>MAX){done=true;clearTimeout(timer);res.setHeader('Connection','close');fail(res,413,'REQUEST_TOO_LARGE');return;}
   chunks.push(chunk);
  });
  req.on('end',()=>{
   if(done)return;
   done=true;clearTimeout(timer);
   if(!principal.active){fail(res,401,'UNAUTHENTICATED');return;}
   try{
    const body=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
    const result=transport.handle(body,principal);
    send(res,result.status,result.body);
   }catch{fail(res,400,'INVALID_REQUEST');}
  });
 });
 server.maxConnections=32;
 server.maxRequestsPerSocket=50;
 server.setTimeout(15000,socket=>socket.destroy());
 return Object.freeze({server, revoke(subject){const p=entries.find(x=>x.subject===subject);if(p)p.active=false;},listen(port=0){
  if(!Number.isInteger(port)||port<0||port>65535)throw new RangeError('invalid port');
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve(server.address());});});
 },close(){return new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}});
}
