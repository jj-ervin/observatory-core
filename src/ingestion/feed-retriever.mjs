/** OC-08A: bounded retrieval through an injected, separately authorized transport.
 * Transport MUST enforce destination allowlisting, DNS/IP and redirect SSRF checks.
 * No built-in network transport is supplied by this module.
 */
export async function retrieveFeed(url,{transport,signal,maxBytes=2_000_000,timeoutMs=10_000}={}){
 const parsed=new URL(url);
 if(!["http:","https:"].includes(parsed.protocol)||parsed.username||parsed.password||parsed.hash)throw new TypeError("invalid feed URL");
 if(typeof transport!=="function")throw new TypeError("authorized transport required");
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>2_000_000)throw new RangeError("invalid byte limit");
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60_000)throw new RangeError("invalid timeout");
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)throw new Error("retrieval aborted");
 signal?.addEventListener("abort",abort,{once:true});
 const timer=setTimeout(abort,timeoutMs);
 let reader,body,complete=false;
 const cancel=target=>{try{Promise.resolve(target?.cancel()).catch(()=>{});}catch{}};
 const bounded=promise=>{
  if(controller.signal.aborted){Promise.resolve(promise).catch(()=>{});return Promise.reject(new Error("retrieval aborted"));}
  return new Promise((resolve,reject)=>{
   const stop=()=>reject(new Error("retrieval aborted"));
   controller.signal.addEventListener("abort",stop,{once:true});
   Promise.resolve(promise).then(resolve,reject).finally(()=>controller.signal.removeEventListener("abort",stop));
  });
 };
 try{
  const pending=Promise.resolve().then(()=>transport(parsed.href,{signal:controller.signal,redirect:"error"}));
  pending.then(response=>{if(controller.signal.aborted)cancel(response?.body);},()=>{});
  const response=await bounded(pending);
  body=response?.body;
  if(!response||response.status!==200||!response.body?.getReader)throw new Error("invalid feed response or status");
  const length=response.headers?.get?.("content-length");
  if(length!=null&&/^\d+$/.test(length)&&Number(length)>maxBytes)throw new RangeError("feed exceeds byte limit");
  reader=response.body.getReader();const chunks=[];let total=0;
  {
   while(true){
    if(controller.signal.aborted)throw new Error("retrieval aborted");
    const {done,value}=await bounded(reader.read());
    if(done){complete=true;break;}
    if(!(value instanceof Uint8Array))throw new TypeError("invalid response chunk");
    total+=value.byteLength;
    if(total>maxBytes)throw new RangeError("feed exceeds byte limit");
    chunks.push(value);
   }
  }
  if(controller.signal.aborted)throw new Error("retrieval aborted");
  const bytes=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return {url:parsed.href,xml:new TextDecoder("utf-8",{fatal:true}).decode(bytes),byteLength:total};
 }finally{
  if(!complete)cancel(reader??body);
  if(reader)reader.releaseLock();
  clearTimeout(timer);signal?.removeEventListener("abort",abort);
 }
}
