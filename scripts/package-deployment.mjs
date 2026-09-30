import {access,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const output=resolve('.sites-runtime/lucianos-deploy.tar.gz');
for(const required of ['.openai/hosting.json','dist/server/index.js','dist/client','dist/.openai/hosting.json','drizzle/meta/_journal.json'])await access(required);
await mkdir('.sites-runtime',{recursive:true});
// Include the entire generated output and the schema migrations at their
// source paths. The previous archive omitted dist/.openai and root drizzle.
const result=spawnSync('tar',['-czf',output,'.openai','dist','drizzle'],{encoding:'utf8',windowsHide:true});
if(result.status!==0)throw new Error(result.stderr);
const listing=spawnSync('tar',['-tf',output],{encoding:'utf8',windowsHide:true});
if(listing.status!==0||!listing.stdout.includes('dist/.openai/drizzle/')||!listing.stdout.includes('drizzle/meta/_journal.json'))throw new Error('Deployment archive is missing migration metadata.');
console.log(JSON.stringify({archive:output,migrationsIncluded:true}));
