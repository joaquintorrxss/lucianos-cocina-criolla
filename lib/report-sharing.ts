import {type Day} from './model.ts';
import {dayAccounting} from './accounting.ts';
export const reportRecipients = [
 {number:'51944041834',label:'+51 944 041 834'},
 {number:'51982647828',label:'+51 982 647 828'},
] as const;
export const reportFilename=(day:Pick<Day,'date'>)=>`Lucianos-pedidos-${day.date}.pdf`;
const soles=(value:number)=>`S/ ${(value/100).toFixed(2)}`;
export function reportMessage(day:Day){
 const a=dayAccounting(day),date=new Date(day.date+'T12:00:00-05:00').toLocaleDateString('es-PE',{timeZone:'America/Lima'});
 return `Lucianos Cocina Criolla - cierre ${date} (${day.menu}).\n${day.orders.filter(o=>!o.cancelled).length} pedidos. Ventas: ${soles(a.sales)}.\nEfectivo de ventas: ${soles(a.cashSales)}. Yape: ${soles(a.yape)}.\nCaja esperada: ${soles(a.expected)}. Contada: ${soles(day.counted??0)}. Diferencia: ${soles((day.counted??0)-a.expected)}.\nReporte: ${reportFilename(day)}. Adjuntar el PDF a este mensaje.`;
}
export function whatsappLink(day:Day,number:string){
 if(!reportRecipients.some(r=>r.number===number))throw new Error('Contacto de reporte no permitido.');
 return `https://wa.me/${number}?text=${encodeURIComponent(reportMessage(day))}`;
}
