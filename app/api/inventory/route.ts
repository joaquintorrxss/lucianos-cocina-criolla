import {getCurrentUser} from '@/app/auth';
import {database} from '@/db/raw';
import {readCatalog} from '@/db/catalog';
import {readInventory} from '@/db/inventory';
import {safeAuthOrigin} from '@/lib/auth-http';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function state(req:Request){
 const url=new URL(req.url),cursor=url.searchParams.get('before')??'',cursorId=url.searchParams.get('beforeId')??'',product=url.searchParams.get('product')??'',date=url.searchParams.get('date')??'';
 const movements=await database().prepare('SELECT m.*,p.name FROM inventory_movements m LEFT JOIN products p ON p.id=m.product_id WHERE (?=\'\' OR m.product_id=?) AND (?=\'\' OR date(m.at,\'-5 hours\')=?) AND (?=\'\' OR m.at<? OR (m.at=? AND m.id<?)) ORDER BY m.at DESC,m.id DESC LIMIT 100').bind(product,product,date,date,cursor,cursor,cursor,cursorId).all();
 const {catalog}=await readCatalog(true);
 return {...await readInventory(),products:catalog.filter(p=>p.persistentStock),movements:movements.results};
}
export async function GET(req:Request){try{if(!await getCurrentUser())return json({error:'Inicia sesión.'},401);return json(await state(req));}catch{return json({error:'No se pudo cargar el inventario.'},503);}}
export async function POST(req:Request){
 try{
  const user=await getCurrentUser();if(!user)return json({error:'Inicia sesión.'},401);if(!safeAuthOrigin(req))return json({error:'Origen no permitido.'},403);
  if(Number(req.headers.get('content-length')??0)>8192)return json({error:'Solicitud demasiado grande.'},413);
  const raw=await req.text();if(raw.length>8192)return json({error:'Solicitud demasiado grande.'},413);const a=JSON.parse(raw),db=database();
  if(typeof a.opId!=='string'||! /^[a-f0-9-]{36}$/.test(a.opId))return json({error:'Operación inválida.'},400);
  if(await db.prepare('SELECT id FROM inventory_movements WHERE op_id=? LIMIT 1').bind(a.opId).first())return json(await state(req));
  const before=await readInventory();if(a.revision!==before.revision)return json({error:'El stock cambió. Revisa la cantidad actual y vuelve a guardar.',...await state(req)},409);
  const {catalog}=await readCatalog(true);const p=catalog.find(p=>p.id===a.productId&&p.persistentStock);if(!p)return json({error:'Gaseosa no disponible.'},400);
  if(!['initial','restock','adjust'].includes(a.type)||!Number.isSafeInteger(a.qty)||a.qty<0||a.qty>100000||typeof a.reason!=='string'||a.reason.trim().length<3||a.reason.length>500)return json({error:'Revisa la cantidad y escribe un motivo.'},400);
  const current=before.quantities[p.id]??null;if(a.type==='initial'&&current!==null||a.type!=='initial'&&current===null)return json({error:'Elige el tipo de movimiento que corresponde al stock actual.'},400);
  const qty=a.type==='restock'?current!+a.qty:a.qty;if(qty>100000||a.type==='restock'&&a.qty===0)return json({error:'Cantidad fuera del límite permitido.'},400);
  const quantities={...before.quantities,[p.id]:qty},at=new Date().toISOString();
  const saved=await db.batch([
   db.prepare('UPDATE inventory SET quantities=?,revision=revision+1,last_op=? WHERE id=1 AND revision=?').bind(JSON.stringify(quantities),a.opId,before.revision),
   db.prepare('INSERT OR IGNORE INTO inventory_movements (id,op_id,product_id,delta,remaining,reason,actor,at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM inventory WHERE id=1 AND revision=? AND last_op=?)').bind(a.opId+':'+p.id,a.opId,p.id,qty-(current??0),qty,(a.type==='initial'?'Stock inicial':a.type==='restock'?'Reposición':'Ajuste')+' · '+a.reason.trim(),user.username,at,before.revision+1,a.opId),
  ]);
  if(saved[0].meta.changes!==1)return json({error:'El stock cambió mientras guardabas. Vuelve a revisar.',...await state(req)},409);
  return json(await state(req));
 }catch{return json({error:'No se pudo guardar el inventario. Revisa la conexión.'},503);}
}
