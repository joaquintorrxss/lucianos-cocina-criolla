import {database} from '@/db/raw';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {createOrderReport} from '@/lib/order-report';
import {reportFilename} from '@/lib/report-sharing';
import type {Day} from '@/lib/model';
import manrope from '@/public/fonts/manrope-report-regular.ttf?inline';
import manropeBold from '@/public/fonts/manrope-report-bold.ttf?inline';

export const dynamic='force-dynamic';
const json=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){
 try{
  if(!await getChatGPTUser())return json('Inicia sesión para descargar el reporte.',401);
  const url=new URL(req.url),id=url.searchParams.get('dayId');
  if(!id||id.length>100)return json('Selecciona una jornada válida.',400);
  const row=await database().prepare('SELECT payload FROM days WHERE id=?').bind(id).first<{payload:string}>();
  if(!row)return json('No se encontró la jornada.',404);
  const day=JSON.parse(row.payload) as Day;
  if(!day.closed||day.counted===null)return json('Cierra la jornada y finaliza el arqueo para generar el reporte definitivo.',409);
  const fontBytes=Uint8Array.from(atob(manrope.split(',')[1]),c=>c.charCodeAt(0));
  const boldBytes=Uint8Array.from(atob(manropeBold.split(',')[1]),c=>c.charCodeAt(0));
  const report=await createOrderReport(day,fontBytes,boldBytes);
  return new Response(new Uint8Array(report.bytes),{headers:{
   'Content-Type':'application/pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
   'Content-Disposition':`${url.searchParams.get('download')==='1'?'attachment':'inline'}; filename="${reportFilename(day)}"`,
   'X-Report-Pages':String(report.pages),'X-Report-Warnings':encodeURIComponent(JSON.stringify(report.warnings)),
  }});
 }catch(e){console.error('Report generation failed',e);return json('No se pudo generar el PDF. La jornada sigue guardada; puedes volver a intentarlo desde Historial.',503);}
}
