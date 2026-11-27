import test from "node:test";
import assert from "node:assert/strict";
import {createSecureFeedTransport} from "../src/ingestion/secure-http-transport.mjs";
const dns=async()=>[{address:"93.184.216.34",family:4}];
test("requires explicit allowlist and approved addresses",()=>{
 assert.throws(()=>createSecureFeedTransport(),/allowedHosts/);
 assert.throws(()=>createSecureFeedTransport({allowedHosts:["EXAMPLE.ORG"]}),/allowedHosts/);
 assert.throws(()=>createSecureFeedTransport({allowedHosts:["example.org"]}),/approvedAddresses/);
 assert.throws(()=>createSecureFeedTransport({allowedHosts:["example.org"],approvedAddresses:{"example.org":["127.0.0.1"]}}),/public approvedAddresses/);
});
test("rejects HTTP, unlisted hosts, IP literals, and redirects before transport",async()=>{
 const transport=createSecureFeedTransport({allowedHosts:["example.org"],approvedAddresses:{"example.org":["93.184.216.34"]},resolveHost:dns});
 await assert.rejects(transport("http://example.org/rss",{redirect:"error"}),/not authorized/);
 await assert.rejects(transport("https://other.org/rss",{redirect:"error"}),/not authorized/);
 await assert.rejects(transport("https://127.0.0.1/rss",{redirect:"error"}),/not authorized/);
 await assert.rejects(transport("https://example.org/rss",{redirect:"follow"}),/redirect rejection/);
});
test("rejects mixed public and private DNS answers before opening connection",async()=>{
 const transport=createSecureFeedTransport({allowedHosts:["example.org"],approvedAddresses:{"example.org":["93.184.216.34"]},resolveHost:async()=>[{address:"93.184.216.34",family:4},{address:"127.0.0.1",family:4}]});
 await assert.rejects(transport("https://example.org/rss",{redirect:"error"}),/unsafe DNS/);
});
test("rejects reserved, local, and non-public address answers",async()=>{
 for(const address of ["10.1.2.3","192.168.1.2","169.254.1.2","100.64.1.1","203.0.113.10","::1","fc00::1","fe80::1"]){
  const transport=createSecureFeedTransport({allowedHosts:["example.org"],approvedAddresses:{"example.org":["93.184.216.34"]},resolveHost:async()=>[{address,family:address.includes(":")?6:4}]});
  await assert.rejects(transport("https://example.org/rss",{redirect:"error"}),/unsafe DNS/,address);
 }
});

test("rejects ambiguous hosts and special-use IPv6 forms",()=>{
 for(const host of ["*.example.org","example.org.","example.org:443","127.0.0.1","localhost","-bad.example.org","example..org"]){assert.throws(()=>createSecureFeedTransport({allowedHosts:[host],approvedAddresses:{[host]:["93.184.216.34"]}}),/allowedHosts/);}
 for(const address of ["0:0:0:0:0:0:0:1","0:0:0:0:0:ffff:7f00:1","::ffff:7f00:1","::192.0.2.1","64:ff9b::7f00:1","2002:7f00:1::","3fff::1","fec0::1"]){assert.throws(()=>createSecureFeedTransport({allowedHosts:["example.org"],approvedAddresses:{"example.org":[address]}}),/public approvedAddresses/,address);}
 assert.doesNotThrow(()=>createSecureFeedTransport({allowedHosts:["example.org"],approvedAddresses:{"example.org":["2606:4700::1111"]}}));
});
test("pins are copied and inconsistent DNS address families rejected",async()=>{
 const ips={"example.org":["93.184.216.34"]};
 const transport=createSecureFeedTransport({allowedHosts:["example.org"],approvedAddresses:ips,resolveHost:async()=>[{address:"1.1.1.1",family:4}]});
 ips["example.org"].push("1.1.1.1");
 await assert.rejects(transport("https://example.org/rss",{redirect:"error"}),/unsafe DNS/);
 const wrong=createSecureFeedTransport({allowedHosts:["example.org"],approvedAddresses:ips,resolveHost:async()=>[{address:"93.184.216.34",family:6}]});
 await assert.rejects(wrong("https://example.org/rss",{redirect:"error"}),/unsafe DNS/);
});
