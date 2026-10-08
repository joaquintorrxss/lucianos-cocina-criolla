CREATE INDEX `idx_inventory_op` ON `inventory_movements` (`op_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_at` ON `inventory_movements` (`at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_product_at` ON `inventory_movements` (`product_id`,`at`,`id`);