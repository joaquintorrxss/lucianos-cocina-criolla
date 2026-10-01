import {type Day,type Order,total,paid,served,balance} from './model.ts';
export const stages=['Por atender','Atendidos · por pagar','Pagados · por atender','Completados'] as const;
export type Stage=typeof stages[number];
export function orderStage(o:Order):Stage {
 if(served(o))return paid(o)===total(o)?'Completados':'Atendidos · por pagar';
 return paid(o)===total(o)?'Pagados · por atender':'Por atender';
}
export function stageLabel(o:Order){const s=orderStage(o);return s==='Por atender'?'Por atender · por pagar':s==='Completados'?'Atendido y pagado':s==='Atendidos · por pagar'?'Atendido · por pagar':'Pagado · por atender';}
export function stageColor(o:Order){return ['amber','blue','purple','settled'][stages.indexOf(orderStage(o))];}
// Largest-remainder allocation preserves every cent in mixed and partial payments.
function allocate(amount:number,weights:number[]){
 const sum=weights.reduce((n,w)=>n+w,0);if(!sum)return weights.map(()=>0);
 const raw=weights.map(w=>amount*w/sum),result=raw.map(Math.floor);
 const left=amount-result.reduce((n,w)=>n+w,0);
 const ranked=raw.map((n,i)=>({i,fraction:n-result[i]})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
 for(let i=0;i<left;i++)result[ranked[i].i]++;
 return result;
}
export function dayAccounting(d:Day){
 const categories=['Platos','Bebidas','Adicionales'] as const;
 const breakdown=categories.map(category=>({category,qty:0,sales:0,cash:0,yape:0,pending:0}));
 let cashSales=0,yape=0,sales=0,collected=0,tender=0,change=0;
 for(const o of d.orders.filter(o=>!o.cancelled)){
  const values=categories.map(c=>o.lines.filter(l=>l.category===c).reduce((n,l)=>n+l.qty*l.price,0));
  const cash=o.payments.reduce((n,p)=>n+p.cash,0),digital=o.payments.reduce((n,p)=>n+p.yape,0);
  const collectedByCategory=allocate(cash+digital,values),cashByCategory=allocate(cash,collectedByCategory);
  breakdown.forEach((b,i)=>{b.sales+=values[i];b.cash+=cashByCategory[i];b.yape+=collectedByCategory[i]-cashByCategory[i];b.pending+=values[i]-collectedByCategory[i];b.qty+=o.lines.filter(l=>l.category===b.category).reduce((n,l)=>n+l.qty,0)});
  cashSales+=cash;yape+=digital;sales+=total(o);collected+=paid(o);tender+=o.payments.reduce((n,p)=>n+p.tender,0);change+=o.payments.reduce((n,p)=>n+p.change,0);
 }
 const movementsIn=d.movements.filter(m=>m.amount>0).reduce((n,m)=>n+m.amount,0),movementsOut=-d.movements.filter(m=>m.amount<0).reduce((n,m)=>n+m.amount,0);
 return {opening:d.opening,cashSales,yape,sales,collected,pending:sales-collected,tender,change,movementsIn,movementsOut,expected:balance(d),breakdown};
}
