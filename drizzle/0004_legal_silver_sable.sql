CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`quantities` text NOT NULL,
	`last_op` text
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`op_id` text NOT NULL,
	`product_id` text NOT NULL,
	`delta` integer NOT NULL,
	`remaining` integer NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`day_id` text,
	`at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `products` ADD `stock_source_id` text;--> statement-breakpoint
ALTER TABLE `products` ADD `persistent_stock` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE products SET persistent_stock=1 WHERE id IN ('coca-litro','inca-litro','coca-personal','inca-personal','inca-gordita');
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at,stock_source_id,persistent_stock)
SELECT 'pepian-pato','Pepián con pato','Platos',3000,'["Domingo"]',1,1,0,'pato',0
WHERE NOT EXISTS (SELECT 1 FROM products WHERE lower(name)=lower('Pepián con pato'));
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at,stock_source_id,persistent_stock)
SELECT 'pepian-cabrito','Pepián con cabrito','Platos',3000,'["Domingo"]',1,1,0,'cabrito',0
WHERE NOT EXISTS (SELECT 1 FROM products WHERE lower(name)=lower('Pepián con cabrito'));
--> statement-breakpoint
UPDATE products SET stock_source_id='pato' WHERE lower(name)=lower('Pepián con pato');
--> statement-breakpoint
UPDATE products SET stock_source_id='cabrito' WHERE lower(name)=lower('Pepián con cabrito');
--> statement-breakpoint
INSERT INTO inventory (id,revision,quantities)
SELECT 1,1,json_object(
 'coca-litro',json_extract(payload,'$.stock."coca-litro"'),
 'inca-litro',json_extract(payload,'$.stock."inca-litro"'),
 'coca-personal',json_extract(payload,'$.stock."coca-personal"'),
 'inca-personal',json_extract(payload,'$.stock."inca-personal"'),
 'inca-gordita',json_extract(payload,'$.stock."inca-gordita"'))
FROM (SELECT (SELECT payload FROM days ORDER BY active DESC,date DESC LIMIT 1) AS payload);
--> statement-breakpoint
INSERT INTO inventory_movements (id,op_id,product_id,delta,remaining,reason,actor,at)
SELECT 'inicio-'||key,'migration-inventory',key,value,value,'Saldo conservado de la última jornada','Sistema',strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM inventory,json_each(inventory.quantities) WHERE json_each.type='integer';
