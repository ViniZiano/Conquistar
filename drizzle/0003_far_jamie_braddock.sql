CREATE TABLE `governance_controls` (
	`key` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`responsible` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`evidence_reference` text DEFAULT '' NOT NULL,
	`reviewed_at` text,
	`updated_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `encounters` ADD `diagnosis_code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `encounters` ADD `diagnosis_description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `presented_exams` ADD `attachment_name` text;--> statement-breakpoint
ALTER TABLE `presented_exams` ADD `attachment_type` text;--> statement-breakpoint
ALTER TABLE `presented_exams` ADD `attachment_size` integer;--> statement-breakpoint
ALTER TABLE `presented_exams` ADD `attachment_sha256` text;--> statement-breakpoint
ALTER TABLE `presented_exams` ADD `attachment_scan_status` text;--> statement-breakpoint
ALTER TABLE `presented_exams` ADD `attachment_created_at` text;--> statement-breakpoint
ALTER TABLE `presented_exams` ADD `attachment_uploaded_by_user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` text;