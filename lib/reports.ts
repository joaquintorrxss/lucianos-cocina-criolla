import {type Day} from './model.ts';
import {dayAccounting} from './accounting.ts';
export type ReportFilters={date:string;menu:string;status:'Todas'|'Cerradas'|'Abiertas'};
export function filterDays(days:Day[],filters:ReportFilters){
 return days.filter(d=>(!filters.date||d.date===filters.date)&&(filters.menu==='Todos'||d.menu===filters.menu)&&(filters.status==='Todas'||filters.status==='Cerradas'&&!!d.closed||filters.status==='Abiertas'&&!d.closed)).sort((a,b)=>b.date.localeCompare(a.date));
}
export function businessReport(days:Day[]){
 const categories=['Platos','Bebidas','Adicionales'] as const;
 const breakdown=categories.map(category=>({category,qty:0,sales:0,cash:0,yape:0,pending:0}));
 const products=new Map<string,{id:string;name:string;category:string;qty:number;sales:number}>();
 let sales=0,collected=0,cash=0,yape=0,pending=0,movementsIn=0,movementsOut=0,change=0,orders=0,cancelled=0,closedVariance=0;
 const attendance=['Domingo','Lunes','Jueves'].map(menu=>({menu,days:0,sales:0,cash:0,yape:0}));
 for(const d of days){
  const r=dayAccounting(d);sales+=r.sales;collected+=r.collected;cash+=r.cashSales;yape+=r.yape;pending+=r.pending;movementsIn+=r.movementsIn;movementsOut+=r.movementsOut;change+=r.change;
  if(d.closed&&d.counted!==null)closedVariance+=d.counted-r.expected;
  breakdown.forEach((b,i)=>{for(const key of ['qty','sales','cash','yape','pending'] as const)b[key]+=r.breakdown[i][key]});
  const a=attendance.find(a=>a.menu===d.menu);if(a){a.days++;a.sales+=r.sales;a.cash+=r.cashSales;a.yape+=r.yape;}
  for(const o of d.orders){
   if(o.cancelled){cancelled++;continue}orders++;
   for(const l of o.lines){const product=products.get(l.productId)??{id:l.productId,name:l.name,category:l.category,qty:0,sales:0};product.qty+=l.qty;product.sales+=l.qty*l.price;products.set(l.productId,product);}
  }
 }
 return {days:days.length,closed:days.filter(d=>!!d.closed).length,open:days.filter(d=>!d.closed).length,sales,collected,cash,yape,pending,movementsIn,movementsOut,change,orders,cancelled,closedVariance,breakdown,attendance,products:[...products.values()].sort((a,b)=>b.qty-a.qty||a.name.localeCompare(b.name))};
}
export function reportOrders(days:Day[]){return days.flatMap(day=>day.orders.map(order=>({day,order}))).sort((a,b)=>b.order.at.localeCompare(a.order.at));}
export function cashLedger(days:Day[]){
 return days.flatMap(d=>[
  {id:d.id+'-opening',date:d.date,menu:d.menu,at:d.opened,reason:'Apertura de caja',cash:d.opening,yape:0,change:0,tender:d.opening},
  ...d.movements.map(m=>({id:m.id,date:d.date,menu:d.menu,at:m.at,reason:m.reason,cash:m.amount,yape:0,change:0,tender:m.amount})),
  ...d.orders.filter(o=>!o.cancelled).flatMap(o=>o.payments.map(p=>({id:p.id,date:d.date,menu:d.menu,at:p.at,reason:`Pedido #${o.number} · Mesa ${o.table}`,cash:p.cash,yape:p.yape,change:p.change,tender:p.tender})))
 ]).sort((a,b)=>b.at.localeCompare(a.at));
}
