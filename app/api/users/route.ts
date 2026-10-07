import {getCurrentUser} from '@/app/auth';
import {database} from '@/db/raw';
import {hashPassword,verifyPassword} from '@/lib/password';
import {safeAuthOrigin} from '@/lib/auth-http';
import {accountInput,validateNewPassword} from '@/lib/accounts';
import {accountJSON as json,AccountError,accountFailure,boundedJSON,limitAccountAction} from '@/lib/account-http';
export const dynamic='force-dynamic';
async function users(){const result=await database().prepare('SELECT id,username,role,email,email_verified_at AS emailVerifiedAt,active,revision,created_at AS createdAt FROM auth_users ORDER BY active DESC,username').all();return result.results;}
export async function GET(){try{const user=await getCurrentUser();if(!user)return json({error:'Inicia sesión.'},401);if(user.role!=='admin')return json({error:'Solo el administrador puede gestionar usuarios.'},403);return json({users:await users(),selfId:user.id});}catch(e){return accountFailure(e);}}
export async function POST(req:Request){try{
 const user=await getCurrentUser();if(!user)return json({error:'Inicia sesión.'},401);if(user.role!=='admin')return json({error:'Solo el administrador puede gestionar usuarios.'},403);
 if(!safeAuthOrigin(req))return json({error:'Origen no permitido.'},403);
 const a=await boundedJSON(req);if(!['create','update','status','password'].includes(a.type))throw new AccountError('Operación inválida.');
 await limitAccountAction(user.id+':users',30);
 const db=database();const admin=await db.prepare("SELECT password_hash,auth_version FROM auth_users WHERE id=? AND active=1 AND role='admin'").bind(user.id).first<{password_hash:string;auth_version:number}>();
 if(!admin||typeof a.adminPassword!=='string'||a.adminPassword.length>256||!await verifyPassword(a.adminPassword,admin.password_hash))throw new AccountError('La contraseña del administrador es incorrecta.',401);
 const guard="EXISTS (SELECT 1 FROM auth_users actor WHERE actor.id=? AND actor.auth_version=? AND actor.role='admin' AND actor.active=1)";
 let command;
 if(a.type==='create'){
  const p=accountInput(a),hash=await hashPassword(validateNewPassword(a.password,a.confirmation));
  if(typeof a.id!=='string'||! /^[a-f0-9-]{36}$/.test(a.id))throw new AccountError('Usuario inválido.');
  command=db.prepare(`INSERT INTO auth_users (id,username,password_hash,active,created_at,role,email) SELECT ?,?,?,1,?,?,? WHERE ${guard} ON CONFLICT(id) DO NOTHING RETURNING id`).bind(a.id,p.username,hash,Date.now(),p.role,p.email,user.id,admin.auth_version);
 }else{
  if(typeof a.id!=='string'||a.id.length>100||!Number.isSafeInteger(a.revision)||a.revision<1)throw new AccountError('Usuario inválido.');
  if(a.id===user.id)throw new AccountError('Gestiona tu propia contraseña y correo desde «Mi cuenta». No puedes desactivar ni cambiar el rol de tu propia cuenta.');
  const lastAdmin="(role<>'admin' OR active<>1 OR EXISTS (SELECT 1 FROM auth_users other WHERE other.role='admin' AND other.active=1 AND other.id<>auth_users.id))";
  if(a.type==='update'){
   const p=accountInput(a);
   command=db.prepare(`UPDATE auth_users SET username=?,role=?,email=?,email_verified_at=CASE WHEN email IS ? THEN email_verified_at ELSE NULL END,auth_version=auth_version+1,revision=revision+1 WHERE id=? AND revision=? AND ${guard} AND (?='admin' OR ${lastAdmin}) RETURNING id`).bind(p.username,p.role,p.email,p.email,a.id,a.revision,user.id,admin.auth_version,p.role);
  }else if(a.type==='status'){
   if(typeof a.active!=='boolean')throw new AccountError('Estado inválido.');
   command=db.prepare(`UPDATE auth_users SET active=?,auth_version=auth_version+1,revision=revision+1 WHERE id=? AND revision=? AND ${guard} AND (?=1 OR ${lastAdmin}) RETURNING id`).bind(a.active?1:0,a.id,a.revision,user.id,admin.auth_version,a.active?1:0);
  }else{
   const hash=await hashPassword(validateNewPassword(a.password,a.confirmation));
   command=db.prepare(`UPDATE auth_users SET password_hash=?,auth_version=auth_version+1,revision=revision+1 WHERE id=? AND revision=? AND ${guard} RETURNING id`).bind(hash,a.id,a.revision,user.id,admin.auth_version);
  }
 }
 try{const result=await command.first();if(!result)throw new AccountError('La cuenta cambió o no se puede quitar al último administrador. Actualiza la lista y vuelve a intentar.',409);}
 catch(e){if(e instanceof Error&&e.message.includes('UNIQUE constraint failed: auth_users.username'))throw new AccountError('Ese nombre de usuario ya existe.',409);throw e;}
 return json({ok:true,users:await users(),selfId:user.id});
}catch(e){return accountFailure(e);}}
