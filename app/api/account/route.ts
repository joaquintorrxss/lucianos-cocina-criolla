import {getCurrentUser} from '@/app/auth';
import {database} from '@/db/raw';
import {hashPassword,verifyPassword} from '@/lib/password';
import {safeAuthOrigin,sessionCookie} from '@/lib/auth-http';
import {emailAddress,validateNewPassword} from '@/lib/accounts';
import {emailConfiguration} from '@/lib/account-email';
import {accountJSON as json,AccountError,accountFailure,boundedJSON,limitAccountAction} from '@/lib/account-http';
export const dynamic='force-dynamic';
export async function GET(){try{
 const user=await getCurrentUser();if(!user)return json({error:'Inicia sesión.'},401);
 const row=await database().prepare('SELECT id,username,role,email,email_verified_at AS emailVerifiedAt,revision FROM auth_users WHERE id=?').bind(user.id).first();
 return json({user:row,emailEnabled:emailConfiguration().enabled});
}catch(e){return accountFailure(e);}}
export async function POST(req:Request){try{
 const user=await getCurrentUser();if(!user)return json({error:'Inicia sesión.'},401);
 if(!safeAuthOrigin(req))return json({error:'Origen no permitido.'},403);
 const a=await boundedJSON(req);if(!['password','email'].includes(a.type))throw new AccountError('Operación inválida.');
 await limitAccountAction(user.id+':change');
 const db=database();const row=await db.prepare('SELECT password_hash,revision FROM auth_users WHERE id=? AND active=1').bind(user.id).first<{password_hash:string;revision:number}>();
 if(!row||typeof a.currentPassword!=='string'||a.currentPassword.length>256||!await verifyPassword(a.currentPassword,row.password_hash))throw new AccountError('La contraseña actual es incorrecta.',401);
 if(a.type==='password'){
  const password=validateNewPassword(a.password,a.confirmation);const hash=await hashPassword(password);
  const result=await db.batch([
   db.prepare('UPDATE auth_users SET password_hash=?,auth_version=auth_version+1,revision=revision+1 WHERE id=? AND password_hash=? AND active=1 RETURNING id').bind(hash,user.id,row.password_hash),
   db.prepare('DELETE FROM auth_sessions WHERE user_id=? AND auth_version<>(SELECT auth_version FROM auth_users WHERE id=?)').bind(user.id,user.id),
  ]);
  if(!result[0].results.length)throw new AccountError('La cuenta cambió. Vuelve a iniciar sesión.',409);
  return Response.json({ok:true,reauthenticate:true,message:'Contraseña actualizada. Inicia sesión con la nueva contraseña.'},{headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie('',req.url,true)}});
 }
 if(a.revision!==row.revision)throw new AccountError('La cuenta cambió en otra sesión. Actualiza y vuelve a editar.',409);
 const email=emailAddress(a.email);
 const result=await db.batch([
  db.prepare('UPDATE auth_users SET email=?,email_verified_at=CASE WHEN email IS ? THEN email_verified_at ELSE NULL END,revision=revision+1 WHERE id=? AND revision=? AND password_hash=? AND active=1 RETURNING id').bind(email,email,user.id,a.revision,row.password_hash),
  db.prepare('DELETE FROM auth_tokens WHERE user_id=? AND email IS NOT (SELECT email FROM auth_users WHERE id=?)').bind(user.id,user.id),
 ]);
 if(!result[0].results.length)throw new AccountError('La cuenta cambió. Actualiza y vuelve a editar.',409);
 return json({ok:true,message:'Correo guardado. La verificación se completa desde el mensaje enviado a ese correo.'});
}catch(e){return accountFailure(e);}}
