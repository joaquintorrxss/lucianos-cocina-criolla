// Tests account lifecycle ONLY against localhost and its SQLite database. Never writes production.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {tokenHash} from '../lib/password.ts';
import {setTimeout as pause} from 'node:timers/promises';
const origin='http://127.0.0.1:5175';
const passwords=JSON.parse(readFileSync('outputs/contraseñas-solicitadas.json','utf8'));
const directory=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const files=readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.sqlite$/.test(n)).filter(n=>{const d=new DatabaseSync(resolve(directory,n));try{return !!d.prepare("SELECT name FROM sqlite_master WHERE name='auth_tokens'").get();}finally{d.close();}});assert.equal(files.length,1);
const db=new DatabaseSync(resolve(directory,files[0]));const originalDays=db.prepare('SELECT COUNT(*) AS n FROM days').get().n;
const id=crypto.randomUUID(),id2=crypto.randomUUID(),username=`test-${id}@sistema.com`,initial='local-only-pass-123',next='local-only-next-123',last='local-only-reset-123';
const tokens=[];const cookies=[];
async function call(path,cookie,body,headers={}){
 if(process.env.ACCOUNTS_TEST_TRACE==='1')console.log('HTTP local',body===undefined?'GET':'POST',path);
 for(let n=0;n<3;n++){
  const r=await fetch(origin+path,{signal:AbortSignal.timeout(15000),headers:{Connection:'close',Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});const t=await r.text();if(r.status===503&&t.includes('Your worker restarted mid-request')&&n<2){await pause(100);continue;}return {status:r.status,body:JSON.parse(t),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
}
async function login(username,password){const r=await call('/api/auth/login',null,{username,password});assert.equal(r.status,200,JSON.stringify(r.body));cookies.push(r.cookie);return r.cookie;}
function seed(purpose,expires=Date.now()+1800000){const u=db.prepare('SELECT email,auth_version FROM auth_users WHERE id=?').get(id),token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');db.prepare('INSERT INTO auth_tokens (token_hash,user_id,purpose,email,auth_version,expires_at,created_at) VALUES (?,?,?,?,?,?,?)').run(tokenHash(token),id,purpose,u.email,u.auth_version,expires,Date.now());tokens.push(tokenHash(token));return token;}
try{
 assert.equal((await call('/api/account')).status,401);assert.equal((await call('/api/users')).status,401);
 const adminPassword=passwords.find(p=>p.username==='joaquintorress1205@gmail.com').password;
 const admin=await login('joaquintorress1205@gmail.com',adminPassword),general=await login('lucianos@sistema.com',passwords.find(p=>p.username==='lucianos@sistema.com').password);
 assert.equal((await call('/api/users',general)).status,403);assert.equal((await call('/api/users',general,{type:'create'})).status,403);
 let r=await call('/api/account',general);assert.equal(r.status,200);assert.equal(r.body.emailEnabled,false);assert.equal(r.body.user.email,null);assert.equal('password_hash' in r.body.user,false);
 assert.equal((await call('/api/account',general,{type:'password',currentPassword:'wrong',password:next,confirmation:next})).status,401);
 assert.equal((await call('/api/account',general,{type:'password'},{Origin:'https://bad.example'})).status,403);
 const create={type:'create',id,username,role:'operator',email:'test@example.com',password:initial,confirmation:initial,adminPassword};
 assert.equal((await call('/api/users',admin,{...create,adminPassword:'wrong'})).status,401);
 r=await call('/api/users',admin,create);assert.equal(r.status,200,JSON.stringify(r.body));let target=r.body.users.find(u=>u.id===id);assert.equal(target.emailVerifiedAt,null);assert.equal('password_hash' in target,false);
 assert.equal((await call('/api/users',admin,{...create,id:id2})).status,409);
 console.log('Roles, reautenticación, origen, creación, duplicados y datos privados: correctos.');
 let userCookie=await login(username,initial),secondCookie=await login(username,initial);
 r=await call('/api/account',userCookie);assert.equal(r.body.user.emailVerifiedAt,null);
 assert.equal((await call('/api/auth/email',userCookie,{type:'request'})).status,503);
 assert.equal((await call('/api/auth/email',null,{type:'forgot',username})).status,503);
 r=await call('/api/account',userCookie,{type:'email',email:'next@example.com',revision:r.body.user.revision,currentPassword:initial});assert.equal(r.status,200);
 const expired=seed('verify',Date.now()-1);assert.equal((await call('/api/auth/email',null,{type:'confirm',token:expired})).status,400);
 const verify=seed('verify');assert.equal((await call('/api/auth/email',null,{type:'reset',token:verify,password:next,confirmation:next})).status,400);
 assert.equal((await call('/api/auth/email',null,{type:'confirm',token:verify})).status,200);assert.equal((await call('/api/auth/email',null,{type:'confirm',token:verify})).status,400);
 r=await call('/api/account',userCookie);assert.ok(r.body.user.emailVerifiedAt);
 const oldEmailToken=seed('reset');r=await call('/api/account',userCookie,{type:'email',email:'third@example.com',revision:r.body.user.revision,currentPassword:initial});assert.equal(r.status,200);
 assert.equal((await call('/api/auth/email',null,{type:'reset',token:oldEmailToken,password:next,confirmation:next})).status,400);assert.equal((await call('/api/account',userCookie)).body.user.emailVerifiedAt,null);
 const verifyAgain=seed('verify');assert.equal((await call('/api/auth/email',null,{type:'confirm',token:verifyAgain})).status,200);
 console.log('Envío pendiente, correo real, verificación, caducidad, propósito y uso único: correctos.');
 r=await call('/api/account',userCookie,{type:'password',currentPassword:initial,password:next,confirmation:next});assert.equal(r.status,200);assert.equal((await call('/api/account',userCookie)).status,401);assert.equal((await call('/api/account',secondCookie)).status,401);
 userCookie=await login(username,next);const reset=seed('reset');assert.equal((await call('/api/auth/email',null,{type:'reset',token:reset,password:last,confirmation:last})).status,200);assert.equal((await call('/api/account',userCookie)).status,401);assert.equal((await call('/api/auth/email',null,{type:'reset',token:reset,password:last,confirmation:last})).status,400);
 userCookie=await login(username,last);
 r=await call('/api/users',admin);target=r.body.users.find(u=>u.id===id);
 r=await call('/api/users',admin,{type:'password',id,revision:target.revision,password:initial,confirmation:initial,adminPassword});assert.equal(r.status,200);target=r.body.users.find(u=>u.id===id);assert.equal((await call('/api/account',userCookie)).status,401);
 userCookie=await login(username,initial);
 r=await call('/api/users',admin,{type:'status',id,revision:target.revision,active:false,adminPassword});assert.equal(r.status,200);target=r.body.users.find(u=>u.id===id);assert.equal((await call('/api/account',userCookie)).status,401);assert.equal((await call('/api/auth/login',null,{username,password:initial})).status,401);
 r=await call('/api/users',admin,{type:'status',id,revision:target.revision,active:true,adminPassword});assert.equal(r.status,200);target=r.body.users.find(u=>u.id===id);userCookie=await login(username,initial);
 assert.equal((await call('/api/users',admin,{type:'update',id,revision:target.revision-1,username,role:'admin',email:'third@example.com',adminPassword})).status,409);
 r=await call('/api/users',admin,{type:'update',id,revision:target.revision,username,role:'admin',email:'third@example.com',adminPassword});assert.equal(r.status,200);assert.equal((await call('/api/account',userCookie)).status,401);
 userCookie=await login(username,initial);assert.equal((await call('/api/users',userCookie)).status,200);
 const self=r.body.users.find(u=>u.username==='joaquintorress1205@gmail.com');assert.equal((await call('/api/users',admin,{type:'status',id:self.id,revision:self.revision,active:false,adminPassword})).status,400);
 console.log('Cambio propio, recuperación por token, restablecimiento admin, sesiones, activación y permisos: correctos.');
}finally{
 for(const cookie of cookies)await call('/api/auth/logout',cookie,{}).catch(()=>{});
 for(const token of tokens)db.prepare('DELETE FROM auth_tokens WHERE token_hash=?').run(token);
 db.prepare('DELETE FROM auth_users WHERE id IN (?,?)').run(id,id2);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days').get().n,originalDays);db.close();
}
