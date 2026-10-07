import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {tokenHash} from '../lib/password.ts';
import {setTimeout as pause} from 'node:timers/promises';
const origin=process.argv.includes('--compiled')?'http://127.0.0.1:5175':'http://localhost:5174';
const password=readFileSync('outputs/acceso-general.txt','utf8').match(/^Contraseña: (.+)$/m)[1];
// Changing D1 through Wrangler while Vite runs changes its dev registry and can
// restart the Worker. Use SQLite only for this explicitly local auth test.
const directory=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidates=readdirSync(directory).filter(name=>/^[a-f0-9]{64}\.sqlite$/.test(name)).filter(name=>{
 const db=new DatabaseSync(resolve(directory,name),{readOnly:true});
 try{return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE name='auth_users'").get());}finally{db.close();}
});
assert.equal(candidates.length,1,'Una sola D1 local con autenticación debe estar preparada.');
const localDb=new DatabaseSync(resolve(directory,candidates[0]));
assert.equal(localDb.prepare('SELECT COUNT(*) AS n FROM days').get().n,0,'Esta prueba solo admite la base local sin ventas.');
function localSQL(command){localDb.exec(command);}
const nativeFetch=globalThis.fetch.bind(globalThis);
async function localFetch(url,options){
 // Miniflare's localhost proxy can briefly retain a connection to a restarted
 // Worker. Retry that explicit proxy response only, never application failures.
 for(let n=0;n<3;n++){
  let response;
  try { response=await nativeFetch(url,{...options,signal:AbortSignal.timeout(10000)}); }
  catch(error) {
   if(n<2&&(!options?.method||options.method==='GET')&&['TimeoutError','TypeError'].includes(error.name)){await pause(100);continue;}
   throw error;
  }
  if(response.status!==503||!(await response.clone().text()).includes('Your worker restarted mid-request'))return response;
  if(n===2)return response;
  await pause(100);
 }
}
const fetch=localFetch;
const post=(path,body,headers={})=>localFetch(origin+path,{method:'POST',headers:{Connection:'close',Origin:origin,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
const login=(username,password)=>post('/api/auth/login',{username,password});
let cookie;
try{
 console.log('Prueba local: acceso bloqueado sin sesión y validación del origen.');
 for(const path of ['/api/state','/api/history','/api/report?dayId=unknown'])assert.equal((await fetch(origin+path)).status,401,path);
 const root=await fetch(origin+'/',{redirect:'manual'});assert.equal(root.status,307);assert.ok(root.headers.get('location').endsWith('/login'));
 assert.equal((await fetch(origin+'/api/state',{headers:{Cookie:'__sites_local_auth=1; lucianos_session=fake','oai-authenticated-user-id':'forged','oai-authenticated-user-email':'lucianos@sistema.com'}})).status,401);
 assert.equal((await post('/api/auth/login',{username:'lucianos@sistema.com',password},{Origin:'https://untrusted.example'})).status,403);
 assert.equal((await localFetch(origin+'/api/auth/login',{method:'POST',headers:{Connection:'close','Content-Type':'application/json'},body:JSON.stringify({username:'lucianos@sistema.com',password})})).status,403);
 const oversized=await post('/api/auth/login',{username:'lucianos@sistema.com',password:'x'.repeat(5000)});
 assert.equal(oversized.status,413,await oversized.text());
 const wrong=await login('lucianos@sistema.com','wrong-password'),missing=await login('missing@sistema.com','wrong-password');
 console.log('Prueba local: credenciales incorrectas y contraseña incorrecta del admin.');
 assert.equal(wrong.status,401);assert.equal(missing.status,401);assert.deepEqual(await wrong.json(),await missing.json());
 assert.equal((await login('joaquintorress1205@gmail.com',password)).status,401);
 let response=await login(' LUCIANOS@SISTEMA.COM ',password);assert.equal(response.status,200);
 const setCookie=response.headers.get('set-cookie');assert.ok(setCookie.includes('HttpOnly'));assert.ok(setCookie.includes('SameSite=Strict'));
 cookie=setCookie.split(';')[0];
 console.log('Prueba local: sesión válida y acceso a registros.');
 const state=await fetch(origin+'/api/state',{headers:{Cookie:cookie}});assert.equal(state.status,200);assert.deepEqual((await state.json()).days,[]);
 assert.equal((await fetch(origin+'/api/history',{headers:{Cookie:cookie}})).status,200);
 assert.equal((await fetch(origin+'/api/report?dayId=unknown',{headers:{Cookie:cookie}})).status,404);
 assert.equal((await post('/api/state',{},{Cookie:cookie,Origin:'https://untrusted.example'})).status,403);
 assert.equal((await post('/api/auth/logout',undefined,{Cookie:cookie,Origin:'https://untrusted.example'})).status,403);
 assert.equal((await fetch(origin+'/api/state',{headers:{Cookie:cookie}})).status,200);
 // Expiry is verified in the running Worker against the local D1 only.
 localSQL(`UPDATE auth_sessions SET expires_at=0 WHERE token_hash='${tokenHash(cookie.split('=')[1])}';`);
 console.log('Prueba local: caducidad, desactivación y revocación.');
 assert.equal((await fetch(origin+'/api/state',{headers:{Cookie:cookie}})).status,401);
 response=await login('lucianos@sistema.com',password);assert.equal(response.status,200);cookie=response.headers.get('set-cookie').split(';')[0];
 localSQL("UPDATE auth_users SET active=0 WHERE username='lucianos@sistema.com';");
 assert.equal((await fetch(origin+'/api/state',{headers:{Cookie:cookie}})).status,401);
 localSQL("UPDATE auth_users SET active=1 WHERE username='lucianos@sistema.com';");
 response=await post('/api/auth/logout',undefined,{Cookie:cookie});assert.equal(response.status,200);assert.ok(response.headers.get('set-cookie').includes('Max-Age=0'));
 assert.equal((await fetch(origin+'/api/state',{headers:{Cookie:cookie}})).status,401);
 const absent=`throttle-${Date.now()}@sistema.com`;
 console.log('Prueba local: límite de intentos.');
 for(let n=0;n<8;n++)assert.equal((await login(absent,'wrong-password')).status,401);
 response=await login(absent,'wrong-password');assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'900');
 console.log('Autenticación local verificada: ingreso, errores genéricos, contraseña del admin rechazada, bloqueo de cabeceras falsas, CSRF, expiración, cuenta desactivada, revocación y límite de intentos. Sin crear ventas.');
}finally{
 localSQL("UPDATE auth_users SET active=1 WHERE username='lucianos@sistema.com'; DELETE FROM auth_attempts; DELETE FROM auth_sessions;");
 localDb.close();
}
