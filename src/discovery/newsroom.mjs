/** GC-NEWS-001A: independent discovery intake. Nothing here publishes content. */
import {readFile, writeFile, rename, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID, createHash} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {parseFeed} from '../ingestion/feed-parser.mjs';
import {retrieveFeed} from '../ingestion/feed-retriever.mjs';
import {createSecureFeedTransport} from '../ingestion/secure-http-transport.mjs';

export const DISCOVERY_SCHEMA = 'gc.discovery/1';
const sha = s => createHash('sha256').update(s).digest('hex');
const iso = value => { const d = new Date(value); return Number.isNaN(d.valueOf()) ? null : d.toISOString(); };
const urlOf = value => { const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password || u.hash || isIP(u.hostname)) throw new TypeError('Public HTTPS URL required'); return u.href; };
const clean = (value, limit=2000) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0,limit);
export function normalizeDiscovery(item, providerId, discoveredAt=new Date().toISOString()) {
  const sourceUrl=urlOf(item.sourceUrl || item.url);
  const title=clean(item.title,400);
  if (!title) throw new TypeError('Discovery title required');
  const canonicalUrl=new URL(sourceUrl); canonicalUrl.hash='';
  for (const key of [...canonicalUrl.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) canonicalUrl.searchParams.delete(key);
  const id='article-'+sha(canonicalUrl.href);
  return {schema:DISCOVERY_SCHEMA,id,sourceUrl,title,source:clean(item.source || canonicalUrl.hostname,200),publishedAt:iso(item.publishedAt),discoveredAt:iso(discoveredAt),summary:clean(item.summary),topics:[...new Set((item.topics||[]).map(x=>clean(x,80)).filter(Boolean))].slice(0,20),providerId,provenance:{providerId,externalId:clean(item.externalId,300),rawRef:clean(item.rawRef,500)}};
}
const defaults = [
  {id:'rss',type:'rss',name:'RSS / Atom',enabled:true,feeds:['https://www.nist.gov/news-events/news/rss.xml']},
  {id:'openalex',type:'openalex',name:'OpenAlex',enabled:false,query:'governance'},
  {id:'daily-ai',type:'briefing',name:'GC Daily AI News',enabled:true},
  {id:'brave',type:'brave',name:'Web search',enabled:false,queries:[]}
];
function validProvider(p) {
  if (!p || !/^[a-z][a-z0-9-]{0,39}$/.test(p.id) || !['rss','openalex','briefing','brave'].includes(p.type) || typeof p.enabled!=='boolean') throw new TypeError('Invalid provider');
  const feeds=(p.feeds||[]).map(urlOf), queries=(p.queries||[]).map(x=>clean(x,200)).filter(Boolean);
  if (feeds.length>30 || queries.length>30) throw new TypeError('Too many provider inputs');
  if(p.kind==='saved-pull'&&p.type==='briefing')throw new TypeError('Saved pulls require a collectable source');
  if(p.kind==='saved-pull'&&!(p.type==='rss'?feeds.length:p.type==='openalex'?clean(p.query):queries.length))throw new TypeError('Saved pull needs a feed or query');
  return {id:p.id,type:p.type,name:clean(p.name||p.id,100),enabled:p.enabled,feeds,queries,query:clean(p.query,200),kind:p.kind==='saved-pull'?'saved-pull':undefined,context:clean(p.context,120)};
}
async function save(file, state) {
  await mkdir(dirname(file),{recursive:true}); const temp=file+'.'+randomUUID()+'.tmp';
  await writeFile(temp,JSON.stringify(state)+'\n',{flag:'wx',mode:0o600}); await rename(temp,file);
}
async function jsonRequest(url,{headers={}}={}) {
  let last;
  for(let attempt=0;attempt<2;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try { const r=await fetch(url,{headers,signal:controller.signal,redirect:'error'}); if (!r.ok) throw Error(`HTTP ${r.status}`);
      const reader=r.body.getReader(),chunks=[];let size=0;
      try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw Error('Response too large');chunks.push(value);}}finally{reader.releaseLock();}
      return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
    }catch(e){last=e;if(attempt===0)await new Promise(r=>setTimeout(r,300));}
    finally { clearTimeout(timer); }
  }
  throw last;
}
async function rssItems(provider) {
  const rows=[];
  for (const feed of provider.feeds) {
    const host=new URL(feed).hostname, addresses=await lookup(host,{all:true,verbatim:true});
    const transport=createSecureFeedTransport({allowedHosts:[host],approvedAddresses:{[host]:addresses.map(x=>x.address)}});
    let error;
    for(let attempt=0;attempt<2;attempt++) try {
      const result=await retrieveFeed(feed,{transport,timeoutMs:10000}); const parsed=parseFeed(result.xml);
      for(const entry of parsed.entries) if(entry.url?.startsWith('https://')) rows.push({...entry,sourceUrl:entry.url,source:parsed.title||host,rawRef:feed+'#sha256='+sha(result.xml),topics:[]});
      error=null; break;
    } catch(e) {error=e; if(attempt===0) await new Promise(r=>setTimeout(r,300));}
    if(error) throw error;
  }
  return rows;
}
async function openAlexItems(provider) {
  const data=await jsonRequest('https://api.openalex.org/works?search='+encodeURIComponent(provider.query||'governance')+'&per-page=20');
  return (data.results||[]).map(x=>({...x,sourceUrl:[x.primary_location?.landing_page_url,x.doi,x.id].find(u=>u?.startsWith('https://'))})).filter(x=>x.sourceUrl).map(x=>({sourceUrl:x.sourceUrl,title:x.title,source:x.primary_location?.source?.display_name||'OpenAlex',publishedAt:x.publication_date,summary:'Research work indexed by OpenAlex.',topics:(x.topics||[]).slice(0,5).map(t=>t.display_name),externalId:x.id,rawRef:x.id}));
}
async function braveItems(provider, key) {
  if(!key) throw Error('BRAVE_SEARCH_API_KEY is not configured');
  const rows=[];
  for(const query of provider.queries) {
    const data=await jsonRequest('https://api.search.brave.com/res/v1/web/search?q='+encodeURIComponent(query),{headers:{'X-Subscription-Token':key,Accept:'application/json'}});
    rows.push(...(data.web?.results||[]).map(x=>({sourceUrl:x.url,title:x.title,source:x.profile?.name||new URL(x.url).hostname,summary:x.description,topics:[],externalId:x.url,rawRef:'brave:'+query})));
  }
  return rows;
}
export class NewsroomDiscovery {
  constructor(file,state){this.file=file;this.state=state;this.queue=Promise.resolve();}
  static async open(file) {
    let state; try {state=JSON.parse(await readFile(file,'utf8'));} catch(e){if(e.code!=='ENOENT')throw e;state={schema:'gc.newsroom-store/1',providers:defaults,articles:[],events:[],triage:{},status:{}};}
    if(state.schema!=='gc.newsroom-store/1'||!Array.isArray(state.providers)||!Array.isArray(state.articles)||!Array.isArray(state.events))throw Error('Invalid discovery store');
    return new NewsroomDiscovery(file,state);
  }
  async mutate(fn){const job=this.queue.then(async()=>{const next=structuredClone(this.state),out=fn(next);await save(this.file,next);this.state=next;return out;});this.queue=job.catch(()=>{});return job;}
  list(){return this.state.articles.map(a=>({...a,providers:[...new Set(this.state.events.filter(e=>e.articleId===a.id).map(e=>e.providerId))],reviewStatus:this.state.triage[a.id]?.decision||'unreviewed'})).sort((a,b)=>b.discoveredAt.localeCompare(a.discoveredAt));}
  providers(){return this.state.providers.map(p=>({...p,status:this.state.status[p.id]||{health:'never run',lastRun:null,lastSuccess:null,error:null}}));}
  async configure(input){const p=validProvider(input);return this.mutate(s=>{const i=s.providers.findIndex(x=>x.id===p.id);if(i<0)s.providers.push(p);else s.providers[i]=p;return p;});}
  async ingest(providerId,items,at=new Date().toISOString()){
    if(!this.state.providers.some(p=>p.id===providerId))throw TypeError('Unknown provider');
    const records=items.map(x=>normalizeDiscovery(x,providerId,at));
    return this.mutate(s=>{let added=0;for(const r of records){const eventKey=sha(providerId+'\n'+r.id+'\n'+r.provenance.externalId+'\n'+r.provenance.rawRef);if(s.events.some(e=>e.key===eventKey))continue;
      s.events.push({key:eventKey,articleId:r.id,providerId,discoveredAt:at,provenance:r.provenance});
      const existing=s.articles.find(a=>a.id===r.id);if(existing){existing.summary ||= r.summary;existing.topics=[...new Set([...existing.topics,...r.topics])];}else{s.articles.push(r);added++;}}
      return {added,events:records.length};});
  }
  async triage(id,decision){if(!['accept','defer','dismiss'].includes(decision))throw TypeError('Invalid decision');if(!this.state.articles.some(a=>a.id===id))throw TypeError('Unknown article');return this.mutate(s=>{s.triage[id]={decision,at:new Date().toISOString()};return s.triage[id];});}
  async collect(id,{braveKey=process.env.BRAVE_SEARCH_API_KEY}={}){
    const p=this.state.providers.find(x=>x.id===id);if(!p)throw TypeError('Unknown provider');if(!p.enabled)throw Error('Provider disabled');
    const at=new Date().toISOString();await this.mutate(s=>{s.status[id]={...(s.status[id]||{}),health:'running',lastRun:at,error:null};});
    try {const items=p.type==='rss'?await rssItems(p):p.type==='openalex'?await openAlexItems(p):p.type==='brave'?await braveItems(p,braveKey):(()=>{throw Error('Import a structured briefing file to collect this provider')})();
      const result=await this.ingest(id,items,at);await this.mutate(s=>{s.status[id]={health:'ok',lastRun:at,lastSuccess:new Date().toISOString(),error:null};});return result;
    }catch(e){await this.mutate(s=>{s.status[id]={...(s.status[id]||{}),health:'error',lastRun:at,error:String(e.message).slice(0,300)};});throw e;}
  }
  async importBriefing(data){if(data?.schema!=='gc.daily-ai-news/1'||!Array.isArray(data.items)||data.items.length>100)throw TypeError('Expected gc.daily-ai-news/1 items');
    const result=await this.ingest('daily-ai',data.items.map(x=>({...x,rawRef:x.rawRef||'structured-import'})));
    await this.mutate(s=>{s.status['daily-ai']={health:'ok',lastRun:new Date().toISOString(),lastSuccess:new Date().toISOString(),error:null};});return result;}
}
