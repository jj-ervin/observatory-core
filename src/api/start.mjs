#!/usr/bin/env node
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {SQLiteResearchArchive,SQLiteEvidenceStore,NewsroomDiscovery} from '../index.mjs';
import {SQLiteResearchAccessAudit} from '../research/sqlite-access-audit.mjs';
import {createObservatoryApi} from './server.mjs';
import {SQLiteApiAudit} from './operation-audit.mjs';
const configPath=process.env.OBSERVATORY_API_CONFIG;
let archive,audit,api,evidence,operationAudit;
try{
 if(!configPath)throw new Error('config required');
 const s=await stat(configPath);
 if(!s.isFile()||s.size>65536||(process.platform!=='win32'&&(s.mode&0o077)!==0))throw new Error('private config required');
 const config=JSON.parse(await readFile(configPath,'utf8'));
 if(typeof config.archive!=='string'||typeof config.audit!=='string'||resolve(config.archive)===resolve(config.audit)||!Number.isInteger(config.port)||config.port<1||config.port>65535)throw new Error('invalid config');
 archive=await SQLiteResearchArchive.open(config.archive);
 audit=await SQLiteResearchAccessAudit.open(config.audit);
 let workspace;
 if(config.workspace!==undefined){
  const w=config.workspace;
  const paths=[config.archive,config.audit,w?.evidence,w?.discovery,w?.operationAudit];
  if(paths.some(p=>typeof p!=='string'||!p.trim())||new Set(paths.map(p=>resolve(p))).size!==paths.length)throw Error('distinct workspace paths required');
  if(w.collectProviders!==undefined&&(!Array.isArray(w.collectProviders)||w.collectProviders.length>10||w.collectProviders.some(p=>typeof p!=='string')))throw Error('invalid collection allowlist');
  evidence=await SQLiteEvidenceStore.open(w.evidence);
  const discovery=await NewsroomDiscovery.open(w.discovery);
  operationAudit=await SQLiteApiAudit.open(w.operationAudit);
  workspace={evidence,discovery,collectProviders:w.collectProviders??[]};
 }
 api=createObservatoryApi({archive,audit,principals:config.principals,workspace,operationAudit});
 const address=await api.listen(config.port);
 process.stdout.write(JSON.stringify({status:'listening',host:address.address,port:address.port,apiVersion:'v1'})+'\n');
 let stopping=false;
 const stop=async()=>{if(stopping)return;stopping=true;try{await api.close();operationAudit?.close();evidence?.close();audit.close();archive.close();}catch{process.exitCode=1;}};
 process.once('SIGINT',stop);process.once('SIGTERM',stop);
}catch{
 if(api?.server.listening)await api.close().catch(()=>{});
 operationAudit?.close();evidence?.close();audit?.close();archive?.close();
 process.stderr.write('Observatory API startup failed; check private configuration and stores\n');process.exitCode=1;
}
