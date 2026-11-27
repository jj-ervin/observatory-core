// Independent installed-process MCP test; uses JSON-RPC over real stdio.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function verifyInstalledMcp(consumer){
 const config=join(consumer,'mcp-config.json');
 await writeFile(config,JSON.stringify({subject:'installed-fixture',archive:join(consumer,'mcp-archive.sqlite'),audit:join(consumer,'mcp-research-audit.sqlite'),workspace:{evidence:join(consumer,'evidence.sqlite'),discovery:join(consumer,'news.json'),operationAudit:join(consumer,'mcp-ops.sqlite')},documentIds:[],actions:[],permissions:['evidence:read']}),{mode:0o600});
 const child=spawn(process.execPath,[join(consumer,'node_modules','observatory-core','src','mcp','start.mjs')],{cwd:consumer,env:{...process.env,OBSERVATORY_MCP_CONFIG:config},stdio:['pipe','pipe','pipe']});
 const closed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});closed.catch(()=>{});
 const messages=[{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'independent-fixture',version:'1'}}},{jsonrpc:'2.0',method:'notifications/initialized'},{jsonrpc:'2.0',id:2,method:'tools/list'},{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'evidence_get',arguments:{ref:'evidence:e@1'}}},{jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'evidence_append',arguments:{}}}];
 let stdout='';child.stdout.on('data',c=>{stdout+=c;if(stdout.length>256*1024)child.kill();});child.stderr.resume();
 child.stdin.on('error',()=>{});child.stdin.end(messages.map(x=>JSON.stringify(x)).join('\n')+'\n');
 const timer=setTimeout(()=>child.kill(),15000);
 try{assert.equal(await closed,0);const results=stdout.trim().split('\n').map(JSON.parse);assert.equal(results.length,4);assert.equal(results[0].result.protocolVersion,'2025-11-25');assert.deepEqual(results[1].result.tools.map(t=>t.name),['evidence_get','evidence_list']);assert.equal(results[2].result.structuredContent.data.assertion,'Synthetic');assert.equal(results[2].result.structuredContent.trust,'untrusted-source-data');assert.equal(results[3].error.code,-32602);console.log('Independent installed MCP stdio consumer passed');}
 finally{clearTimeout(timer);if(child.exitCode===null&&child.signalCode===null)child.kill();}
}
