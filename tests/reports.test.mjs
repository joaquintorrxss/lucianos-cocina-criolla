import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,openDay,applyAction} from '../lib/model.ts';
import {filterDays,businessReport,reportOrders,cashLedger} from '../lib/reports.ts';
const act=(day,action)=>applyAction(day,{opId:crypto.randomUUID(),...action});
function fixture(menu,date,product,qty,cash,yape,opening=6000,close=true){
 let day=openDay({menu,date,opening,stock:Object.fromEntries(catalog.filter(p=>p.days.includes(menu)).map(p=>[p.id,p.category==='Platos'?10:null]))});
 day=act(day,{type:'order',table:1,notes:'',lines:[{productId:product,qty,price:1800}]});
 const id=day.orders[0].id;
 day=act(day,{type:'payment',orderId:id,cash,yape,tender:cash+1000});
 day=act(day,{type:'serve-order',orderId:id});
 if(close)day=act(day,{type:'close',counted:opening+cash});
 return day;
}
const sunday=()=>fixture('Domingo','2026-09-23','patita',1,1000,800);
const monday=()=>fixture('Lunes','2026-09-28','shambar',2,0,3600,7000);

test('calendar date and attention menu are independent, combinable filters',()=>{
 const days=[sunday(),monday()];
 assert.equal(filterDays(days,{date:'2026-09-23',menu:'Domingo',status:'Todas'}).length,1);
 assert.equal(filterDays(days,{date:'2026-09-23',menu:'Lunes',status:'Todas'}).length,0);
 assert.equal(filterDays(days,{date:'',menu:'Lunes',status:'Cerradas'})[0].date,'2026-09-28');
 assert.equal(days[0].date,'2026-09-23');
});
test('business totals do not treat initial cash or returned change as sales',()=>{
 const report=businessReport([sunday(),monday()]);
 assert.equal(report.sales,5400);assert.equal(report.collected,5400);
 assert.equal(report.cash,1000);assert.equal(report.yape,4400);assert.equal(report.change,2000);
 assert.equal(report.days,2);assert.equal(report.orders,2);assert.equal(report.products.reduce((n,p)=>n+p.qty,0),3);
 assert.equal(report.breakdown.reduce((n,b)=>n+b.cash,0),1000);
 assert.equal(report.breakdown.reduce((n,b)=>n+b.yape,0),4400);
 assert.equal(report.attendance.find(a=>a.menu==='Lunes').sales,3600);
});
test('closed and open sessions are filtered without mixing them',()=>{
 const days=[sunday(),fixture('Jueves','2026-09-24','patasquita',1,1800,0,5000,false)];
 assert.equal(filterDays(days,{date:'',menu:'Todos',status:'Cerradas'}).length,1);
 assert.equal(filterDays(days,{date:'',menu:'Todos',status:'Abiertas'})[0].menu,'Jueves');
 assert.equal(businessReport(days).open,1);
});
test('cancelled orders and unrelated cash movements stay separate from sales',()=>{
 let d=fixture('Jueves','2026-09-24','patasquita',1,500,500,6000,false);
 d=act(d,{type:'order',table:2,notes:'',lines:[{productId:'patita',qty:1,price:1800}]});
 d=act(d,{type:'cancel',orderId:d.orders[1].id});
 d=act(d,{type:'movement',direction:'in',amount:200,reason:'Ingreso adicional'});
 d=act(d,{type:'movement',direction:'out',amount:300,reason:'Compra de hielo'});
 const r=businessReport([d]);assert.equal(r.sales,1800);assert.equal(r.collected,1000);assert.equal(r.pending,800);assert.equal(r.cancelled,1);assert.equal(r.orders,1);
 assert.equal(r.movementsIn,200);assert.equal(r.movementsOut,300);assert.equal(r.cash,500);
});
test('historical orders keep their jornada identity when numbers repeat',()=>{
 const a=sunday(),b=monday(),rows=reportOrders([a,b]);
 assert(rows.every(r=>r.order.number===1));assert.equal(new Set(rows.map(r=>r.day.id)).size,2);
 const ledger=cashLedger([a,b]);assert.equal(ledger.filter(r=>r.reason==='Apertura de caja').length,2);
 assert.equal(ledger.filter(r=>r.reason.startsWith('Pedido')).reduce((n,r)=>n+r.cash,0),1000);
});
test('empty reporting scopes return zero totals without a bogus cash balance',()=>{
 const r=businessReport([]);assert.equal(r.sales,0);assert.equal(r.days,0);assert.equal(r.cash,0);assert.equal(r.pending,0);assert.deepEqual(r.products,[]);
 assert.equal(Object.hasOwn(r,'expected'),false);
});
