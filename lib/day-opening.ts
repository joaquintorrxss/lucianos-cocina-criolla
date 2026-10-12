import type {Day} from './model.ts';
import type {Inventory} from './inventory.ts';

// Closed jornadas may share a date. Only one active jornada is allowed.
// Both writes run in one D1 batch; the operation marker also guards retries.
export function openingWrites(day:Day,inventory:Inventory,quantities:Inventory['quantities'],catalogVersion:number,opId:string){
 return [
  {sql:'UPDATE inventory SET quantities=?,revision=revision+1,last_op=? WHERE id=1 AND revision=? AND EXISTS (SELECT 1 FROM catalog_meta WHERE id=1 AND revision=?) AND NOT EXISTS (SELECT 1 FROM days WHERE active=1 OR opening_op_id=?)',args:[JSON.stringify(quantities),opId,inventory.revision,catalogVersion,opId]},
  {sql:'INSERT INTO days (id,date,active,revision,payload,opening_op_id) SELECT ?,?,1,1,?,? WHERE EXISTS (SELECT 1 FROM inventory WHERE id=1 AND revision=? AND last_op=?) AND NOT EXISTS (SELECT 1 FROM days WHERE active=1 OR opening_op_id=?)',args:[day.id,day.date,JSON.stringify(day),opId,inventory.revision+1,opId,opId]},
 ];
}
