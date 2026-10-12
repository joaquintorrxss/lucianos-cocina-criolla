// Only an empty LOCAL database may receive these temporary business fixtures.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
const origin='http://127.0.0.1:5175',directory=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidates=readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.sqlite$/.test(n)).filter(n=>{
 const db=new DatabaseSync(resolve(directory,n));try{return !!db.prepare("SELECT name FROM sqlite_master WHERE name='inventory'").get();}finally{db.close();}
});
assert.equal(candidates.length,1);const db=new DatabaseSync(resolve(directory,candidates[0]));
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days').get().n,0,'An empty LOCAL database is required.');
const original=db.prepare('SELECT * FROM inventory WHERE id=1').get(),ops=[],ids=new Set();let cookie;
async function request(path,body){
 for(let attempt=0;attempt<3;attempt++){
  const r=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(30000),headers:{Connection:'close',Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});
  const text=await r.text();if(r.status===503&&text.includes('Your worker restarted mid-request')&&attempt<2)continue;
  return {status:r.status,s:JSON.parse(text),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
}
function opening(s){const opId=crypto.randomUUID();ops.push(opId);return {type:'open',opId,menu:'Domingo',date:'2026-09-27',opening:6000,catalogVersion:s.catalogVersion,stock:Object.fromEntries(s.catalog.filter(p=>p.days.includes('Domingo')).map(p=>[p.id,p.category==='Platos'?7:p.persistentStock?3:null]))};}
async function close(s){const r=await request('/api/state',{type:'close',opId:crypto.randomUUID(),dayId:s.day.id,revision:s.revision,counted:6000,countedYape:0});assert.equal(r.status,200,r.s.error);return r.s;}
try{
 const password=readFileSync('outputs/acceso-general.txt','utf8').match(/^Contraseña: (.+)$/m)[1];
 const login=await request('/api/auth/login',{username:'lucianos@sistema.com',password});assert.equal(login.status,200);cookie=login.cookie;
 const initial=(await request('/api/state')).s,first=opening(initial);
 let r=await request('/api/state',{...first,catalogVersion:initial.catalogVersion-1});assert.equal(r.status,409);assert.equal(r.s.day,null);assert.equal(r.s.catalogVersion,initial.catalogVersion);assert.ok(Array.isArray(r.s.catalog));
 r=await request('/api/state',first);assert.equal(r.status,200,r.s.error);let s=r.s;ids.add(s.day.id);
 const revision=s.inventory.revision;
 r=await request('/api/state',first);assert.equal(r.status,200);assert.equal(r.s.day.id,s.day.id);assert.equal(r.s.inventory.revision,revision);
 r=await request('/api/state',opening(s));assert.equal(r.status,409);assert.equal(r.s.day.id,s.day.id);
 const closed=await close(s),payload=db.prepare('SELECT payload,revision FROM days WHERE id=?').get(closed.day.id);
 r=await request('/api/state',first);assert.equal(r.status,200);assert.equal(r.s.day.id,closed.day.id);assert.ok(r.s.day.closed);
 const fresh=opening(r.s);r=await request('/api/state',fresh);assert.equal(r.status,200,r.s.error);s=r.s;ids.add(s.day.id);
 assert.notEqual(s.day.id,closed.day.id);assert.equal(s.day.date,closed.day.date);
 assert.deepEqual(db.prepare('SELECT payload,revision FROM days WHERE id=?').get(closed.day.id),payload);
 await close(s);
 const current=(await request('/api/state')).s;
 const results=await Promise.all([request('/api/state',opening(current)),request('/api/state',opening(current))]);
 for(const result of results)if(result.s.day)ids.add(result.s.day.id);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days WHERE active=1').get().n,1);
 const history=await request('/api/history');assert.equal(history.status,200);assert.equal(history.s.days.length,3);assert.equal(new Set(history.s.days.map(d=>d.id)).size,3);assert.ok(history.s.days.every(d=>d.date==='2026-09-27'));
 console.log('HTTP local correcto: misma fecha tras cierre, historial conservado, reintentos sin duplicados, una sola jornada activa y carta actualizada en conflictos.');
}finally{
 for(const op of ops){const row=db.prepare('SELECT id FROM days WHERE opening_op_id=?').get(op);if(row)ids.add(row.id);}
 for(const id of ids){db.prepare('DELETE FROM inventory_movements WHERE day_id=?').run(id);db.prepare('DELETE FROM days WHERE id=?').run(id);}
 db.prepare('UPDATE inventory SET revision=?,quantities=?,last_op=? WHERE id=1').run(original.revision,original.quantities,original.last_op);
 if(cookie)await request('/api/auth/logout',{}).catch(()=>{});
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days').get().n,0);db.close();
}
