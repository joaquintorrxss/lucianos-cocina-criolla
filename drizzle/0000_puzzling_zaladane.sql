CREATE TABLE `days` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`active` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `days_date_unique` ON `days` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_days_active` ON `days` (`active`);