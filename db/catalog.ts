import {database} from './raw';
import type {ManagedProduct} from '@/lib/catalog-model';
type Row={id:string;name:string;category:ManagedProduct['category'];price:number;days:string;active:number;revision:number;stock_source_id:string|null;persistent_stock:number};
export async function readCatalog(includeArchived=false){
 const db=database();
 // Batch reads share a D1 transaction, keeping the version and products aligned.
 const results=await db.batch([
  db.prepare('SELECT revision FROM catalog_meta WHERE id=1'),
  db.prepare('SELECT id,name,category,price,days,active,revision,stock_source_id,persistent_stock FROM products '+(includeArchived?'':'WHERE active=1 ')+"ORDER BY CASE category WHEN 'Platos' THEN 1 WHEN 'Bebidas' THEN 2 ELSE 3 END,name COLLATE NOCASE"),
 ]);
 return {catalogVersion:Number((results[0].results[0] as {revision:number}).revision),catalog:(results[1].results as unknown as Row[]).map(({stock_source_id,persistent_stock,...p})=>({...p,stockSourceId:stock_source_id,persistentStock:persistent_stock===1,days:JSON.parse(p.days) as string[],active:p.active===1}))};
}
