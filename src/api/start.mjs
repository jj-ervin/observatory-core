#!/usr/bin/env node
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {SQLiteResearchArchive} from '../index.mjs';
import {SQLiteResearchAccessAudit} from '../research/sqlite-access-audit.mjs';
import {createObservatoryApi} from './server.mjs';
const configPath=process.env.OBSERVATORY_API_CONFIG;
let archive,audit,api;
try{
 if(!configPath)throw new Error('config required');
 const s=await stat(configPath);
 if(!s.isFile()||s.size>65536||(process.platform!=='win32'&&(s.mode&0o077)!==0))throw new Error('private config required');
 const config=JSON.parse(await readFile(configPath,'utf8'));
 if(typeof config.archive!=='string'||typeof config.audit!=='string'||resolve(config.archive)===resolve(config.audit)||!Number.isInteger(config.port)||config.port<1||config.port>65535)throw new Error('invalid config');
 archive=await SQLiteResearchArchive.open(config.archive);
 audit=await SQLiteResearchAccessAudit.open(config.audit);
 api=createObservatoryApi({archive,audit,principals:config.principals});
 const address=await api.listen(config.port);
 process.stdout.write(JSON.stringify({status:'listening',host:address.address,port:address.port,apiVersion:'v1'})+'\n');
 let stopping=false;
 const stop=async()=>{if(stopping)return;stopping=true;try{await api.close();audit.close();archive.close();}catch{process.exitCode=1;}};
 process.once('SIGINT',stop);process.once('SIGTERM',stop);
}catch{
 if(api?.server.listening)await api.close().catch(()=>{});
 audit?.close();archive?.close();
 process.stderr.write('Observatory API startup failed; check private configuration and stores\n');process.exitCode=1;
}
