import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), authUserId: text("auth_user_id").unique(),
  emailVerifiedAt: text("email_verified_at"),
  name: text("name").notNull(), email: text("email").notNull().unique(),
  username: text("username").unique(), passwordHash: text("password_hash"),
  passwordUpdatedAt: text("password_updated_at"),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
  role: text("role", { enum: ["admin", "doctor", "reception"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  phone: text("phone").notNull().default(""), avatarKey: text("avatar_key"),
  theme: text("theme", { enum: ["light", "dark", "system"] }).notNull().default("system"),
  notifyAppointments: integer("notify_appointments", { mode: "boolean" }).notNull().default(true),
  notifySystem: integer("notify_system", { mode: "boolean" }).notNull().default(true),
  lastSeenAt: text("last_seen_at"), ...timestamps,
});

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(), userAgentHash: text("user_agent_hash").notNull().default(""),
  ipHash: text("ip_hash").notNull().default(""), expiresAt: text("expires_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  revokedAt: text("revoked_at"), revocationReason: text("revocation_reason"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_auth_sessions_user").on(table.userId), index("idx_auth_sessions_expiry").on(table.expiresAt)]);

export const authLoginAttempts = sqliteTable("auth_login_attempts", {
  attemptKey: text("attempt_key").primaryKey(), identifierHash: text("identifier_hash").notNull(),
  ipHash: text("ip_hash").notNull(), failedCount: integer("failed_count").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lockedUntil: text("locked_until"), lastAttemptAt: text("last_attempt_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_auth_login_attempts_locked").on(table.lockedUntil)]);

export const doctors = sqliteTable("doctors", {
  id: text("id").primaryKey(), userId: text("user_id").unique().references(() => users.id),
  name: text("name").notNull(), crm: text("crm").notNull().unique(), specialty: text("specialty").notNull(),
  phone: text("phone").notNull().default(""), email: text("email").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true), ...timestamps,
}, (table) => [index("idx_doctors_name").on(table.name)]);

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(), fullName: text("full_name").notNull(), cpf: text("cpf").notNull().unique(),
  phone: text("phone").notNull(), birthDate: text("birth_date").notNull(), sex: text("sex").notNull().default("Não informado"),
  address: text("address").notNull().default(""), email: text("email").notNull().default(""),
  emergencyContact: text("emergency_contact").notNull().default(""), administrativeNotes: text("administrative_notes").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true), ...timestamps,
}, (table) => [index("idx_patients_name").on(table.fullName), index("idx_patients_phone").on(table.phone)]);

