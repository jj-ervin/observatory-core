#!/usr/bin/env node
import {open,readFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {NewsroomDiscovery,SQLiteEvidenceStore,SQLiteResearchArchive,validatePublication} from './index.mjs';

const HELP = 'Observatory CLI — local research and evidence\n\n'+
 'observatory --help | --version\n'+
 'observatory discovery providers --store FILE\n'+
 'observatory discovery configure --store FILE --input JSON\n'+
 'observatory discovery collect --store FILE --provider ID\n'+
 'observatory discovery ingest --store FILE --provider ID --input JSON\n'+
 'observatory discovery list --store FILE [--status STATUS]\n'+
 'observatory discovery triage --store FILE --id ID --decision accept|defer|dismiss\n'+
 'observatory discovery import-briefing --store FILE --input JSON\n'+
 'observatory evidence append --store FILE --input JSON\n'+
 'observatory evidence get --store FILE --ref REF\n'+
 'observatory evidence list --store FILE [--type TYPE] [--limit N] [--offset N]\n'+
 'observatory research search --store FILE --query TEXT [--limit N] [--offset N]\n'+
 'observatory publication validate --manifest FILE --records FILE\n\n'+
 'JSON on stdout; errors on stderr. Exit 0 success, 1 operation failed, 2 usage error.\n'+
 'Use one CLI writer per discovery store; local files require trusted operator access.\n';
class UsageError extends Error {}
class OperationError extends Error {}
const commands={
 'discovery providers':{required:['store']},
 'discovery configure':{required:['store','input']},
 'discovery collect':{required:['store','provider']},
 'discovery ingest':{required:['store','provider','input']},
 'discovery list':{required:['store'],optional:['status']},
 'discovery triage':{required:['store','id','decision']},
 'discovery import-briefing':{required:['store','input']},
 'evidence append':{required:['store','input']},
 'evidence get':{required:['store','ref']},
 'evidence list':{required:['store'],optional:['type','limit','offset']},
 'research search':{required:['store','query'],optional:['limit','offset']},
 'publication validate':{required:['manifest','records']}
};
const MAX_INPUT=10*1024*1024;
async function bytes(path){
 const file=await open(path,'r');
 try{
  const stat=await file.stat();
  if(!stat.isFile()||stat.size>MAX_INPUT)throw new OperationError('Expected a regular input file no larger than 10 MiB');
  const buffer=Buffer.alloc(stat.size+1);
  let total=0;
  while(total<buffer.length){
   const {bytesRead}=await file.read(buffer,total,buffer.length-total,null);
   if(!bytesRead)break;
   total+=bytesRead;
  }
  if(total!==stat.size)throw new OperationError('Input file changed while reading');
  return buffer.subarray(0,total);
 }finally{await file.close();}
}
async function json(path){
 try{return JSON.parse((await bytes(path)).toString('utf8'));}
 catch(e){if(e instanceof SyntaxError)throw new OperationError('Invalid JSON input');throw e;}
}
function integer(value,name,min,max){
 if(value===undefined)return undefined;
 if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<min||Number(value)>max)throw new UsageError('Invalid --'+name);
 return Number(value);
}
function options(command,args){
 const spec=commands[command];if(!spec)throw new UsageError('Unknown command');
 const allowed=[...spec.required,...(spec.optional??[])];
 let parsed;
 try{parsed=parseArgs({args,options:Object.fromEntries(allowed.map(k=>[k,{type:'string',multiple:true}])),strict:true,allowPositionals:false}).values;}
 catch{throw new UsageError('Unknown option, unexpected argument or missing option value');}
 const out={};
 for(const k of allowed){
  if(parsed[k]?.length>1)throw new UsageError('Duplicate --'+k);
  if(parsed[k]?.length===1){if(!parsed[k][0].trim())throw new UsageError('Empty --'+k);out[k]=parsed[k][0];}
 }
 for(const k of spec.required)if(out[k]===undefined)throw new UsageError('Missing --'+k);
 if(out.status&&!['unreviewed','accept','defer','dismiss'].includes(out.status))throw new UsageError('Invalid --status');
 if(out.decision&&!['accept','defer','dismiss'].includes(out.decision))throw new UsageError('Invalid --decision');
 if(out.limit!==undefined)out.limit=integer(out.limit,'limit',1,100);
 if(out.offset!==undefined)out.offset=integer(out.offset,'offset',0,10000);
 return out;
}
async function execute(command,o){
 if(command.startsWith('discovery ')){
  // Read and validate external input before opening a store.
  const input=o.input?await json(o.input):undefined;
  if(command==='discovery ingest'&&(!Array.isArray(input)||input.length>1000))throw new OperationError('Expected an array of at most 1000 discovery records');
  const n=await NewsroomDiscovery.open(o.store);
  switch(command){
   case 'discovery providers':return n.providers();
   case 'discovery configure':return n.configure(input);
   case 'discovery collect':return n.collect(o.provider);
   case 'discovery ingest':return n.ingest(o.provider,input);
   case 'discovery list':return n.list().filter(row=>!o.status||row.reviewStatus===o.status);
   case 'discovery triage':return n.triage(o.id,o.decision);
   case 'discovery import-briefing':return n.importBriefing(input);
  }
 }
 if(command.startsWith('evidence ')){
  const input=o.input?await json(o.input):undefined;
  const store=await SQLiteEvidenceStore.open(o.store);
  try{
   switch(command){
    case 'evidence append':return {ref:store.append(input)};
    case 'evidence get':{const record=store.get(o.ref);if(!record)throw new OperationError('Record not found');return record;}
    case 'evidence list':return store.query({recordType:o.type,limit:o.limit,offset:o.offset});
   }
  }finally{store.close();}
 }
 if(command==='research search'){
  const archive=await SQLiteResearchArchive.open(o.store);
  try{return archive.searchCitations(o.query,{limit:o.limit,offset:o.offset});}
  finally{archive.close();}
 }
 if(command==='publication validate'){
  const errors=validatePublication(await json(o.manifest),await bytes(o.records));
  if(errors.length)throw new OperationError('Publication validation failed');
  return {valid:true,authority:'candidate-only'};
 }
 throw new UsageError('Unknown command');
}
async function main(args){
 if(args.length===0||args.length===1&&['--help','-h'].includes(args[0])){process.stdout.write(HELP);return;}
 if(args.length===1&&args[0]==='--version'){
  const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  process.stdout.write(pkg.version+'\n');return;
 }
 const command=args.slice(0,2).join(' ');
 if(!Object.hasOwn(commands,command))throw new UsageError('Unknown command');
 if(args.length===3&&args[2]==='--help'){process.stdout.write(HELP);return;}
 const result=await execute(command,options(command,args.slice(2)));
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
try{await main(process.argv.slice(2));}
catch(e){
 const usage=e instanceof UsageError;
 // Do not echo arbitrary provider exceptions, credentials, local paths or input.
 const message=usage||e instanceof OperationError?e.message:'Operation failed; check input, store and provider configuration';
 process.stderr.write('observatory: '+message+'\n');
 process.exitCode=usage?2:1;
}
