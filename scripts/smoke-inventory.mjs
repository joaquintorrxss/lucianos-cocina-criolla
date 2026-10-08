// Business fixtures are ONLY allowed in an empty local D1. Never run on production.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const origin='http://127.0.0.1:5175',directory=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidates=readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.sqlite$/.test(n)).filter(n=>{const d=new DatabaseSync(resolve(directory,n));try{return !!d.prepare("SELECT name FROM sqlite_master WHERE name='inventory'").get();}finally{d.close();}});
assert.equal(candidates.length,1);const db=new DatabaseSync(resolve(directory,candidates[0]));
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days').get().n,0,'Only an empty LOCAL business database is allowed.');
const original=db.prepare('SELECT * FROM inventory WHERE id=1').get(),dayIds=[],cookies=[];let cookie,retain=false;
const cleanup=()=>{for(const id of dayIds){db.prepare('DELETE FROM inventory_movements WHERE day_id=?').run(id);db.prepare('DELETE FROM days WHERE id=?').run(id);}db.prepare("DELETE FROM inventory_movements WHERE reason LIKE '%Prueba local inventario%'").run();db.prepare('UPDATE inventory SET revision=?,quantities=?,last_op=? WHERE id=1').run(original.revision,original.quantities,original.last_op);};
async function request(path,body,extra={}){
 for(let attempt=0;attempt<3;attempt++){
  const r=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(30000),headers:{Connection:'close',Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});
  const text=await r.text();if(r.status===503&&text.includes('Your worker restarted mid-request')&&attempt<2){await new Promise(resolve=>setTimeout(resolve,300));continue;}
  let s;try{s=JSON.parse(text);}catch{throw new Error(`Unexpected local HTTP ${r.status} for ${path}: ${text.slice(0,150)}`);}return {status:r.status,s,cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
}

async function action(state,a){const r=await request('/api/state',{...a,dayId:state.day.id,revision:state.revision,opId:a.opId??crypto.randomUUID()});assert.equal(r.status,200,r.s.error);return r.s;}
async function open(menu,date){const current=(await request('/api/state')).s;const r=await request('/api/state',{type:'open',opId:crypto.randomUUID(),menu,date,opening:6000,catalogVersion:current.catalogVersion,stock:Object.fromEntries(current.catalog.filter(p=>p.days.includes(menu)).map(p=>[p.id,p.category==='Platos'?7:p.persistentStock?99:null]))});assert.equal(r.status,200,r.s.error);dayIds.push(r.s.day.id);return r.s;}
try{
 assert.equal((await request('/api/inventory')).status,401);
 const password=readFileSync('outputs/acceso-general.txt','utf8').match(/^Contraseña: (.+)$/m)[1];const login=await request('/api/auth/login',{username:'lucianos@sistema.com',password});assert.equal(login.status,200);cookie=login.cookie;cookies.push(cookie);
 console.log('Inventario HTTP: acceso general y carga inicial.');let inv=(await request('/api/inventory')).s;
 for(const p of inv.products){const r=await request('/api/inventory',{type:inv.quantities[p.id]==null?'initial':'adjust',productId:p.id,qty:3,reason:'Prueba local inventario inicial',revision:inv.revision,opId:crypto.randomUUID()});assert.equal(r.status,200,r.s.error);inv=r.s;}
 const op={type:'restock',productId:'inca-litro',qty:2,reason:'Prueba local inventario reposición',revision:inv.revision,opId:crypto.randomUUID()};
 assert.equal((await request('/api/inventory',op,{Origin:'https://invalid.example'})).status,403);
 let r=await request('/api/inventory',op);assert.equal(r.status,200);assert.equal(r.s.quantities['inca-litro'],5);r=await request('/api/inventory',op);assert.equal(r.status,200);assert.equal(r.s.quantities['inca-litro'],5);
 r=await request('/api/inventory',{...op,opId:crypto.randomUUID()});assert.equal(r.status,409);
 inv=r.s;r=await request('/api/inventory',{type:'adjust',productId:'inca-litro',qty:3,reason:'Prueba local inventario ajuste',revision:inv.revision,opId:crypto.randomUUID()});assert.equal(r.status,200);
 console.log('Inventario HTTP: altas, reposición, reintento y ajuste listos.');let state=await open('Domingo','2026-09-27');assert.equal(state.day.stock['inca-litro'],3);
 state=await action(state,{type:'order',table:2,notes:'Prueba local para llevar',takeaway:true,tapersManual:false,lines:[{productId:'pato',qty:3,price:3000},{productId:'pepian-pato',qty:1,price:3000,notes:'Sin arroz'},{productId:'cabrito',qty:1,price:3000},{productId:'inca-litro',qty:1,price:700}]});
 const filtered=await request('/api/inventory?product=inca-litro');assert.equal(filtered.status,200);assert.ok(filtered.s.movements.every(m=>m.product_id==='inca-litro'));const noDate=await request('/api/inventory?date=2020-01-01');assert.equal(noDate.status,200);assert.equal(noDate.s.movements.length,0);
 assert.equal(state.day.stock.pato,3);assert.equal(state.day.stock['pepian-pato'],3);assert.equal(state.day.stock['inca-litro'],2);assert.equal(state.inventory.quantities['inca-litro'],2);let o=state.day.orders[0];assert.equal(o.lines.find(l=>l.productId==='taper').qty,5);
 const same={type:'order',table:3,notes:'Prueba local concurrente',lines:[{productId:'inca-litro',qty:1,price:700}],dayId:state.day.id,revision:state.revision};
 const results=await Promise.all([request('/api/state',{...same,opId:crypto.randomUUID()}),request('/api/state',{...same,opId:crypto.randomUUID()})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);state=(await request('/api/state')).s;assert.equal(state.inventory.quantities['inca-litro'],1);
 const second=state.day.orders[1];state=await action(state,{type:'cancel',orderId:second.id});assert.equal(state.inventory.quantities['inca-litro'],2);
 state=await action(state,{type:'serve',orderId:o.id,lineId:o.lines[0].id,qty:1});assert.equal(state.day.orders[0].lines[0].served,1);
 state=await action(state,{type:'payment',orderId:o.id,cash:9700,yape:7000,tender:10000});assert.equal(state.day.orders[0].payments[0].cashAfter,15700);assert.equal(state.day.orders[0].payments[0].change,300);
 state=await action(state,{type:'serve-order',orderId:o.id});state=await action(state,{type:'close',counted:15700,countedYape:6900});assert.equal(state.day.countedYape,6900);assert.equal(state.inventory.quantities['inca-litro'],2);
 const pdf=await fetch(origin+'/api/report?dayId='+state.day.id,{headers:{Cookie:cookie}});assert.equal(pdf.status,200);writeFileSync('outputs/reporte-inventario-prueba.pdf',Buffer.from(await pdf.arrayBuffer()));assert.equal(pdf.headers.get('x-report-pages'),'2');
 state=await open('Lunes','2026-09-28');assert.equal(state.day.stock['inca-litro'],2);state=await action(state,{type:'close',counted:6000,countedYape:0});
 state=await open('Jueves','2026-10-01');assert.equal(state.day.stock['inca-litro'],2);state=await action(state,{type:'close',counted:6000,countedYape:0});
 console.log('HTTP local: stock entre domingo/lunes/jueves, reposición, idempotencia, conflictos, presas compartidas, táperes, pagos, Yape y PDF correctos.');
 if(process.argv.includes('--keep')){state=await open('Domingo','2026-10-04');state=await action(state,{type:'order',table:2,notes:'Entregar primero las bebidas',takeaway:true,tapersManual:false,lines:[{productId:'pato',qty:2,price:3000},{productId:'pepian-pato',qty:1,price:3000,notes:'Sin arroz'},{productId:'cabrito',qty:2,price:3000},{productId:'inca-litro',qty:1,price:700}]});o=state.day.orders[0];state=await action(state,{type:'serve',orderId:o.id,lineId:o.lines[0].id,qty:1});state=await action(state,{type:'serve',orderId:o.id,lineId:o.lines.find(l=>l.productId==='inca-litro').id,qty:1});writeFileSync('.sites-runtime/inventory-local-cleanup.json',JSON.stringify({db:resolve(directory,candidates[0]),dayIds,original}));retain=true;console.log('Fixture LOCAL conservada temporalmente para revisión visual.');}
}finally{if(!retain){cleanup();for(const c of cookies){cookie=c;await request('/api/auth/logout',{}).catch(()=>{});}}db.close();}
