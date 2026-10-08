import type {Line,Day} from './model.ts';
import {dayCatalog} from './model.ts';
export function automaticTapers(lines:Line[],day:Day,takeaway:boolean,manual:boolean):Line[]{
 if(manual)return lines;
 const taper=dayCatalog(day).find(p=>p.id==='taper'||p.category==='Adicionales'&&/t[aá]per/i.test(p.name));
 if(!taper)return lines;
 const existing=lines.filter(l=>l.productId===taper.id),others=lines.filter(l=>l.productId!==taper.id);
 const qty=takeaway?others.filter(l=>l.category==='Platos').reduce((n,l)=>n+l.qty,0):0;
 // Served/paid lines are protected by the order model; never silently erase delivery.
 const served=existing.reduce((n,l)=>n+l.served,0);
 if(qty<served)return lines;
 if(!qty)return others;
 const result:Line[]=[];let left=qty,reserved=served;
 for(const line of existing){reserved-=line.served;const count=Math.max(line.served,Math.min(left-reserved,1000));if(count>0)result.push({...line,qty:count});left-=count;}
 while(left>0){const count=Math.min(left,1000);result.push({id:crypto.randomUUID(),productId:taper.id,name:taper.name,category:taper.category,price:day.prices[taper.id],served:0,notes:'',qty:count});left-=count;}
 return [...others,...result];
}
