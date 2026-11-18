CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`doctor_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`type` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_appointments_doctor_start` ON `appointments` (`doctor_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_created` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`crm` text NOT NULL,
	`specialty` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doctors_user_id_unique` ON `doctors` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `doctors_crm_unique` ON `doctors` (`crm`);--> statement-breakpoint
CREATE INDEX `idx_doctors_name` ON `doctors` (`name`);--> statement-breakpoint
CREATE TABLE `encounters` (
	`id` text PRIMARY KEY NOT NULL,
	`medical_record_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`author_user_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`chief_complaint` text DEFAULT '' NOT NULL,
	`problem_history` text DEFAULT '' NOT NULL,
	`symptoms` text DEFAULT '' NOT NULL,
	`clinical_notes` text DEFAULT '' NOT NULL,
	`evolution` text DEFAULT '' NOT NULL,
	`diagnosis` text DEFAULT '' NOT NULL,
	`conduct` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_encounters_patient_occurred` ON `encounters` (`patient_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_encounters_doctor` ON `encounters` (`doctor_id`);--> statement-breakpoint
CREATE TABLE `exam_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`encounter_id` text NOT NULL,
	`exam_name` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_exams_encounter` ON `exam_requests` (`encounter_id`);--> statement-breakpoint
CREATE TABLE `medical_records` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `medical_records_patient_id_unique` ON `medical_records` (`patient_id`);--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`cpf` text NOT NULL,
	`phone` text NOT NULL,
	`birth_date` text NOT NULL,
	`sex` text DEFAULT 'Não informado' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`emergency_contact` text DEFAULT '' NOT NULL,
	`administrative_notes` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patients_cpf_unique` ON `patients` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_patients_name` ON `patients` (`full_name`);--> statement-breakpoint
CREATE INDEX `idx_patients_phone` ON `patients` (`phone`);--> statement-breakpoint
CREATE TABLE `prescription_medications` (
	`id` text PRIMARY KEY NOT NULL,
	`prescription_id` text NOT NULL,
	`medication` text NOT NULL,
	`dosage` text NOT NULL,
	`frequency` text NOT NULL,
	`duration` text NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_medications_prescription` ON `prescription_medications` (`prescription_id`);--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`encounter_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prescriptions_encounter_id_unique` ON `prescriptions` (`encounter_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_user_id` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_user_id_unique` ON `users` (`auth_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);