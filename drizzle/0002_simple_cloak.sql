CREATE TABLE `catalog_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`days` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `auth_users` ADD `role` text DEFAULT 'operator' NOT NULL;
--> statement-breakpoint
INSERT INTO catalog_meta (id,revision) VALUES (1,1);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('patita','Patita en fiambre','Platos',1800,'["Domingo","Lunes","Jueves"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('pato','Pato guisado','Platos',3000,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('cabrito','Cabrito','Platos',3000,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('cuy','Cuy frito','Platos',3000,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('lomo','Lomo saltado','Platos',2800,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('aji','Ají de gallina','Platos',1500,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('bisteck','Bisteck a lo pobre','Platos',2800,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('verdes-churrasco','Tallarines verdes con churrasco','Platos',1800,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('verdes-pollo','Tallarines verdes con pollo a la plancha','Platos',1800,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('pollo','Pollo a la plancha','Platos',2200,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('pepian','Pepián de gallina','Platos',1800,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('churrasco','Churrasco','Platos',2200,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('shambar','Shámbar','Platos',1800,'["Lunes"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('patasquita','Patasquita','Platos',1800,'["Jueves"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('coca-litro','Coca-Cola · 1 litro','Bebidas',700,'["Domingo","Lunes","Jueves"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('inca-litro','Inca Kola · 1 litro','Bebidas',700,'["Domingo","Lunes","Jueves"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('coca-personal','Coca-Cola · personal','Bebidas',300,'["Domingo","Lunes","Jueves"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('inca-personal','Inca Kola · personal','Bebidas',300,'["Domingo","Lunes","Jueves"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('inca-gordita','Inca Kola · gordita','Bebidas',500,'["Domingo","Lunes","Jueves"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('maracuya','Maracuyá · jarra de 1 litro','Bebidas',1400,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('limonada','Limonada · jarra de 1 litro','Bebidas',1200,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('chicha','Chicha morada · jarra','Bebidas',1400,'["Domingo"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('trujillo','Cerveza Trujillo','Bebidas',1000,'["Domingo","Lunes","Jueves"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('cusquena','Cusqueña negra','Bebidas',1200,'["Domingo","Lunes","Jueves"]',1,1,0);
--> statement-breakpoint
INSERT INTO products (id,name,category,price,days,active,revision,updated_at) VALUES ('taper','Táper','Adicionales',200,'["Domingo","Lunes","Jueves"]',1,1,0);
--> statement-breakpoint
CREATE TRIGGER catalog_insert AFTER INSERT ON products BEGIN UPDATE catalog_meta SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER catalog_update AFTER UPDATE ON products BEGIN UPDATE catalog_meta SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER catalog_delete AFTER DELETE ON products BEGIN UPDATE catalog_meta SET revision=revision+1 WHERE id=1; END;
