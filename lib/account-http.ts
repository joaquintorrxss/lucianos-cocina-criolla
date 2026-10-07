import {database} from '@/db/raw';
import {tokenHash} from '@/lib/password';
export const accountJSON=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export class AccountError extends Error{constructor(message:string,public status=400){super(message);}}
export async function boundedJSON(req:Request):Promise<any>{
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new AccountError('Solicitud inválida.');
 const reader=req.body?.getReader();if(!reader)throw new AccountError('Solicitud inválida.');
 const chunks:Uint8Array[]=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel().catch(()=>undefined);throw new AccountError('El formulario es demasiado grande.',413);}chunks.push(value);}
 const buffer=new Uint8Array(length);let n=0;for(const chunk of chunks){buffer.set(chunk,n);n+=chunk.length;}
 try{const result=JSON.parse(new TextDecoder().decode(buffer));if(!result||typeof result!=='object'||Array.isArray(result))throw new Error();return result;}catch{throw new AccountError('Solicitud inválida.');}
}
export async function limitAccountAction(key:string,max=8,window=900000){
 const now=Date.now(),start=now-window;
 const row=await database().prepare(`INSERT INTO auth_attempts (key,window_start,attempts) VALUES (?,?,1)
 ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<=? THEN 1 ELSE attempts+1 END,
 window_start=CASE WHEN window_start<=? THEN excluded.window_start ELSE window_start END
 WHERE window_start<=? OR attempts<? RETURNING attempts`).bind(tokenHash('account:'+key),now,start,start,start,max).first();
 if(!row)throw new AccountError('Demasiados intentos. Espera unos minutos antes de repetir.',429);
}
export function accountFailure(error:unknown){
 if(error instanceof AccountError)return accountJSON({error:error.message},error.status);
 const message=error instanceof Error?error.message:'';
 if(/^(Ingresa|El usuario|Selecciona un rol|La contraseña|Las contraseñas)/.test(message))return accountJSON({error:message},400);
 return accountJSON({error:'No se pudo completar la operación. Intenta nuevamente.'},503);
}
