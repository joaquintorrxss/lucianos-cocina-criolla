// Explicit owner-requested rotation. Passwords are read from an ignored local file.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,relative} from 'node:path';
import {hashPassword,verifyPassword} from '../lib/password.ts';
const remote=process.argv.includes('--remote'),index=process.argv.indexOf('--file');
if(index<0||!process.argv[index+1])throw new Error('Usa --file outputs/archivo-privado.json.');
const inputPath=resolve(process.argv[index+1]);
if(!relative(resolve('outputs'),inputPath)||relative(resolve('outputs'),inputPath).startsWith('..'))throw new Error('El archivo debe estar dentro de outputs, excluido de Git.');
const configPath=remote?'wrangler.d1.json':'wrangler.jsonc';const config=JSON.parse(readFileSync(configPath,'utf8'));
if(config.account_id!=='4c014cfa178db72a396081d8d33538f6'||config.d1_databases?.[0]?.database_id!=='e539eb6d-8280-41b7-b8a3-f5ce0f447938')throw new Error('Destino no autorizado.');
const wrangler=args=>execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
if(remote){const identity=JSON.parse(wrangler(['whoami','--json']));if(!identity.loggedIn||!identity.accounts?.some(a=>a.id===config.account_id))throw new Error('Cuenta Cloudflare no autorizada.');}
const items=JSON.parse(readFileSync(inputPath,'utf8'));
if(!Array.isArray(items)||items.length!==2||!items.some(a=>a.username==='joaquintorress1205@gmail.com')||!items.some(a=>a.username==='lucianos@sistema.com'))throw new Error('Este script rota únicamente las dos cuentas autorizadas.');
const sqlQuote=s=>"'"+s.replaceAll("'","''")+"'";
const sql=[];
for(const a of items){if(typeof a.password!=='string')throw new Error('Contraseña inválida.');const hash=await hashPassword(a.password);sql.push(`UPDATE auth_users SET password_hash=${sqlQuote(hash)},auth_version=auth_version+1,revision=revision+1 WHERE username=${sqlQuote(a.username)};`);}
sql.push('DELETE FROM auth_sessions WHERE auth_version<>(SELECT auth_version FROM auth_users WHERE id=auth_sessions.user_id);');
sql.push("UPDATE auth_users SET email='joaquintorress1205@gmail.com',email_verified_at=NULL WHERE username='joaquintorress1205@gmail.com' AND email IS NULL;");
mkdirSync('.sites-runtime',{recursive:true});const sqlPath='.sites-runtime/rotate-account-passwords.sql';writeFileSync(sqlPath,sql.join('\n'));
const args=['d1','execute','DB',remote?'--remote':'--local','--config',configPath,...(remote?[]:['--persist-to','.wrangler/state'])];wrangler([...args,'--file',sqlPath]);
for(const a of items){const result=JSON.parse(wrangler([...args,'--command',`SELECT password_hash FROM auth_users WHERE username=${sqlQuote(a.username)};`,'--json']));if(result[0].results.length!==1||!await verifyPassword(a.password,result[0].results[0].password_hash))throw new Error('No se pudo verificar la actualización de acceso.');}
console.log(`Contraseñas de las dos cuentas actualizadas y verificadas en D1 ${remote?'remota':'local'}. Sesiones anteriores invalidadas.`);
