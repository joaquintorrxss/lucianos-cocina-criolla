import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {openDay} from '../lib/model.ts';
import {openingWrites} from '../lib/day-opening.ts';

const menu=[{id:'test',name:'Plato de prueba',category:'Platos',price:1800,days:['Domingo']}];
const day=()=>openDay({menu:'Domingo',date:'2026-09-27',opening:6000,stock:{test:7}},menu);
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+name,'utf8'));
 return db;
}
function write(db,d,inventory,opId,catalogVersion=db.prepare('SELECT revision FROM catalog_meta').get().revision){
 db.exec('BEGIN');
 try{
  const changes=openingWrites(d,inventory,{...inventory.quantities,test:3},catalogVersion,opId).map(s=>db.prepare(s.sql).run(...s.args).changes);
  db.exec('COMMIT');return changes;
 }catch(e){db.exec('ROLLBACK');throw e;}
}
const inventory=db=>{const row=db.prepare('SELECT * FROM inventory').get();return {revision:row.revision,quantities:JSON.parse(row.quantities)};};

test('a closed jornada no longer blocks a new one on the same date; historical payload and revision stay intact',()=>{
 const db=fixture();try{
  const old={...day(),closed:'2026-09-27T19:00:00Z'},payload=JSON.stringify(old);
  db.prepare('INSERT INTO days (id,date,active,revision,payload) VALUES (?,?,NULL,4,?)').run(old.id,old.date,payload);
  const next=day();assert.deepEqual(write(db,next,inventory(db),'new-opening'),[1,1]);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days WHERE date=?').get(old.date).n,2);
  const previous=db.prepare('SELECT payload,revision,active FROM days WHERE id=?').get(old.id);
  assert.equal(previous.payload,payload);assert.equal(previous.revision,4);assert.equal(previous.active,null);
  assert.equal(db.prepare('SELECT id FROM days WHERE active=1').get().id,next.id);
 }finally{db.close();}
});

test('concurrent openings and repeated operations cannot create a second jornada or change inventory twice',()=>{
 const db=fixture();try{
  const before=inventory(db),first=day();assert.deepEqual(write(db,first,before,'same-operation'),[1,1]);
  assert.deepEqual(write(db,day(),before,'other-operation'),[0,0]);
  assert.deepEqual(write(db,day(),inventory(db),'same-operation'),[0,0]);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days').get().n,1);
  const revision=inventory(db).revision;
  db.prepare('UPDATE days SET active=NULL WHERE id=?').run(first.id);
  assert.deepEqual(write(db,day(),inventory(db),'same-operation'),[0,0]);
  assert.equal(inventory(db).revision,revision);
  assert.deepEqual(write(db,day(),inventory(db),'fresh-operation'),[1,1]);
 }finally{db.close();}
});

test('opening rejects stale catalog or inventory and rolls both writes back if saving the jornada fails',()=>{
 const db=fixture();try{
  const before=inventory(db);
  assert.deepEqual(write(db,day(),before,'stale-catalog',999),[0,0]);
  assert.deepEqual(write(db,day(),{...before,revision:999},'stale-stock'),[0,0]);
  db.exec("CREATE TRIGGER fail_open BEFORE INSERT ON days BEGIN SELECT RAISE(ABORT,'test opening failed'); END;");
  assert.throws(()=>write(db,day(),before,'failed-opening'),/test opening failed/);
  assert.deepEqual(inventory(db),before);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days').get().n,0);
 }finally{db.close();}
});

test('migration keeps existing closed and active jornadas byte for byte and preserves the single-active constraint',()=>{
 const db=new DatabaseSync(':memory:');try{
  for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')&&!n.startsWith('0007')).sort())db.exec(readFileSync('drizzle/'+name,'utf8'));
  const d=day(),payload=JSON.stringify(d);
  db.prepare('INSERT INTO days (id,date,active,revision,payload) VALUES (?,?,1,8,?)').run(d.id,d.date,payload);
  db.exec(readFileSync('drizzle/0007_allow_new_jornada_after_close.sql','utf8'));
  const row=db.prepare('SELECT * FROM days').get();assert.equal(row.payload,payload);assert.equal(row.revision,8);assert.equal(row.active,1);assert.equal(row.opening_op_id,null);
  assert.throws(()=>db.prepare('INSERT INTO days (id,date,active,payload) VALUES (?,?,1,?)').run('another',d.date,payload),/UNIQUE constraint failed: days.active/);
 }finally{db.close();}
});