export const medicalRecords = sqliteTable("medical_records", {
  id: text("id").primaryKey(), patientId: text("patient_id").notNull().unique().references(() => patients.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const cidCatalogReleases = sqliteTable("cid_catalog_releases", {
  id: text("id").primaryKey(), classification: text("classification").notNull(), version: text("version").notNull(),
  sourceUrl: text("source_url").notNull(), sourceSha256: text("source_sha256").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true), importedAt: text("imported_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("uq_cid_catalog_release").on(table.classification, table.version)]);

export const cidCodes = sqliteTable("cid_codes", {
  id: text("id").primaryKey(), releaseId: text("release_id").notNull().references(() => cidCatalogReleases.id),
  code: text("code").notNull(), codeSearch: text("code_search").notNull(), description: text("description").notNull(),
  searchDescription: text("search_description").notNull(), category: text("category").notNull(), version: text("version").notNull(),
  classificationType: text("classification_type").notNull().default(""), sexRestriction: text("sex_restriction").notNull().default(""),
  mortalityRestriction: text("mortality_restriction").notNull().default(""), referenceCode: text("reference_code").notNull().default(""),
  excludedCodes: text("excluded_codes").notNull().default(""), active: integer("active", { mode: "boolean" }).notNull().default(true),
}, (table) => [
  uniqueIndex("uq_cid_codes_release_code").on(table.releaseId, table.code),
  index("idx_cid_codes_active_code").on(table.active, table.codeSearch),
  index("idx_cid_codes_search_description").on(table.searchDescription),
]);

export const encounters = sqliteTable("encounters", {
  id: text("id").primaryKey(), medicalRecordId: text("medical_record_id").notNull().references(() => medicalRecords.id),
  patientId: text("patient_id").notNull().references(() => patients.id), doctorId: text("doctor_id").notNull().references(() => doctors.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id), occurredAt: text("occurred_at").notNull(),
  consultationType: text("consultation_type").notNull().default("Consulta"), doctorSpecialty: text("doctor_specialty").notNull().default(""),
  chiefComplaint: text("chief_complaint").notNull().default(""), problemHistory: text("problem_history").notNull().default(""),
  symptoms: text("symptoms").notNull().default(""), relevantHistory: text("relevant_history").notNull().default(""),
  allergies: text("allergies").notNull().default(""), clinicalNotes: text("clinical_notes").notNull().default(""),
  evolution: text("evolution").notNull().default(""), diagnosticHypothesis: text("diagnostic_hypothesis").notNull().default(""),
  diagnosis: text("diagnosis").notNull().default(""), diagnosisNotes: text("diagnosis_notes").notNull().default(""),
  diagnosisCode: text("diagnosis_code").notNull().default(""), diagnosisDescription: text("diagnosis_description").notNull().default(""),
  conduct: text("conduct").notNull().default(""), patientGuidance: text("patient_guidance").notNull().default(""), notes: text("notes").notNull().default(""),
  status: text("status", { enum: ["active", "cancelled"] }).notNull().default("active"), cancelledAt: text("cancelled_at"),
  cancelledByUserId: text("cancelled_by_user_id").references(() => users.id), cancellationReason: text("cancellation_reason"),
  version: integer("version").notNull().default(1), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_encounters_patient_occurred").on(table.patientId, table.occurredAt), index("idx_encounters_patient_status_occurred").on(table.patientId, table.status, table.occurredAt), index("idx_encounters_doctor").on(table.doctorId)]);

export const encounterDiagnoses = sqliteTable("encounter_diagnoses", {
  id: text("id").primaryKey(), encounterId: text("encounter_id").notNull().references(() => encounters.id),
  cidId: text("cid_id").notNull().references(() => cidCodes.id),
  type: text("type", { enum: ["hypothesis", "confirmed", "preexisting", "other"] }).notNull().default("hypothesis"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("uq_encounter_diagnoses_encounter_cid").on(table.encounterId, table.cidId), index("idx_encounter_diagnoses_encounter").on(table.encounterId)]);

export const prescriptions = sqliteTable("prescriptions", {
  id: text("id").primaryKey(), encounterId: text("encounter_id").notNull().unique().references(() => encounters.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const prescriptionMedications = sqliteTable("prescription_medications", {
  id: text("id").primaryKey(), prescriptionId: text("prescription_id").notNull().references(() => prescriptions.id),
  medication: text("medication").notNull(), dosage: text("dosage").notNull(), administrationRoute: text("administration_route").notNull().default(""), frequency: text("frequency").notNull(),
  duration: text("duration").notNull(), instructions: text("instructions").notNull().default(""),
}, (table) => [index("idx_medications_prescription").on(table.prescriptionId)]);

export const examRequests = sqliteTable("exam_requests", {
  id: text("id").primaryKey(), encounterId: text("encounter_id").notNull().references(() => encounters.id),
  examName: text("exam_name").notNull(), category: text("category").notNull().default(""), priority: text("priority").notNull().default("Rotina"), notes: text("notes").notNull().default(""),
}, (table) => [index("idx_exams_encounter").on(table.encounterId)]);

export const presentedExams = sqliteTable("presented_exams", {
  id: text("id").primaryKey(), encounterId: text("encounter_id").notNull().references(() => encounters.id),
  examName: text("exam_name").notNull(), performedAt: text("performed_at").notNull().default(""), laboratory: text("laboratory").notNull().default(""),
  resultSummary: text("result_summary").notNull().default(""), medicalNotes: text("medical_notes").notNull().default(""), attachmentKey: text("attachment_key"),
  attachmentName: text("attachment_name"), attachmentType: text("attachment_type"), attachmentSize: integer("attachment_size"),
  attachmentSha256: text("attachment_sha256"), attachmentScanStatus: text("attachment_scan_status"), attachmentCreatedAt: text("attachment_created_at"),
  attachmentUploadedByUserId: text("attachment_uploaded_by_user_id").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_presented_exams_encounter").on(table.encounterId)]);

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(), doctorId: text("doctor_id").references(() => doctors.id),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id), title: text("title").notNull(),
  description: text("description").notNull().default(""), startsAt: text("starts_at").notNull(), endsAt: text("ends_at").notNull(),
  type: text("type").notNull(), scope: text("scope", { enum: ["global", "doctor"] }).notNull().default("doctor"), allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
  reason: text("reason").notNull().default(""), notes: text("notes").notNull().default(""), status: text("status").notNull().default("scheduled"), ...timestamps,
}, (table) => [index("idx_appointments_doctor_start").on(table.doctorId, table.startsAt)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), action: text("action").notNull(),
  entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), details: text("details").notNull().default("{}"),
  actorRole: text("actor_role").notNull().default("unknown"), summary: text("summary").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_audit_created").on(table.createdAt), index("idx_audit_entity").on(table.entityType, table.entityId), index("idx_audit_action").on(table.action), index("idx_audit_user").on(table.userId)]);

export const governanceControls = sqliteTable("governance_controls", {
  key: text("key").primaryKey(), title: text("title").notNull(), description: text("description").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "complete", "not_applicable"] }).notNull().default("pending"),
  responsible: text("responsible").notNull().default(""), notes: text("notes").notNull().default(""),
  evidenceReference: text("evidence_reference").notNull().default(""), reviewedAt: text("reviewed_at"),
  updatedByUserId: text("updated_by_user_id").references(() => users.id), ...timestamps,
});
