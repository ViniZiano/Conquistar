ALTER TABLE `audit_logs` ADD `actor_role` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `summary` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_audit_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_user` ON `audit_logs` (`user_id`);