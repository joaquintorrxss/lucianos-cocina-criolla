-- Custom SQL migration file, put your code below! --
-- Prefer the owner's existing dishes, including names without accents.
UPDATE products SET stock_source_id='pato',price=3000,revision=revision+1,updated_at=unixepoch()*1000
WHERE active=1 AND replace(replace(lower(trim(name)),'á','a'),'Á','a')='pepian con pato';
--> statement-breakpoint
UPDATE products SET stock_source_id='cabrito',price=3000,revision=revision+1,updated_at=unixepoch()*1000
WHERE active=1 AND replace(replace(lower(trim(name)),'á','a'),'Á','a')='pepian con cabrito';
--> statement-breakpoint
UPDATE products SET active=0,revision=revision+1,updated_at=unixepoch()*1000
WHERE id='pepian-pato' AND EXISTS (
 SELECT 1 FROM products p WHERE p.id<>'pepian-pato' AND p.active=1
 AND replace(replace(lower(trim(p.name)),'á','a'),'Á','a')='pepian con pato');
--> statement-breakpoint
UPDATE products SET active=0,revision=revision+1,updated_at=unixepoch()*1000
WHERE id='pepian-cabrito' AND EXISTS (
 SELECT 1 FROM products p WHERE p.id<>'pepian-cabrito' AND p.active=1
 AND replace(replace(lower(trim(p.name)),'á','a'),'Á','a')='pepian con cabrito');
