// Deliberately no arbitrary command execution, shell, or public listener.
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const mode=process.argv[2];
if(process.getuid?.()!==1000||process.getgid?.()!==1000||!['api','mcp','cli'].includes(mode)){process.stderr.write('Invalid container mode or runtime identity\n');process.exit(1);}
if(mode!=='cli'&&process.argv.length!==3){process.stderr.write('Unexpected arguments\n');process.exit(1);}
if(mode==='api'){
 try{
  const config=JSON.parse(await readFile(process.env.OBSERVATORY_API_CONFIG,'utf8'));
  if(config.port!==8787||config.workspace?.collectProviders?.length)throw Error('offline container requires port 8787');
 }catch{process.stderr.write('Invalid offline container API configuration\n');process.exit(1);}
}
const path=fileURLToPath(new URL(mode==='api'?'../api/start.mjs':mode==='mcp'?'../mcp/start.mjs':'../cli.mjs',import.meta.url));
const child=spawn(process.execPath,[path,...(mode==='cli'?process.argv.slice(3):[])],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>{process.stderr.write('Container process unavailable\n');process.exitCode=1;});
child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
