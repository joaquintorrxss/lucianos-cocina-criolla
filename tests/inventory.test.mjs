import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {openDay,applyAction,dayCatalog,balance} from '../lib/model.ts';
import {currentStock,openingStock,inventoryAfter,dayInventoryWrites} from '../lib/inventory.ts';
import {automaticTapers} from '../lib/takeaway.ts';
const menu=[{id:'pato',name:'Pato guisado',category:'Platos',price:3000,days:['Domingo']},{id:'cabrito',name:'Cabrito',category:'Platos',price:3000,days:['Domingo']},{id:'pepian-pato',name:'Pepián con pato',category:'Platos',price:3000,days:['Domingo'],stockSourceId:'pato'},{id:'pepian-cabrito',name:'Pepián con cabrito',category:'Platos',price:3000,days:['Domingo'],stockSourceId:'cabrito'},{id:'inca-litro',name:'Inca Kola',category:'Bebidas',price:700,days:['Domingo','Lunes','Jueves'],persistentStock:true},{id:'taper',name:'Táper',category:'Adicionales',price:200,days:['Domingo']}];
const open=(stock={pato:7,cabrito:8,'inca-litro':3,taper:null},menuDay='Domingo')=>openDay({menu:menuDay,date:'2026-09-27',opening:6000,stock},menu);
const act=(d,a)=>applyAction(d,{opId:crypto.randomUUID(),...a});
const order=(d,lines,extra={})=>act(d,{type:'order',table:1,notes:'',lines:lines.map(([productId,qty])=>({productId,qty,price:menu.find(p=>p.id===productId).price})),...extra});
test('shared presas subtract across normal dishes and pepian, edit only the delta and restore on cancellation',()=>{
 let d=order(open(),[['pato',3],['pepian-pato',1],['cabrito',2],['pepian-cabrito',2]]);
 assert.equal(d.stock.pato,3);assert.equal(d.stock['pepian-pato'],3);assert.equal(d.stock.cabrito,4);assert.equal(d.stock['pepian-cabrito'],4);
 const o=d.orders[0];d=act(d,{type:'order',orderId:o.id,table:1,notes:'',lines:o.lines.map(l=>l.productId==='pepian-pato'?{...l,qty:2}:l)});assert.equal(d.stock.pato,2);
 assert.throws(()=>order(d,[['pepian-pato',3]]),/disponibilidad/);
 d=act(d,{type:'cancel',orderId:o.id});assert.equal(d.stock.pato,7);assert.equal(d.stock['pepian-pato'],7);assert.equal(d.stock.cabrito,8);
});
test('gaseosas persist across attention days; client counts cannot reset known stock and unknown counts must be registered',()=>{
 let inventory={revision:1,quantities:{'inca-litro':3}};
 const d=order(open(),[['inca-litro',1]]);inventory.quantities=inventoryAfter(d,inventory);assert.equal(inventory.quantities['inca-litro'],2);
 for(const menuDay of ['Lunes','Jueves']){const next=openingStock(menu,menuDay,{'inca-litro':99},inventory);assert.equal(next.stock['inca-litro'],2);inventory.quantities=inventoryAfter(open(next.stock,menuDay),inventory);}
 assert.equal(inventory.quantities['inca-litro'],2);
 assert.throws(()=>openingStock(menu,'Lunes',{'inca-litro':null},{revision:1,quantities:{}}),/cantidad inicial/);
 assert.equal(openingStock(menu,'Lunes',{'inca-litro':0},{revision:1,quantities:{}}).quantities['inca-litro'],0);
 const frozen={...d,closed:'2026-09-27T23:00:00Z'};assert.deepEqual(currentStock(frozen,{revision:3,quantities:{'inca-litro':20}}),frozen);
});
test('takeaway adds one taper per dish, excludes drinks, preserves notes and supports customer containers and future quantity edits',()=>{
 let d=order(open(),[['pato',3],['cabrito',2],['inca-litro',1]],{takeaway:true,tapersManual:false});
 assert.equal(d.orders[0].lines.find(l=>l.productId==='taper').qty,5);assert.equal(d.orders[0].takeaway,true);
 const o=d.orders[0];d=act(d,{type:'order',orderId:o.id,table:1,notes:'Traen sus envases',takeaway:true,tapersManual:true,lines:o.lines.filter(l=>l.productId!=='taper')});assert.ok(!d.orders[0].lines.some(l=>l.productId==='taper'));
 const reset=automaticTapers(d.orders[0].lines,d,true,false);assert.equal(reset.at(-1).qty,5);
 const changes=reset.map(l=>l.productId==='pato'?{...l,qty:4}:l);assert.equal(automaticTapers(changes,d,true,false).at(-1).qty,6);
 assert.ok(!automaticTapers(reset,d,false,false).some(l=>l.productId==='taper'));
});
test('manual Yape count is frozen separately from cash and includes a discrepancy without changing the paid total',()=>{
 let d=order(open(),[['pato',1]]),o=d.orders[0];d=act(d,{type:'serve-order',orderId:o.id});d=act(d,{type:'payment',orderId:o.id,cash:1000,yape:2000,tender:2000});d=act(d,{type:'close',counted:7000,countedYape:1900});assert.equal(d.countedYape,1900);assert.equal(balance(d),7000);assert.ok(d.events[0].text.includes('Yape'));assert.throws(()=>act(d,{type:'close',counted:7000,countedYape:2000}),/cerrada/);
});
test('automatic container updates preserve delivery in every existing line when a large takeaway order shrinks',()=>{
 const d=open(),line=(id,productId,qty,served=0)=>({id,productId,name:menu.find(p=>p.id===productId).name,category:menu.find(p=>p.id===productId).category,price:200,qty,served});
 const lines=[line('dish1','pato',450),line('dish2','cabrito',450),line('box1','taper',1000),line('box2','taper',1000,500)];
 const result=automaticTapers(lines,d,true,false).filter(l=>l.productId==='taper');assert.equal(result.reduce((n,l)=>n+l.qty,0),900);assert.equal(result.find(l=>l.id==='box2').served,500);assert.equal(result.find(l=>l.id==='box2').qty,500);
});
function migrate(db){for(const name of ['0000_puzzling_zaladane','0001_typical_nighthawk','0002_simple_cloak','0003_awesome_micromax','0004_legal_silver_sable'])db.exec(readFileSync(`drizzle/${name}.sql`,'utf8'));}
test('inventory upgrade preserves existing business JSON and carries forward the remaining soda count, not the initial count',()=>{
 const db=new DatabaseSync(':memory:');try{for(const name of ['0000_puzzling_zaladane','0001_typical_nighthawk','0002_simple_cloak','0003_awesome_micromax'])db.exec(readFileSync(`drizzle/${name}.sql`,'utf8'));
 const d=open();d.stock['inca-litro']=2;const payload=JSON.stringify(d);db.prepare('INSERT INTO days VALUES (?,?,1,1,?)').run(d.id,d.date,payload);db.exec(readFileSync('drizzle/0004_legal_silver_sable.sql','utf8'));
 assert.equal(db.prepare('SELECT payload FROM days').get().payload,payload);assert.equal(JSON.parse(db.prepare('SELECT quantities FROM inventory').get().quantities)['inca-litro'],2);
 assert.equal(db.prepare("SELECT stock_source_id FROM products WHERE id='pepian-pato'").get().stock_source_id,'pato');assert.equal(db.prepare("SELECT price FROM products WHERE id='pepian-cabrito'").get().price,3000);
 }finally{db.close();}
});
test('existing pepian dishes with unaccented names keep their IDs, share meat stock and do not acquire duplicate active entries',()=>{
 const db=new DatabaseSync(':memory:');try{
  for(const name of ['0000_puzzling_zaladane','0001_typical_nighthawk','0002_simple_cloak','0003_awesome_micromax'])db.exec(readFileSync(`drizzle/${name}.sql`,'utf8'));
  db.prepare('INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES (?,?,?,?,?,1,1,0)').run('owner-pato','Pepian con Pato','Platos',3000,'["Domingo"]');db.prepare('INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES (?,?,?,?,?,1,1,0)').run('owner-cabrito','Pepian con Cabrito','Platos',3000,'["Domingo"]');
  const d=open();const payload=JSON.stringify(d);db.prepare('INSERT INTO days VALUES (?,?,1,1,?)').run(d.id,d.date,payload);
  for(const name of ['0004_legal_silver_sable','0005_glamorous_morlun','0006_preserve_existing_pepians'])db.exec(readFileSync(`drizzle/${name}.sql`,'utf8'));
  const originals=db.prepare("SELECT id,stock_source_id,price,active FROM products WHERE id LIKE 'owner-%' ORDER BY id").all();assert.equal(originals[0].stock_source_id,'cabrito');assert.equal(originals[1].stock_source_id,'pato');assert.ok(originals.every(p=>p.active===1&&p.price===3000));assert.equal(db.prepare("SELECT COUNT(*) AS n FROM products WHERE id IN ('pepian-pato','pepian-cabrito') AND active=1").get().n,0);assert.equal(db.prepare('SELECT payload FROM days').get().payload,payload);
 }finally{db.close();}
});
test('atomic stock/order write rejects stale inventory or day revisions, allows one concurrent reservation and rolls back on errors',()=>{
 const db=new DatabaseSync(':memory:');try{migrate(db);db.prepare('UPDATE inventory SET quantities=?').run(JSON.stringify({'inca-litro':3}));const d=open();db.prepare('INSERT INTO days VALUES (?,?,1,1,?)').run(d.id,d.date,JSON.stringify(d));const inventory={revision:1,quantities:{'inca-litro':3}},next=order(d,[['inca-litro',1]]);
 const write=(rev,inv,op)=>{db.exec('BEGIN');try{const changes=dayInventoryWrites(rev,next,inv,op).map(s=>db.prepare(s.sql).run(...s.args).changes);db.exec('COMMIT');return changes;}catch(e){db.exec('ROLLBACK');throw e;}};
 assert.deepEqual(write(1,{...inventory,revision:99},'stale-inv'),[0,0]);assert.deepEqual(write(99,inventory,'stale-day'),[0,0]);assert.deepEqual(write(1,inventory,'first'),[1,1]);assert.deepEqual(write(1,inventory,'second'),[0,0]);
 assert.equal(JSON.parse(db.prepare('SELECT quantities FROM inventory').get().quantities)['inca-litro'],2);assert.equal(JSON.parse(db.prepare('SELECT payload FROM days').get().payload).orders.length,1);
 db.exec("CREATE TRIGGER fail_day BEFORE UPDATE ON days BEGIN SELECT RAISE(ABORT,'test write failed'); END;");
 assert.throws(()=>write(2,{revision:2,quantities:{'inca-litro':2}},'fail'),/test write failed/);assert.equal(db.prepare('SELECT revision FROM inventory').get().revision,2);
 }finally{db.close();}
});
