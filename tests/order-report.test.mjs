import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PDFDocument} from 'pdf-lib';
import {createOrderReport} from '../lib/order-report.ts';
import {reportRecipients,reportFilename,whatsappLink,reportMessage} from '../lib/report-sharing.ts';
const font=fs.readFileSync(new URL('../public/fonts/manrope-report-regular.ttf',import.meta.url));
export function reportFixture(){
 const order=(number,cancelled=false)=>({id:`o${number}`,number,table:number,at:'2026-09-27T18:05:00Z',notes:number===1?'Sin ají. Entregar primero las bebidas.':'',cancelled,
  lines:[{id:`l${number}`,productId:'pato',name:'Pato guisado',category:'Platos',qty:2,price:3000,served:cancelled?0:2,notes:'Una porción sin arroz'},{id:`b${number}`,productId:'inca-litro',name:'Inca Kola · 1 litro',category:'Bebidas',qty:1,price:700,served:cancelled?0:1,notes:''}],
  payments:cancelled?[]:[{id:`p${number}`,cash:3000,yape:3700,tender:5000,change:2000,at:'2026-09-27T18:15:00Z'}]});
 return {id:'sample-closed-day',date:'2026-09-27',menu:'Domingo',opened:'2026-09-27T16:00:00Z',closed:'2026-09-27T21:00:00Z',opening:6000,counted:11500,stock:{},initial:{},prices:{pato:9900},orders:[order(2),order(1),order(3,true)],movements:[{id:'m1',amount:-500,reason:'Hielo',at:'2026-09-27T19:00:00Z'}],events:[],actions:[]};
}
test('closed report has exactly one page per order, including labelled cancellations, and is read-only',async()=>{
 const day=reportFixture(),before=JSON.stringify(day);const result=await createOrderReport(day,font);const pdf=await PDFDocument.load(result.bytes);
 assert.equal(pdf.getPageCount(),3);assert.equal(result.pages,3);assert.deepEqual(result.warnings,[]);
 assert.equal(JSON.stringify(day),before);assert.ok(pdf.getPages().every(p=>p.getSize().height===841.89));
});
test('long details stay on one readable, larger page with a warning',async()=>{
 const day=reportFixture();day.orders=[day.orders[0]];day.orders[0].lines=Array.from({length:25},(_,i)=>({...day.orders[0].lines[0],id:`x${i}`,notes:`Detalle ${i} `+'Sin ají y servir caliente. '.repeat(20)}));
 const result=await createOrderReport(day,font);const pdf=await PDFDocument.load(result.bytes);
 assert.equal(result.pages,1);assert.ok(pdf.getPage(0).getHeight()>842);assert.equal(result.warnings.length,1);
});
test('empty closed day has an explicit report, active days cannot generate a definitive report',async()=>{
 const day=reportFixture();day.orders=[];const result=await createOrderReport(day,font);assert.equal(result.pages,1);
 day.closed=null;await assert.rejects(createOrderReport(day,font),/cierra la jornada/);
});
test('personal recipients are exact and WhatsApp summary keeps net cash separate from Yape',()=>{
 const day=reportFixture();assert.deepEqual(reportRecipients.map(r=>r.number),['51944041834','51982647828']);
 assert.equal(reportFilename(day),'Lucianos-pedidos-2026-09-27.pdf');
 const message=reportMessage(day);assert.match(message,/Ventas: S\/ 134.00/);assert.match(message,/Efectivo de ventas: S\/ 60.00/);assert.match(message,/Yape: S\/ 74.00/);assert.match(message,/Caja esperada: S\/ 115.00/);
 assert.match(whatsappLink(day,reportRecipients[0].number),/^https:\/\/wa.me\/51944041834\?text=/);
 assert.throws(()=>whatsappLink(day,'519826478282'),/no permitido/);
});
test('unsupported symbols are represented explicitly and reported, rather than omitted',async()=>{
 const day=reportFixture();day.orders[0].notes='Celebración 🎉';const result=await createOrderReport(day,font);assert.ok(result.warnings.some(w=>w.includes('Unicode')));
});
