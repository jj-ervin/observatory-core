#!/usr/bin/env node
import {open} from 'node:fs/promises';
import {resolve} from 'node:path';
import {SQLiteResearchArchive,SQLiteEvidenceStore,NewsroomDiscovery} from '../index.mjs';
import {SQLiteResearchAccessAudit} from '../research/sqlite-access-audit.mjs';
import {SQLiteApiAudit} from '../api/operation-audit.mjs';
import {createMcpSession,serveStdio} from './server.mjs';
const stores=[];
try{
 const path=process.env.OBSERVATORY_MCP_CONFIG;if(!path)throw Error('config required');
 const file=await open(path,'r');let config;
 try{const s=await file.stat();if(!s.isFile()||s.size>65536||(process.platform!=='win32'&&(s.mode&0o077)!==0))throw Error('private config required');
 const bytes=Buffer.alloc(s.size+1);let n=0;while(n<bytes.length){const result=await file.read(bytes,n,bytes.length-n,null);if(!result.bytesRead)break;n+=result.bytesRead;}
 if(n!==s.size)throw Error('config changed');config=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,n)));}finally{await file.close();}
 const paths=[config.archive,config.audit,...(config.workspace?[config.workspace.evidence,config.workspace.discovery,config.workspace.operationAudit]:[])];
 if(paths.some(p=>typeof p!=='string'||!p.trim())||new Set(paths.map(p=>resolve(p))).size!==paths.length)throw Error('distinct store paths required');
 const archive=await SQLiteResearchArchive.open(config.archive);stores.push(archive);
 const audit=await SQLiteResearchAccessAudit.open(config.audit);stores.push(audit);
 let workspace,operationAudit;
 if(config.workspace){const evidence=await SQLiteEvidenceStore.open(config.workspace.evidence);stores.push(evidence);
 const discovery=await NewsroomDiscovery.open(config.workspace.discovery);operationAudit=await SQLiteApiAudit.open(config.workspace.operationAudit);stores.push(operationAudit);workspace={evidence,discovery};}
 const session=createMcpSession({archive,audit,workspace,operationAudit,subject:config.subject,documentIds:config.documentIds,actions:config.actions,permissions:config.permissions??[]});
 await serveStdio(session);
}catch{process.stderr.write('Observatory MCP unavailable; check private host configuration\n');process.exitCode=1;}
finally{for(const store of stores.reverse()){try{store.close();}catch{process.exitCode=1;}}}
