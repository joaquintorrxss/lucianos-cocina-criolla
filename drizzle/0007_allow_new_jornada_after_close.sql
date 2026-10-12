DROP INDEX `days_date_unique`;--> statement-breakpoint
ALTER TABLE `days` ADD `opening_op_id` text;--> statement-breakpoint
CREATE INDEX `idx_days_date` ON `days` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_days_opening_op` ON `days` (`opening_op_id`);