import {safeAuthOrigin} from '@/lib/auth-http';
import {database} from '@/db/raw';
import {applyAction,openDay} from '@/lib/model';
import {getCurrentUser} from '@/app/auth';
import {isDayConflict,isStorageFailure} from '@/lib/storage-errors';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function state(id:string|null){
 const db=database();
 const list=await db.prepare('SELECT id,date,active FROM days ORDER BY date DESC').all();
 const row:any=id?await db.prepare('SELECT * FROM days WHERE id=?').bind(id).first():await db.prepare('SELECT * FROM days WHERE active=1 LIMIT 1').first();
 const latest:any=row??await db.prepare('SELECT payload FROM days ORDER BY date DESC LIMIT 1').first();
 return {days:list.results,day:row?JSON.parse(row.payload):null,revision:row?.revision??0,lastPrices:latest?JSON.parse(latest.payload).prices:undefined};
}
export async function GET(req:Request){
 try {
  if(!await getCurrentUser())return json({error:'Inicia sesión para abrir Lucianos.'},401);
  return json(await state(new URL(req.url).searchParams.get('id')));
 }catch(e){console.error(e);return json({error:'No se pudieron cargar los registros. Intenta nuevamente.'},503);}
}
export async function POST(req:Request){
 try{
  if(!await getCurrentUser())return json({error:'Inicia sesión para guardar los cambios.'},401);
  if(!safeAuthOrigin(req))return json({error:'Origen no permitido.'},403);
  if(Number(req.headers.get('content-length')??0)>100000)return json({error:'El pedido es demasiado grande.'},413);
  const a:any=await req.json();const db=database();
  if(a.type==='open'){
   const d=openDay(a);
   try {await db.prepare('INSERT INTO days (id,date,active,revision,payload) VALUES (?,?,1,1,?)').bind(d.id,d.date,JSON.stringify(d)).run();}
   catch(e){
    if(!isDayConflict(e))throw e;
    const existing=await state(null);
    return json({error:existing.day&&!existing.day.closed?'Ya hay una jornada abierta. Se han cargado sus registros.':'Ya existe una jornada para esa fecha. Selecciona otra fecha.',...existing},409);
   }
   return json(await state(d.id));
  }
  const row:any=await db.prepare('SELECT * FROM days WHERE id=?').bind(a.dayId).first();
  if(!row)return json({error:'Jornada no encontrada.'},404);
  const original=JSON.parse(row.payload);
  if(original.actions.includes(a.opId))return json(await state(row.id));
  if(a.revision!==row.revision)return json({error:'Otra operación cambió la jornada. Cierra este formulario y vuelve a abrirlo con los datos actualizados.',...await state(row.id)},409);
  const d=applyAction(original,a);
  const result=await db.prepare('UPDATE days SET payload=?,revision=revision+1,active=? WHERE id=? AND revision=?').bind(JSON.stringify(d),d.closed?null:1,d.id,row.revision).run();
  if(result.meta.changes!==1)return json({error:'La jornada cambió mientras guardabas. Actualiza y vuelve a intentar.',...await state(row.id)},409);
  return json(await state(d.id));
 }catch(e){
  console.error(e);
  if(isStorageFailure(e))return json({error:'No se pudo guardar por un problema de conexión con los registros. Reintenta; el formulario conserva tus datos.'},503);
  return json({error:e instanceof Error?e.message:'No se pudo guardar. Tus datos siguen en el formulario.'},400);
 }
}
