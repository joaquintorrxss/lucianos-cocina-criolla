import {safeAuthOrigin} from '@/lib/auth-http';
import {database} from '@/db/raw';
import {readCatalog} from '@/db/catalog';
import {readInventory,movementWrites} from '@/db/inventory';
import {currentStock,openingStock,inventoryAfter,dayInventoryWrites} from '@/lib/inventory';
import {applyAction,openDay} from '@/lib/model';
import {getCurrentUser} from '@/app/auth';
import {isDayConflict,isStorageFailure} from '@/lib/storage-errors';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function state(id:string|null){
 const db=database();
 const list=await db.prepare('SELECT id,date,active FROM days ORDER BY date DESC').all();
 const row:any=id?await db.prepare('SELECT * FROM days WHERE id=?').bind(id).first():await db.prepare('SELECT * FROM days WHERE active=1 LIMIT 1').first();
 const inventory=await readInventory();
 return {days:list.results,day:row?currentStock(JSON.parse(row.payload),inventory):null,revision:row?.revision??0,inventory,...await readCatalog()};
}
export async function GET(req:Request){
 try {
  if(!await getCurrentUser())return json({error:'Inicia sesión para abrir Lucianos.'},401);
  return json(await state(new URL(req.url).searchParams.get('id')));
 }catch(e){console.error(e);return json({error:'No se pudieron cargar los registros. Intenta nuevamente.'},503);}
}
export async function POST(req:Request){
 try{
  const user=await getCurrentUser();if(!user)return json({error:'Inicia sesión para guardar los cambios.'},401);
  if(!safeAuthOrigin(req))return json({error:'Origen no permitido.'},403);
  if(Number(req.headers.get('content-length')??0)>100000)return json({error:'El pedido es demasiado grande.'},413);
  const a:any=await req.json();const db=database();
  if(a.type==='open'){
   const current=await readCatalog();
   if(a.catalogVersion!==current.catalogVersion)return json({error:'La carta cambió. Actualiza la pantalla y vuelve a abrir la jornada.',...await state(null)},409);
   const inventory=await readInventory(),opening=openingStock(current.catalog,a.menu,a.stock??{},inventory);
   const d=openDay({...a,stock:opening.stock,prices:undefined},current.catalog);
   if(typeof a.opId!=='string'||a.opId.length>100)return json({error:'Operación inválida.'},400);
   try {const saved=await db.batch([
    db.prepare('UPDATE inventory SET quantities=?,revision=revision+1,last_op=? WHERE id=1 AND revision=? AND EXISTS (SELECT 1 FROM catalog_meta WHERE id=1 AND revision=?) AND NOT EXISTS (SELECT 1 FROM days WHERE active=1 OR date=?)').bind(JSON.stringify(opening.quantities),a.opId,inventory.revision,current.catalogVersion,d.date),
    db.prepare('INSERT INTO days (id,date,active,revision,payload) SELECT ?,?,1,1,? WHERE EXISTS (SELECT 1 FROM inventory WHERE id=1 AND revision=? AND last_op=?) AND NOT EXISTS (SELECT 1 FROM days WHERE active=1 OR date=?)').bind(d.id,d.date,JSON.stringify(d),inventory.revision+1,a.opId,d.date),
    ...movementWrites(inventory,opening.quantities,a.opId,user.username,'Stock inicial al abrir jornada',d.id),
   ]);if(saved[1].meta.changes!==1)return json({error:'La carta, el inventario o la jornada cambió. Actualiza la pantalla antes de abrir.',...await state(null)},409);}
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
  if(a.type==='close'&&!Number.isSafeInteger(a.countedYape))return json({error:'Registra también el conteo manual de Yape.'},400);
  const inventory=await readInventory(),d=applyAction(currentStock(original,inventory),a);
  const statements=dayInventoryWrites(row.revision,d,inventory,a.opId);
  const result=await db.batch([...statements.map(s=>db.prepare(s.sql).bind(...s.args)),...movementWrites(inventory,inventoryAfter(d,inventory),a.opId,user.username,a.type==='cancel'?'Anulación de pedido':a.type==='order'?'Registro o edición de pedido':'Jornada',d.id)]);
  if(result[1].meta.changes!==1)return json({error:'La jornada o el inventario cambió mientras guardabas. Actualiza y vuelve a intentar.',...await state(row.id)},409);
  return json(await state(d.id));
 }catch(e){
  console.error(e);
  if(isStorageFailure(e))return json({error:'No se pudo guardar por un problema de conexión con los registros. Reintenta; el formulario conserva tus datos.'},503);
  return json({error:e instanceof Error?e.message:'No se pudo guardar. Tus datos siguen en el formulario.'},400);
 }
}
