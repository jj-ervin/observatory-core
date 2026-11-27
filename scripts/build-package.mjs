import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const scratch=join(root,'.scratch');await mkdir(scratch,{recursive:true});
const stage=await mkdtemp(join(scratch,'build-package-'));
const npm=process.env.npm_execpath;
try{
 if(!npm)throw new Error('Run npm run build');
 const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
 assert.equal(pkg.private,true);assert.equal(pkg.license,'UNLICENSED');
 const [packed]=JSON.parse(execFileSync(process.execPath,[npm,'pack','--ignore-scripts','--json','--pack-destination',stage],{cwd:root,encoding:'utf8'}));
 assert.equal(packed.name,pkg.name);assert.equal(packed.version,pkg.version);
 for(const file of ['LICENSE','COPYRIGHT','src/index.mjs','src/cli.mjs','src/api/start.mjs','src/mcp/start.mjs','src/mcp/server.mjs','schemas/api/v1/openapi.json','schemas/core/0.1.0/records.schema.json'])assert.ok(packed.files.some(f=>f.path===file),file+' missing');
 assert.ok(!packed.files.some(f=>/^(test|tests|\.scratch|dist)\//.test(f.path)));
 const bytes=await readFile(join(stage,packed.filename));
 assert.equal(packed.integrity,'sha512-'+createHash('sha512').update(bytes).digest('base64'));
 const dist=join(root,'dist');await mkdir(dist,{recursive:true});
 const output=join(dist,packed.filename);
 await rm(output,{force:true});await rename(join(stage,packed.filename),output);
 console.log(JSON.stringify({artifact:'dist/'+packed.filename,name:pkg.name,version:pkg.version,sha256:createHash('sha256').update(bytes).digest('hex'),integrity:packed.integrity},null,2));
}finally{await rm(stage,{recursive:true,force:true});}
