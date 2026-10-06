import type {Product} from './model';
export type ManagedProduct=Product & {active:boolean;revision:number};
export const serviceDays=['Domingo','Lunes','Jueves'];
export const categories=['Platos','Bebidas','Adicionales'];
export function validateProduct(input:unknown):Product {
 if(!input||typeof input!=='object')throw new Error('Revisa los datos del producto.');
 const a=input as Record<string,unknown>;
 if(typeof a.name!=='string'||a.name.trim().length<2||a.name.trim().length>100)throw new Error('El nombre debe tener entre 2 y 100 caracteres.');
 if(typeof a.category!=='string'||!categories.includes(a.category))throw new Error('Selecciona una categoría válida.');
 if(typeof a.price!=='number'||!Number.isSafeInteger(a.price)||a.price<0||a.price>10000000)throw new Error('Ingresa un precio válido, hasta S/ 100,000.');
 if(!Array.isArray(a.days)||!a.days.length||a.days.length>3||a.days.some(d=>typeof d!=='string'||!serviceDays.includes(d))||new Set(a.days).size!==a.days.length)throw new Error('Elige al menos un día de atención.');
 return {id:'',name:a.name.trim(),category:a.category as Product['category'],price:a.price,days:serviceDays.filter(d=>(a.days as string[]).includes(d))};
}
