import {env} from 'cloudflare:workers';
export function emailConfiguration(){
 const config=env as unknown as Record<string,string|undefined>;
 const origin=config.APP_URL;
 return {enabled:!!(config.RESEND_API_KEY&&config.EMAIL_FROM&&origin?.startsWith('https://')),config};
}
export async function sendAccountEmail(to:string,token:string,purpose:'verify'|'reset'){
 const {enabled,config}=emailConfiguration();if(!enabled)throw new Error('Email is not configured');
 const link=new URL('/acceso',config.APP_URL);link.hash=new URLSearchParams({token,type:purpose}).toString();
 const label=purpose==='verify'?'Verifica tu correo en Lucianos':'Restablece tu contraseña de Lucianos';
 const text=`${label}\n\nAbre este enlace:\n${link.toString()}\n\nEl enlace vence en 30 minutos y solo puede utilizarse una vez. Si no solicitaste este mensaje, ignóralo.`;
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.EMAIL_FROM,to:[to],subject:label,text}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Email delivery failed');
}
