import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,openDay,applyAction,total,paid,balance,served} from '../lib/model.ts';
import {dayAccounting,orderStage} from '../lib/accounting.ts';
const create=()=>openDay({menu:'Domingo',date:'2026-09-27',opening:6000,stock:Object.fromEntries(catalog.filter(p=>p.days.includes('Domingo')).map(p=>[p.id,p.category==='Platos'?8:null]))});
const act=(d,a)=>applyAction(d,{opId:crypto.randomUUID(),...a});
const order=(d,lines=[{productId:'patita',qty:1,price:1800,notes:'Sin ají'}])=>act(d,{type:'order',table:1,notes:'Mesa junto a la ventana',lines});
test('orders move through independent service and payment stages',()=>{
 let d=order(create());const id=d.orders[0].id;
 assert.equal(orderStage(d.orders[0]),'Por atender');
 d=act(d,{type:'serve-order',orderId:id});assert.equal(orderStage(d.orders[0]),'Atendidos · por pagar');
 d=act(d,{type:'payment',orderId:id,cash:1800,yape:0,tender:2000});assert.equal(orderStage(d.orders[0]),'Completados');
 d=act(d,{type:'serve',orderId:id,lineId:d.orders[0].lines[0].id,qty:0});assert.equal(orderStage(d.orders[0]),'Pagados · por atender');assert.equal(balance(d),7800);
});
test('prepayment preserves pending service; the cash after payment is persisted',()=>{
 let d=order(create());const id=d.orders[0].id;
 d=act(d,{type:'payment',orderId:id,cash:1800,yape:0,tender:5000});
 assert.equal(orderStage(d.orders[0]),'Pagados · por atender');assert.equal(d.orders[0].payments[0].change,3200);
 const reloaded=JSON.parse(JSON.stringify(d));assert.equal(reloaded.orders[0].payments[0].cashAfter,7800);assert.equal(balance(reloaded),7800);
 d=act(d,{type:'serve-order',orderId:id});assert.equal(orderStage(d.orders[0]),'Completados');
});
test('dish quantities and separate instructions survive registration and editing',()=>{
 let d=order(create(),[{productId:'pato',qty:2,price:3000,notes:'Sin ají'},{productId:'pato',qty:1,price:3000,notes:'Sin arroz'}]);
 assert.equal(d.stock.pato,5);assert.deepEqual(d.orders[0].lines.map(l=>l.notes),['Sin ají','Sin arroz']);
 const o=d.orders[0];d=act(d,{type:'serve',orderId:o.id,lineId:o.lines[0].id,qty:1});
 d=act(d,{type:'order',orderId:o.id,table:1,notes:o.notes,lines:d.orders[0].lines.map((l,i)=>({...l,notes:i===0?'Sin ají ni ensalada':l.notes}))});
 assert.equal(d.stock.pato,5);assert.equal(d.orders[0].lines[0].served,1);assert.equal(d.orders[0].lines[0].notes,'Sin ají ni ensalada');
});
test('adding products to an already paid order keeps prior payments and reopens outstanding work',()=>{
 let d=order(create());const id=d.orders[0].id;
 d=act(d,{type:'payment',orderId:id,cash:0,yape:1800,tender:0});d=act(d,{type:'serve-order',orderId:id});
 const old=d.orders[0].lines;
 d=act(d,{type:'order',orderId:id,table:1,notes:'',lines:[...old,{productId:'coca-personal',qty:1,price:300,notes:'Sin hielo'}]});
 assert.equal(paid(d.orders[0]),1800);assert.equal(total(d.orders[0])-paid(d.orders[0]),300);assert.equal(orderStage(d.orders[0]),'Por atender');assert.equal(balance(d),6000);
 assert.throws(()=>act(d,{type:'order',orderId:id,table:1,notes:'',lines:d.orders[0].lines.map(l=>({...l,price:50}))}),/menor/);
});
test('fully paid products cannot be removed or repriced while adding new products',()=>{
 let d=order(create());const id=d.orders[0].id;d=act(d,{type:'payment',orderId:id,cash:1800,yape:0,tender:1800});
 assert.throws(()=>act(d,{type:'order',orderId:id,table:1,notes:'',lines:[{productId:'pato',qty:1,price:3000}]}),/Conserva/);
});
test('mixed payment and category report preserve all cents and exclude Yape from cash',()=>{
 let d=order(create(),[{productId:'pato',qty:2,price:3000},{productId:'inca-litro',qty:1,price:700},{productId:'taper',qty:1,price:200}]);
 const id=d.orders[0].id;d=act(d,{type:'payment',orderId:id,cash:1234,yape:4321,tender:5000});
 d=act(d,{type:'movement',direction:'out',amount:500,reason:'Compra de hielo'});
 let r=dayAccounting(d);assert.equal(r.expected,6734);assert.equal(r.cashSales,1234);assert.equal(r.yape,4321);assert.equal(r.pending,1345);
 assert.equal(r.breakdown.reduce((n,x)=>n+x.cash,0),1234);assert.equal(r.breakdown.reduce((n,x)=>n+x.yape,0),4321);assert.equal(r.breakdown.reduce((n,x)=>n+x.pending,0),1345);assert(r.breakdown.every(x=>x.pending>=0));
 d=act(d,{type:'payment',orderId:id,cash:0,yape:1345,tender:0});r=dayAccounting(d);assert(r.breakdown.every(x=>x.pending===0));assert.equal(r.expected,6734);assert.equal(r.yape,5666);
});
test('historical records without dish notes or cash snapshots remain readable',()=>{
 let d=order(create());delete d.orders[0].lines[0].notes;d=act(d,{type:'payment',orderId:d.orders[0].id,cash:0,yape:1800,tender:0});delete d.orders[0].payments[0].cashAfter;
 assert.equal(dayAccounting(d).expected,6000);assert.equal(orderStage(d.orders[0]),'Pagados · por atender');
});

