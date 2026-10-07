export function emailAddress(value:unknown):string|null{
 if(value===null||value==='')return null;
 if(typeof value!=='string')throw new Error('Ingresa un correo válido.');
 const email=value.trim().toLowerCase();
 if(email.length>254||! /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email))throw new Error('Ingresa un correo válido.');
 return email;
}
export function accountInput(a:Record<string,unknown>){
 if(typeof a.username!=='string'||! /^[a-z0-9._@+\-]{3,120}$/i.test(a.username.trim()))throw new Error('El usuario debe tener entre 3 y 120 caracteres, sin espacios.');
 if(a.role!=='admin'&&a.role!=='operator')throw new Error('Selecciona un rol válido.');
 return {username:a.username.trim().toLowerCase(),role:a.role,email:emailAddress(a.email)};
}
export function validateNewPassword(value:unknown,confirmation:unknown):string{
 if(typeof value!=='string'||value.length<8||value.length>256)throw new Error('La contraseña debe tener entre 8 y 256 caracteres.');
 if(value!==confirmation)throw new Error('Las contraseñas no coinciden.');return value;
}
