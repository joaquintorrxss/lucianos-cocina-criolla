import {getCurrentUser} from '@/app/auth';
import {readCatalog} from '@/db/catalog';
import {database} from '@/db/raw';
import {validateProduct} from '@/lib/catalog-model';
import {safeAuthOrigin} from '@/lib/auth-http';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 try{const user=await getCurrentUser();if(!user)return json({error:'Inicia sesión.'},401);if(user.role!=='admin')return json({error:'Solo el administrador puede gestionar la carta.'},403);return json(await readCatalog(true));}
 catch{ return json({error:'No se pudo cargar la carta. Intenta nuevamente.'},503); }
}
export async function POST(req:Request){
 try{
  const user=await getCurrentUser();if(!user)return json({error:'Inicia sesión.'},401);if(user.role!=='admin')return json({error:'Solo el administrador puede gestionar la carta.'},403);
  if(!safeAuthOrigin(req))return json({error:'Origen no permitido.'},403);
  if(!req.headers.get('content-type')?.startsWith('application/json'))return json({error:'Solicitud inválida.'},400);
  const reader=req.body?.getReader();if(!reader)return json({error:'Solicitud inválida.'},400);
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel().catch(()=>undefined);return json({error:'El formulario es demasiado grande.'},413);}chunks.push(value);}
  const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
  let a:any;try{a=JSON.parse(new TextDecoder().decode(buffer));}catch{return json({error:'Solicitud inválida.'},400);}
  if(!a||!['create','update','archive','restore'].includes(a.type))return json({error:'Operación inválida.'},400);
  const db=database();let result;
  if(a.type==='create'){
   if(typeof a.id!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(a.id))return json({error:'Producto inválido.'},400);
   const p=validateProduct(a);result=await db.prepare('INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES (?,?,?,?,?,1,1,?) ON CONFLICT(id) DO NOTHING').bind(a.id,p.name,p.category,p.price,JSON.stringify(p.days),Date.now()).run();
  }else{
   if(typeof a.id!=='string'||a.id.length>100||!Number.isSafeInteger(a.revision)||a.revision<1)return json({error:'Producto inválido.'},400);
   if(a.type==='update'){
    const p=validateProduct(a);result=await db.prepare('UPDATE products SET name=?,category=?,price=?,days=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING id').bind(p.name,p.category,p.price,JSON.stringify(p.days),Date.now(),a.id,a.revision).first();
   }else result=await db.prepare('UPDATE products SET active=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING id').bind(a.type==='restore'?1:0,Date.now(),a.id,a.revision).first();
   if(!result)return json({error:'El producto cambió en otra sesión. Actualiza la lista y vuelve a editar.',...await readCatalog(true)},409);
  }
  return json(await readCatalog(true));
 }catch(e){return json({error:e instanceof Error&&/^(El nombre|Selecciona|Ingresa|Elige|Revisa)/.test(e.message)?e.message:'No se pudo guardar. Revisa la conexión e intenta nuevamente.'},e instanceof Error&&/^(El nombre|Selecciona|Ingresa|Elige|Revisa)/.test(e.message)?400:503);}
}
