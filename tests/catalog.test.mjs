import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {validateProduct} from '../lib/catalog-model.ts';
import {openDay,applyAction,dayCatalog,total} from '../lib/model.ts';

test('catalog validates category, service days, cents and name without accepting invalid input',()=>{
 const p=validateProduct({name:'  Seco de res  ',category:'Platos',price:2550,days:['Jueves','Domingo']});
 assert.equal(p.name,'Seco de res');assert.deepEqual(p.days,['Domingo','Jueves']);assert.equal(p.price,2550);
 for(const a of [{...p,price:2.5},{...p,price:-1},{...p,category:'Otro'},{...p,days:[]},{...p,days:['Martes']},{...p,days:['Lunes','Lunes']},{...p,name:'x'},null])assert.throws(()=>validateProduct(a));
});
test('managed menus are snapshotted; renamed, repriced and withdrawn products cannot change previous orders or active service',()=>{
 const p={id:'custom',name:'Seco de res',category:'Platos',price:2550,days:['Domingo']};
 let d=openDay({menu:'Domingo',date:'2026-09-27',opening:6000,stock:{custom:5}},[p]);
 const act=a=>{d=applyAction(d,{...a,opId:crypto.randomUUID()});};
 act({type:'order',table:1,notes:'',lines:[{productId:'custom',qty:2,price:2550}]});
 const previous=structuredClone(d.orders[0]);p.name='Seco especial';p.price=3100;p.days=[];
 assert.equal(dayCatalog(d)[0].name,'Seco de res');assert.equal(d.prices.custom,2550);assert.equal(total(d.orders[0]),5100);
 act({type:'price',productId:'custom',price:2900});assert.deepEqual(d.orders[0],previous);
 act({type:'order',table:2,notes:'',lines:[{productId:'custom',qty:1,price:2900}]});assert.equal(d.orders[1].lines[0].price,2900);
 act({type:'order',orderId:previous.id,table:1,notes:'Actualizado',lines:previous.lines});assert.equal(d.orders[0].lines[0].name,'Seco de res');
 assert.throws(()=>applyAction(d,{type:'order',table:3,notes:'',lines:[{productId:'unlisted',qty:1,price:100}],opId:crypto.randomUUID()}),/carta/);
});
test('catalog migration seeds original menu, adds operator default and tracks every master change',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec(readFileSync('drizzle/0000_puzzling_zaladane.sql','utf8'));db.exec(readFileSync('drizzle/0001_typical_nighthawk.sql','utf8'));
  db.exec("INSERT INTO auth_users (id,username,password_hash,active,created_at) VALUES ('u','existing','hash',1,0)");
  db.exec(readFileSync('drizzle/0002_simple_cloak.sql','utf8'));
  assert.equal(db.prepare('SELECT role FROM auth_users').get().role,'operator');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM products WHERE active=1').get().n,25);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days').get().n,0);
  const version=()=>db.prepare('SELECT revision FROM catalog_meta WHERE id=1').get().revision;
  const old=version();db.exec("UPDATE products SET active=0 WHERE id='pato'");assert.equal(version(),old+1);
  db.exec("UPDATE products SET active=1,price=3500,revision=revision+1 WHERE id='pato'");assert.equal(version(),old+2);
  assert.equal(db.prepare("SELECT price FROM products WHERE id='pato'").get().price,3500);
 }finally{db.close();}
});
