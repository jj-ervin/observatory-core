/**
 * OC-08B: DNS-pinned HTTPS feed transport for Node.
 * Explicit hostname allowlist; reject private/non-public addresses and redirects.
 * HTTP is intentionally disallowed here even though the retrieval interface accepts it.
 * This is a first security boundary, not a complete egress sandbox.
 */
import https from "node:https";
import {lookup as dnsLookup} from "node:dns/promises";
import {isIP} from "node:net";
function publicAddress(address){
 if(isIP(address)===4){
  const p=address.split(".").map(Number),[a,b,c]=p;
  return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===192&&b===0&&c===0||a===192&&b===0&&c===2||a===198&&b===18||a===198&&b===19||a===198&&b===51&&c===100||a===203&&b===0&&c===113||a>=240);
 }
 if(isIP(address)===6){
  const v=address.toLowerCase();
  if(v.includes("."))return false;
  const first=parseInt(v.split(":")[0]||"0",16);
  return !(v==="::"||v==="::1"||v.startsWith("::ffff:")||(first&0xfe00)===0xfc00||(first&0xffc0)===0xfe80||(first&0xff00)===0xff00||first===0x2001);
 }
 return false;
}
export function createSecureFeedTransport({allowedHosts,approvedAddresses,resolveHost=dnsLookup}={}){
 if(!Array.isArray(allowedHosts)||allowedHosts.length===0||allowedHosts.some(h=>typeof h!=="string"||!h||h!==h.toLowerCase()||h.includes(":")||h.includes("/")))
  throw new TypeError("explicit lowercase allowedHosts required");
 const hosts=new Set(allowedHosts);
 // Explicit IP approval is mandatory until comprehensive public-address classification is reviewed.
 if(!approvedAddresses || typeof approvedAddresses!=="object" || Array.isArray(approvedAddresses))throw new TypeError("approvedAddresses required");
 for(const host of hosts){
  const ips=approvedAddresses[host];
  if(!Array.isArray(ips)||ips.length===0||ips.some(ip=>!publicAddress(ip)))throw new TypeError("public approvedAddresses required for "+host);
 }
 return async function transport(url,{signal,redirect}={}){
  const u=new URL(url);
  if(u.protocol!=="https:"||u.username||u.password||u.hash||u.port&&u.port!=="443"||!hosts.has(u.hostname)||isIP(u.hostname))
   throw new TypeError("destination not authorized");
  if(redirect!=="error")throw new TypeError("redirect rejection required");
  const addresses=await resolveHost(u.hostname,{all:true,verbatim:true});
  const approved=new Set(approvedAddresses[u.hostname]);
  if(!Array.isArray(addresses)||addresses.length===0||addresses.some(a=>!publicAddress(a.address)||!approved.has(a.address)))
   throw new Error("unsafe DNS resolution");
  if(signal?.aborted)throw new Error("retrieval aborted");
  const pinned=addresses[0];
  return new Promise((resolve,reject)=>{
   const req=https.get(u,{signal,lookup:(_host,options,callback)=>options?.all?callback(null,[{address:pinned.address,family:pinned.family}]):callback(null,pinned.address,pinned.family),headers:{accept:"application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.8"}},res=>{
    const status=res.statusCode??0;
    if(status!==200){res.destroy();reject(new Error("feed HTTP status "+status));return;}
    // Adapt Node stream to WHATWG stream; retrieveFeed enforces byte limits.
    res.pause();
    const body=new ReadableStream({
     start(controller){
      res.on("data",chunk=>{res.pause();try{controller.enqueue(new Uint8Array(chunk));}catch(error){controller.error(error);res.destroy(error);}});
      res.on("end",()=>controller.close());
      res.on("error",error=>controller.error(error));
     },
     pull(){res.resume();},
     cancel(){res.destroy();}
    },{highWaterMark:1});
    resolve({status,headers:{get:name=>res.headers[String(name).toLowerCase()]??null},body});
   });
   req.on("error",reject);
  });
 };
}
