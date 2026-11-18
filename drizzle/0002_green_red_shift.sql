CREATE TABLE `presented_exams` (
	`id` text PRIMARY KEY NOT NULL,
	`encounter_id` text NOT NULL,
	`exam_name` text NOT NULL,
	`performed_at` text DEFAULT '' NOT NULL,
	`laboratory` text DEFAULT '' NOT NULL,
	`result_summary` text DEFAULT '' NOT NULL,
	`medical_notes` text DEFAULT '' NOT NULL,
	`attachment_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_presented_exams_encounter` ON `presented_exams` (`encounter_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`doctor_id` text,
	`created_by_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`type` text NOT NULL,
	`scope` text DEFAULT 'doctor' NOT NULL,
	`all_day` integer DEFAULT false NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_appointments`("id", "doctor_id", "created_by_user_id", "title", "description", "starts_at", "ends_at", "type", "scope", "all_day", "reason", "notes", "status", "created_at", "updated_at") SELECT "id", "doctor_id", "created_by_user_id", "title", "description", "starts_at", "ends_at", "type", 'doctor', 0, '', "notes", "status", "created_at", "updated_at" FROM `appointments`;--> statement-breakpoint
DROP TABLE `appointments`;--> statement-breakpoint
ALTER TABLE `__new_appointments` RENAME TO `appointments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_appointments_doctor_start` ON `appointments` (`doctor_id`,`starts_at`);--> statement-breakpoint
ALTER TABLE `encounters` ADD `consultation_type` text DEFAULT 'Consulta' NOT NULL;--> statement-breakpoint
ALTER TABLE `encounters` ADD `doctor_specialty` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `encounters` ADD `relevant_history` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `encounters` ADD `allergies` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `encounters` ADD `diagnostic_hypothesis` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `encounters` ADD `diagnosis_notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `encounters` ADD `patient_guidance` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exam_requests` ADD `category` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exam_requests` ADD `priority` text DEFAULT 'Rotina' NOT NULL;--> statement-breakpoint
ALTER TABLE `prescription_medications` ADD `administration_route` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_key` text;--> statement-breakpoint
ALTER TABLE `users` ADD `theme` text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_appointments` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_system` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `last_seen_at` text;
