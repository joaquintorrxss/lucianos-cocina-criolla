// Creates test products and a jornada ONLY in the empty local database; cleans them afterward.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {setTimeout as pause} from 'node:timers/promises';
const origin='http://127.0.0.1:5175';
const password=which=>readFileSync(`outputs/acceso-${which}.txt`,'utf8').match(/^Contraseña: (.+)$/m)[1];
const directory=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidates=readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.sqlite$/.test(n)).filter(n=>{const d=new DatabaseSync(resolve(directory,n));try{return !!d.prepare("SELECT name FROM sqlite_master WHERE name='products'").get();}finally{d.close();}});
assert.equal(candidates.length,1);const db=new DatabaseSync(resolve(directory,candidates[0]));
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days').get().n,0,'Solo usar una base LOCAL sin jornadas.');
const inventoryBefore=db.prepare('SELECT * FROM inventory WHERE id=1').get();
const id=crypto.randomUUID(),item={id,name:'Prueba local · Seco',category:'Platos',price:2550,days:['Domingo']};
const cookies=[];let dayId;
const fetchJSON=async(path,cookie,body,extra={})=>{
 for(let n=0;n<3;n++){
  const r=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{Connection:'close',Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});
  const text=await r.text();if(r.status===503&&text.includes('Your worker restarted mid-request')&&n<2){await pause(100);continue;}
  return {status:r.status,body:JSON.parse(text),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
};
const login=async(username,which)=>{const r=await fetchJSON('/api/auth/login',null,{username,password:password(which)});assert.equal(r.status,200);cookies.push(r.cookie);return r.cookie;};
try{
 assert.equal((await fetchJSON('/api/catalog')).status,401);
 const general=await login('lucianos@sistema.com','general'),admin=await login('joaquintorress1205@gmail.com','admin');
 assert.equal((await fetchJSON('/api/catalog',general)).status,403);
 assert.equal((await fetchJSON('/api/catalog',general,{type:'create',...item})).status,403);
 assert.equal((await fetchJSON('/api/catalog',admin,{type:'create',...item},{Origin:'https://bad.example'})).status,403);
 assert.equal((await fetchJSON('/api/catalog',admin,{type:'create',...item,price:-1})).status,400);
 console.log('Roles, origen y validación: correctos.');
 let r=await fetchJSON('/api/catalog',admin,{type:'create',...item});assert.equal(r.status,200);let p=r.body.catalog.find(p=>p.id===id);assert.equal(p.price,2550);
 r=await fetchJSON('/api/catalog',admin,{type:'create',...item});assert.equal(r.body.catalog.filter(p=>p.id===id).length,1);
 const oldVersion=r.body.catalogVersion;
 r=await fetchJSON('/api/catalog',admin,{type:'update',...p,name:'Prueba local · Seco nuevo',price:2750});assert.equal(r.status,200);p=r.body.catalog.find(p=>p.id===id);
 const current=r.body;
 assert.equal((await fetchJSON('/api/catalog',admin,{type:'update',...p,revision:1})).status,409);
 console.log('Creación, reintento sin duplicados, edición y conflicto: correctos.');
 const opening={opId:crypto.randomUUID(),type:'open',menu:'Domingo',date:'2026-09-27',opening:6000,stock:Object.fromEntries(current.catalog.filter(p=>p.active&&p.days.includes('Domingo')).map(p=>[p.id,p.category==='Platos'||p.persistentStock?5:null]))};
 assert.equal((await fetchJSON('/api/state',general,{...opening,catalogVersion:oldVersion})).status,409);
 r=await fetchJSON('/api/state',general,{...opening,catalogVersion:current.catalogVersion,prices:{[id]:1}});assert.equal(r.status,200);let day=r.body.day;dayId=day.id;assert.equal(day.prices[id],2750);
 r=await fetchJSON('/api/state',general,{type:'order',dayId,revision:r.body.revision,opId:crypto.randomUUID(),table:1,notes:'Prueba',lines:[{productId:id,qty:2,price:day.prices[id]}]});assert.equal(r.status,200);const order=r.body.day.orders[0];
 r=await fetchJSON('/api/catalog',admin,{type:'archive',id,revision:p.revision});assert.equal(r.status,200);p=r.body.catalog.find(p=>p.id===id);assert.equal(p.active,false);
 r=await fetchJSON('/api/state',general);assert.equal(r.body.catalog.some(p=>p.id===id),false);assert.equal(r.body.day.catalog.find(p=>p.id===id).price,2750);assert.deepEqual(r.body.day.orders[0],order);
 r=await fetchJSON('/api/state',general,{type:'order',dayId,revision:r.body.revision,opId:crypto.randomUUID(),table:2,notes:'',lines:[{productId:id,qty:1,price:2750}]});assert.equal(r.status,200);
 r=await fetchJSON('/api/catalog',admin,{type:'restore',id,revision:p.revision});assert.equal(r.status,200);assert.equal(r.body.catalog.find(p=>p.id===id).active,true);
 console.log('Carta desde D1, retiro, recuperación, precio del backend y preservación de pedidos: correctos.');
}finally{
 if(dayId){db.prepare('DELETE FROM inventory_movements WHERE day_id=?').run(dayId);db.prepare('DELETE FROM days WHERE id=?').run(dayId);}
 db.prepare('UPDATE inventory SET revision=?,quantities=?,last_op=? WHERE id=1').run(inventoryBefore.revision,inventoryBefore.quantities,inventoryBefore.last_op);
 db.prepare('DELETE FROM products WHERE id=?').run(id);
 for(const cookie of cookies)await fetchJSON('/api/auth/logout',cookie,{}).catch(()=>{});
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days').get().n,0);db.close();
}
