import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {hashPassword,verifyPassword} from '../lib/password.ts';

// Run only in this checkout. This provisions one general account, never an admin.
const username='lucianos@sistema.com';
const account='4c014cfa178db72a396081d8d33538f6';
const databaseId='e539eb6d-8280-41b7-b8a3-f5ce0f447938';
const remote=process.argv.includes('--remote');
const configPath=remote?'wrangler.d1.json':'wrangler.jsonc';
const config=JSON.parse(readFileSync(configPath,'utf8'));
if(config.account_id!==account||config.d1_databases?.[0]?.database_id!==databaseId)throw new Error('Destino distinto a la D1 propia autorizada.');
function wrangler(args){return execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});}
if(remote){const identity=JSON.parse(wrangler(['whoami','--json']));if(!identity.loggedIn||!identity.accounts?.some(a=>a.id===account))throw new Error('Inicia sesión en la cuenta Cloudflare propia.');}
mkdirSync('outputs',{recursive:true});mkdirSync('.sites-runtime',{recursive:true});
const credentialPath='outputs/acceso-general.txt';
if(!existsSync(credentialPath)){
 const password=randomBytes(18).toString('base64url');
 writeFileSync(credentialPath,`LUCIANOS · ACCESO GENERAL\nUsuario: ${username}\nContraseña: ${password}\n\nAcceso local: http://localhost:5174/login\nEsta cuenta pertenece a la nueva copia independiente. El sitio anterior no cambia.\nGuarda esta contraseña en tu gestor de contraseñas. No subir este archivo a GitHub.\nEl administrador joaquintorress1205@gmail.com todavía NO está creado.\n`,{flag:'wx'});
}
const password=readFileSync(credentialPath,'utf8').match(/^Contraseña: (.+)$/m)?.[1];
if(!password)throw new Error('No se encontró la contraseña local.');
const baseArgs=['d1','execute','DB',remote?'--remote':'--local','--config',configPath,...(remote?[]:['--persist-to','.wrangler/state'])];
const sqlPath='.sites-runtime/provision-general-user.sql';
const hash=await hashPassword(password);
writeFileSync(sqlPath,`INSERT INTO auth_users (id,username,password_hash,active,created_at) VALUES ('${randomUUID()}','${username}','${hash}',1,${Date.now()}) ON CONFLICT(username) DO NOTHING;\n`);
wrangler([...baseArgs,'--file',sqlPath]);
const rows=JSON.parse(wrangler([...baseArgs,'--command',`SELECT username,password_hash,active FROM auth_users WHERE username='${username}';`,'--json']))[0].results;
if(rows.length!==1||rows[0].active!==1||!await verifyPassword(password,rows[0].password_hash))throw new Error('La cuenta existente no coincide. No se reemplazó su contraseña.');
console.log(`Cuenta general verificada en D1 ${remote?'remota':'local'}: ${username}. Contraseña en ${credentialPath} (excluido de Git).`);
