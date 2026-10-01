import {database} from '@/db/raw';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  if(!await getChatGPTUser())return Response.json({error:'Inicia sesión para consultar el historial.'},{status:401});
  const records=await database().prepare('SELECT payload FROM days ORDER BY date DESC').all();
  return Response.json({days:records.results.map((row:any)=>JSON.parse(row.payload))},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error(e);
  return Response.json({error:'No se pudo cargar el historial. Intenta nuevamente.'},{status:503});
 }
}
