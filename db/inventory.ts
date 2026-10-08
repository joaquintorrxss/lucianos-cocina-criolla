import {database} from './raw';
import {inventoryChanges,type Inventory} from '@/lib/inventory';
export async function readInventory():Promise<Inventory>{const row=await database().prepare('SELECT revision,quantities FROM inventory WHERE id=1').first<{revision:number;quantities:string}>();if(!row)throw new Error('El inventario no está disponible.');return {revision:row.revision,quantities:JSON.parse(row.quantities)};}
export function movementWrites(before:Inventory,quantities:Inventory['quantities'],opId:string,actor:string,reason:string,dayId:string|null){
 const db=database(),at=new Date().toISOString();
 return inventoryChanges(before.quantities,quantities).map(m=>db.prepare('INSERT OR IGNORE INTO inventory_movements (id,op_id,product_id,delta,remaining,reason,actor,day_id,at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM inventory WHERE id=1 AND revision=? AND last_op=?)').bind(opId+':'+m.productId,opId,m.productId,m.delta,m.remaining,reason,actor,dayId,at,before.revision+1,opId));
}
