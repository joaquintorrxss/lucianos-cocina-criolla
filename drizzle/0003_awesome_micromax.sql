CREATE TABLE `auth_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`email` text NOT NULL,
	`auth_version` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD `auth_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `auth_users` ADD `email` text;--> statement-breakpoint
ALTER TABLE `auth_users` ADD `email_verified_at` integer;--> statement-breakpoint
ALTER TABLE `auth_users` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `auth_users` ADD `auth_version` integer DEFAULT 1 NOT NULL;