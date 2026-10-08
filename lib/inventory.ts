import {dayCatalog,syncStock,type Day,type Product} from './model.ts';
export type Inventory={revision:number;quantities:Record<string,number|null>};
const legacySodas=new Set(['coca-litro','inca-litro','coca-personal','inca-personal','inca-gordita']);
export function currentStock(day:Day,inventory:Inventory):Day {
 if(day.closed)return day;
 const d=structuredClone(day);
 d.catalog=dayCatalog(d).map(p=>({...p,persistentStock:p.persistentStock??legacySodas.has(p.id)}));
 for(const p of d.catalog)if(p.persistentStock)d.stock[p.id]=inventory.quantities[p.id]??null;
 syncStock(d);return d;
}
export function openingStock(products:Product[],menu:string,input:Record<string,number|null>,inventory:Inventory){
 const stock={...input},quantities={...inventory.quantities};
 for(const p of products.filter(p=>p.days.includes(menu)&&p.persistentStock)){
  const existing=quantities[p.id];
  if(existing===null||existing===undefined){
   const qty=stock[p.id];if(!Number.isSafeInteger(qty)||qty===null||qty<0||qty>100000)throw new Error('Registra la cantidad inicial de '+p.name+' en Bebidas inventario o al abrir la jornada.');
   quantities[p.id]=qty;
  }
  stock[p.id]=quantities[p.id];
 }
 return {stock,quantities};
}
export function inventoryAfter(day:Day,inventory:Inventory){
 const quantities={...inventory.quantities};
 for(const p of dayCatalog(day))if(p.persistentStock)quantities[p.id]=day.stock[p.id];
 return quantities;
}
export const inventoryChanges=(before:Inventory['quantities'],after:Inventory['quantities'])=>Object.entries(after).filter(([id,qty])=>qty!==null&&qty!==before[id]).map(([productId,qty])=>({productId,delta:qty!-(before[productId]??0),remaining:qty!}));

// D1 batch is atomic. The first write guards BOTH revisions; the following
// write requires its unique marker. A stale order cannot reserve stock alone.
export function dayInventoryWrites(originalRevision:number,day:Day,inventory:Inventory,opId:string){
 return [
  {sql:'UPDATE inventory SET quantities=?,revision=revision+1,last_op=? WHERE id=1 AND revision=? AND EXISTS (SELECT 1 FROM days WHERE id=? AND revision=? AND active=1)',args:[JSON.stringify(inventoryAfter(day,inventory)),opId,inventory.revision,day.id,originalRevision]},
  {sql:'UPDATE days SET payload=?,revision=revision+1,active=? WHERE id=? AND revision=? AND EXISTS (SELECT 1 FROM inventory WHERE id=1 AND revision=? AND last_op=?)',args:[JSON.stringify(day),day.closed?null:1,day.id,originalRevision,inventory.revision+1,opId]},
 ];
}
