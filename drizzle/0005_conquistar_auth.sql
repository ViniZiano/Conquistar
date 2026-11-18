ALTER TABLE `users` ADD `username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password_updated_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `must_change_password` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_users_username_normalized` ON `users` (lower(`username`)) WHERE `username` IS NOT NULL;--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`user_agent_hash` text DEFAULT '' NOT NULL,
	`ip_hash` text DEFAULT '' NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	`revocation_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_hash_unique` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_user` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_expiry` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `auth_login_attempts` (
	`attempt_key` text PRIMARY KEY NOT NULL,
	`identifier_hash` text NOT NULL,
	`ip_hash` text NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`window_started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`locked_until` text,
	`last_attempt_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_login_attempts_locked` ON `auth_login_attempts` (`locked_until`);--> statement-breakpoint
PRAGMA optimize;
