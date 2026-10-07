import {getCurrentUser} from '@/app/auth';
import {database} from '@/db/raw';
import {createSessionToken,normalizeUsername,tokenHash,hashPassword} from '@/lib/password';
import {safeAuthOrigin,sessionCookie} from '@/lib/auth-http';
import {validateNewPassword} from '@/lib/accounts';
import {emailConfiguration,sendAccountEmail} from '@/lib/account-email';
import {accountJSON as json,AccountError,accountFailure,boundedJSON,limitAccountAction} from '@/lib/account-http';
export const dynamic='force-dynamic';
export async function GET(){return json({emailEnabled:emailConfiguration().enabled});}
export async function POST(req:Request){try{
 if(!safeAuthOrigin(req))return json({error:'Origen no permitido.'},403);
 const a=await boundedJSON(req);const db=database();const now=Date.now();
 const ip=req.headers.get('cf-connecting-ip')??'local';
 if(a.type==='confirm'||a.type==='reset'){
  await limitAccountAction(ip+':token',20);
  if(typeof a.token!=='string'||! /^[a-f0-9]{64}$/.test(a.token))throw new AccountError('El enlace es inválido o ha vencido.');
  const hashed=tokenHash(a.token),purpose=a.type==='confirm'?'verify':'reset';
  const valid=`EXISTS (SELECT 1 FROM auth_tokens t WHERE t.token_hash=? AND t.user_id=auth_users.id AND t.purpose=? AND t.email=auth_users.email AND t.auth_version=auth_users.auth_version AND t.expires_at>? AND t.consumed_at IS NULL)`;
  const hash=a.type==='reset'?await hashPassword(validateNewPassword(a.password,a.confirmation)):null;
  const command=hash?db.prepare(`UPDATE auth_users SET password_hash=?,auth_version=auth_version+1,revision=revision+1 WHERE active=1 AND email_verified_at IS NOT NULL AND ${valid} RETURNING id`).bind(hash,hashed,purpose,now):db.prepare(`UPDATE auth_users SET email_verified_at=?,revision=revision+1 WHERE active=1 AND ${valid} RETURNING id`).bind(now,hashed,purpose,now);
  const results=await db.batch([command,db.prepare(`UPDATE auth_tokens SET consumed_at=? WHERE token_hash=? AND purpose=? AND expires_at>? AND consumed_at IS NULL AND EXISTS (SELECT 1 FROM auth_users u WHERE u.id=auth_tokens.user_id AND u.email=auth_tokens.email AND u.active=1 AND ${hash?'u.auth_version=auth_tokens.auth_version+1 AND u.password_hash=?':'u.email_verified_at=? AND u.auth_version=auth_tokens.auth_version'})`).bind(now,hashed,purpose,now,hash??now)]);
  if(!results[0].results.length)throw new AccountError('El enlace es inválido, ya fue utilizado o ha vencido.');
  if(hash)return Response.json({ok:true,message:'Contraseña restablecida. Inicia sesión con la nueva contraseña.'},{headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie('',req.url,true)}});
  return json({ok:true,message:'Correo verificado. Ya puedes usarlo para recuperar el acceso.'});
 }
 if(!['request','forgot'].includes(a.type))throw new AccountError('Operación inválida.');
 // Do not claim an email was sent when no provider has been configured.
 if(!emailConfiguration().enabled)throw new AccountError('El envío de correos todavía no está configurado. Puedes cambiar tu contraseña en «Mi cuenta» o pedir al administrador que la restablezca.',503);
 await limitAccountAction(ip+':email',10);
 let userId:string|undefined;
 if(a.type==='request'){const user=await getCurrentUser();if(!user)return json({error:'Inicia sesión.'},401);userId=user.id;}
 else if(typeof a.username!=='string'||a.username.length>120)throw new AccountError('Ingresa el usuario de Lucianos.');
 const row=await db.prepare('SELECT id,email,email_verified_at,auth_version FROM auth_users WHERE active=1 AND '+(userId?'id=?':'username=?')).bind(userId??normalizeUsername(a.username)).first<{id:string;email:string|null;email_verified_at:number|null;auth_version:number}>();
 const generic={ok:true,message:'Si el usuario tiene un correo verificado, recibirá un enlace para recuperar el acceso.'};
 if(!row||!row.email||a.type==='forgot'&&!row.email_verified_at){if(a.type==='forgot')return json(generic);throw new AccountError('Guarda un correo real en «Mi cuenta» antes de verificarlo.');}
 if(a.type==='request'&&row.email_verified_at)return json({ok:true,message:'Tu correo ya está verificado.'});
 try{await limitAccountAction(row.id+':email',1,60000);}catch(e){if(a.type==='forgot'&&e instanceof AccountError&&e.status===429)return json(generic);throw e;}
 const token=createSessionToken(),hash=tokenHash(token),purpose=a.type==='request'?'verify':'reset';
 await db.prepare('DELETE FROM auth_tokens WHERE expires_at<=? OR consumed_at IS NOT NULL').bind(now).run();
 await db.prepare('INSERT INTO auth_tokens (token_hash,user_id,purpose,email,auth_version,expires_at,created_at) VALUES (?,?,?,?,?,?,?)').bind(hash,row.id,purpose,row.email,row.auth_version,now+1800000,now).run();
 try{await sendAccountEmail(row.email,token,purpose);}catch{await db.prepare('DELETE FROM auth_tokens WHERE token_hash=?').bind(hash).run();if(a.type==='forgot')return json(generic);throw new AccountError('El servicio de correo no pudo enviar el mensaje. Intenta más tarde.',503);}
 return json(a.type==='forgot'?generic:{ok:true,message:'Mensaje enviado. Abre el enlace recibido en tu correo para verificarlo.'});
}catch(e){return accountFailure(e);}}
