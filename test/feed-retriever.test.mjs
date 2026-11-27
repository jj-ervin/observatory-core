import test from "node:test";
import assert from "node:assert/strict";
import {retrieveFeed} from "../src/ingestion/feed-retriever.mjs";
const response=(body,headers={})=>new Response(body,{status:200,headers});
test("retrieves bounded UTF-8 through injected transport",async()=>{
 const result=await retrieveFeed("https://example.org/rss",{transport:async(url,opts)=>{
  assert.equal(url,"https://example.org/rss");assert.equal(opts.redirect,"error");
  return response("<rss/>");
 }});
 assert.equal(result.xml,"<rss/>");assert.equal(result.byteLength,6);
});
test("rejects untrusted transport omission and invalid URLs",async()=>{
 await assert.rejects(retrieveFeed("https://example.org/"),/authorized transport/);
 await assert.rejects(retrieveFeed("file:///etc/passwd",{transport:async()=>response("x")}),/invalid feed URL/);
 await assert.rejects(retrieveFeed("https://u:p@example.org/",{transport:async()=>response("x")}),/invalid feed URL/);
});
test("enforces declared and streamed byte limits",async()=>{
 await assert.rejects(retrieveFeed("https://example.org",{maxBytes:3,transport:async()=>response("hello",{"content-length":"5"})}),/byte limit/);
 await assert.rejects(retrieveFeed("https://example.org",{maxBytes:3,transport:async()=>response("hello")}),/byte limit/);
});
test("rejects non-200 and invalid UTF-8",async()=>{
 await assert.rejects(retrieveFeed("https://example.org",{transport:async()=>new Response("no",{status:404})}),/invalid feed response/);
 await assert.rejects(retrieveFeed("https://example.org",{transport:async()=>response(new Uint8Array([255]))}),TypeError);
});

test("cancels response on declared and streamed overflow",async()=>{
 for(const headers of [{"content-length":"5"},{}]){
  let cancelled=false;
  const body=new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2,3,4,5]));},cancel(){cancelled=true;}});
  await assert.rejects(retrieveFeed("https://example.org",{maxBytes:3,transport:async()=>response(body,headers)}),/byte limit/);
  assert.equal(cancelled,true);
 }
});
test("deadline rejects stalled transport and cancels late response",async()=>{
 let finish,cancelled=false;
 const pending=new Promise(resolve=>{finish=resolve;});
 await assert.rejects(retrieveFeed("https://example.org",{timeoutMs:20,transport:()=>pending}),/aborted/);
 finish(response(new ReadableStream({cancel(){cancelled=true;}})));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(cancelled,true);
});
test("deadline rejects stalled reader even when cancellation does not settle",async()=>{
 let cancelled=false;
 const body=new ReadableStream({pull(){return new Promise(()=>{});},cancel(){cancelled=true;return new Promise(()=>{});}});
 await assert.rejects(retrieveFeed("https://example.org",{timeoutMs:20,transport:async()=>response(body)}),/aborted/);
 assert.equal(cancelled,true);
});
