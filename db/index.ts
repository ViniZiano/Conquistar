import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let initialization: Promise<void> | null = null;

export function getRawDb(): D1Database {
  if (!env.DB) throw new Error("O banco de dados da clínica não está disponível.");
  return env.DB;
}

export function getDb() { return drizzle(getRawDb(), { schema }); }

export async function ensureDatabase() {
  if (!initialization) initialization = initialize().catch((error) => { initialization = null; throw error; });
  await initialization;
}

async function initialize() {
  const db = getRawDb();
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, auth_user_id TEXT UNIQUE, email_verified_at TEXT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, username TEXT UNIQUE, password_hash TEXT, password_updated_at TEXT, must_change_password INTEGER NOT NULL DEFAULT 0, role TEXT NOT NULL CHECK(role IN ('admin','doctor','reception')), active INTEGER NOT NULL DEFAULT 1, phone TEXT NOT NULL DEFAULT '', avatar_key TEXT, theme TEXT NOT NULL DEFAULT 'system', notify_appointments INTEGER NOT NULL DEFAULT 1, notify_system INTEGER NOT NULL DEFAULT 1, last_seen_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL UNIQUE, user_agent_hash TEXT NOT NULL DEFAULT '', ip_hash TEXT NOT NULL DEFAULT '', expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_at TEXT, revocation_reason TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS auth_login_attempts (attempt_key TEXT PRIMARY KEY, identifier_hash TEXT NOT NULL, ip_hash TEXT NOT NULL, failed_count INTEGER NOT NULL DEFAULT 0, window_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, locked_until TEXT, last_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS doctors (id TEXT PRIMARY KEY, user_id TEXT UNIQUE REFERENCES users(id), name TEXT NOT NULL, crm TEXT NOT NULL UNIQUE, specialty TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, full_name TEXT NOT NULL, cpf TEXT NOT NULL UNIQUE, phone TEXT NOT NULL, birth_date TEXT NOT NULL, sex TEXT NOT NULL DEFAULT 'Não informado', address TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', emergency_contact TEXT NOT NULL DEFAULT '', administrative_notes TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS medical_records (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL UNIQUE REFERENCES patients(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS cid_catalog_releases (id TEXT PRIMARY KEY, classification TEXT NOT NULL, version TEXT NOT NULL, source_url TEXT NOT NULL, source_sha256 TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(classification, version))`,
    `CREATE TABLE IF NOT EXISTS cid_codes (id TEXT PRIMARY KEY, release_id TEXT NOT NULL REFERENCES cid_catalog_releases(id), code TEXT NOT NULL, code_search TEXT NOT NULL, description TEXT NOT NULL, search_description TEXT NOT NULL, category TEXT NOT NULL, version TEXT NOT NULL, classification_type TEXT NOT NULL DEFAULT '', sex_restriction TEXT NOT NULL DEFAULT '', mortality_restriction TEXT NOT NULL DEFAULT '', reference_code TEXT NOT NULL DEFAULT '', excluded_codes TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, UNIQUE(release_id, code))`,
    `CREATE TABLE IF NOT EXISTS encounters (id TEXT PRIMARY KEY, medical_record_id TEXT NOT NULL REFERENCES medical_records(id), patient_id TEXT NOT NULL REFERENCES patients(id), doctor_id TEXT NOT NULL REFERENCES doctors(id), author_user_id TEXT NOT NULL REFERENCES users(id), occurred_at TEXT NOT NULL, consultation_type TEXT NOT NULL DEFAULT 'Consulta', doctor_specialty TEXT NOT NULL DEFAULT '', chief_complaint TEXT NOT NULL DEFAULT '', problem_history TEXT NOT NULL DEFAULT '', symptoms TEXT NOT NULL DEFAULT '', relevant_history TEXT NOT NULL DEFAULT '', allergies TEXT NOT NULL DEFAULT '', clinical_notes TEXT NOT NULL DEFAULT '', evolution TEXT NOT NULL DEFAULT '', diagnostic_hypothesis TEXT NOT NULL DEFAULT '', diagnosis TEXT NOT NULL DEFAULT '', diagnosis_notes TEXT NOT NULL DEFAULT '', diagnosis_code TEXT NOT NULL DEFAULT '', diagnosis_description TEXT NOT NULL DEFAULT '', conduct TEXT NOT NULL DEFAULT '', patient_guidance TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', cancelled_at TEXT, cancelled_by_user_id TEXT REFERENCES users(id), cancellation_reason TEXT, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS encounter_diagnoses (id TEXT PRIMARY KEY, encounter_id TEXT NOT NULL REFERENCES encounters(id), cid_id TEXT NOT NULL REFERENCES cid_codes(id), type TEXT NOT NULL DEFAULT 'hypothesis', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(encounter_id, cid_id))`,
    `CREATE TABLE IF NOT EXISTS prescriptions (id TEXT PRIMARY KEY, encounter_id TEXT NOT NULL UNIQUE REFERENCES encounters(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS prescription_medications (id TEXT PRIMARY KEY, prescription_id TEXT NOT NULL REFERENCES prescriptions(id), medication TEXT NOT NULL, dosage TEXT NOT NULL, administration_route TEXT NOT NULL DEFAULT '', frequency TEXT NOT NULL, duration TEXT NOT NULL, instructions TEXT NOT NULL DEFAULT '')`,
    `CREATE TABLE IF NOT EXISTS exam_requests (id TEXT PRIMARY KEY, encounter_id TEXT NOT NULL REFERENCES encounters(id), exam_name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', priority TEXT NOT NULL DEFAULT 'Rotina', notes TEXT NOT NULL DEFAULT '')`,
    `CREATE TABLE IF NOT EXISTS presented_exams (id TEXT PRIMARY KEY, encounter_id TEXT NOT NULL REFERENCES encounters(id), exam_name TEXT NOT NULL, performed_at TEXT NOT NULL DEFAULT '', laboratory TEXT NOT NULL DEFAULT '', result_summary TEXT NOT NULL DEFAULT '', medical_notes TEXT NOT NULL DEFAULT '', attachment_key TEXT, attachment_name TEXT, attachment_type TEXT, attachment_size INTEGER, attachment_sha256 TEXT, attachment_scan_status TEXT, attachment_created_at TEXT, attachment_uploaded_by_user_id TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, doctor_id TEXT REFERENCES doctors(id), created_by_user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, type TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'doctor', all_day INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'scheduled', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, details TEXT NOT NULL DEFAULT '{}', actor_role TEXT NOT NULL DEFAULT 'unknown', summary TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS governance_controls (key TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', responsible TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', evidence_reference TEXT NOT NULL DEFAULT '', reviewed_at TEXT, updated_by_user_id TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name)`,
    `CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked ON auth_login_attempts(locked_until)`,
    `CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone)`,
    `CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name)`,
    `CREATE INDEX IF NOT EXISTS idx_encounters_patient_occurred ON encounters(patient_id, occurred_at)`,
    `CREATE INDEX IF NOT EXISTS idx_encounters_doctor ON encounters(doctor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cid_codes_active_code ON cid_codes(active, code_search)`,
    `CREATE INDEX IF NOT EXISTS idx_cid_codes_search_description ON cid_codes(search_description)`,
    `CREATE INDEX IF NOT EXISTS idx_encounter_diagnoses_encounter ON encounter_diagnoses(encounter_id)`,
    `CREATE INDEX IF NOT EXISTS idx_medications_prescription ON prescription_medications(prescription_id)`,
    `CREATE INDEX IF NOT EXISTS idx_exams_encounter ON exam_requests(encounter_id)`,
    `CREATE INDEX IF NOT EXISTS idx_presented_exams_encounter ON presented_exams(encounter_id)`,
    `CREATE INDEX IF NOT EXISTS idx_appointments_doctor_start ON appointments(doctor_id, starts_at)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`,
  ];
  await db.batch(statements.map((statement) => db.prepare(statement)));
  const ensureColumns = async (table: string, columns: Record<string, string>) => {
    const info = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    const existing = new Set(info.results.map((column) => column.name));
    for (const [name, definition] of Object.entries(columns)) if (!existing.has(name)) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`).run();
  };
  await ensureColumns("users", {
    phone: "TEXT NOT NULL DEFAULT ''", avatar_key: "TEXT", theme: "TEXT NOT NULL DEFAULT 'system'",
    notify_appointments: "INTEGER NOT NULL DEFAULT 1", notify_system: "INTEGER NOT NULL DEFAULT 1", last_seen_at: "TEXT", email_verified_at: "TEXT",
    username: "TEXT", password_hash: "TEXT", password_updated_at: "TEXT", must_change_password: "INTEGER NOT NULL DEFAULT 0",
  });
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_normalized ON users(lower(username)) WHERE username IS NOT NULL").run();
  await ensureColumns("encounters", {
    consultation_type: "TEXT NOT NULL DEFAULT 'Consulta'", doctor_specialty: "TEXT NOT NULL DEFAULT ''",
    relevant_history: "TEXT NOT NULL DEFAULT ''", allergies: "TEXT NOT NULL DEFAULT ''",
    diagnostic_hypothesis: "TEXT NOT NULL DEFAULT ''", diagnosis_notes: "TEXT NOT NULL DEFAULT ''", diagnosis_code: "TEXT NOT NULL DEFAULT ''", diagnosis_description: "TEXT NOT NULL DEFAULT ''", patient_guidance: "TEXT NOT NULL DEFAULT ''",
    status: "TEXT NOT NULL DEFAULT 'active'", cancelled_at: "TEXT", cancelled_by_user_id: "TEXT REFERENCES users(id)", cancellation_reason: "TEXT",
  });
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_encounters_patient_status_occurred ON encounters(patient_id, status, occurred_at)").run();
  await db.prepare(`CREATE VIRTUAL TABLE IF NOT EXISTS cid_codes_fts USING fts5(code, description, content='cid_codes', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2')`).run();
  await db.batch([
    db.prepare(`CREATE TRIGGER IF NOT EXISTS cid_codes_ai AFTER INSERT ON cid_codes BEGIN INSERT INTO cid_codes_fts(rowid, code, description) VALUES (new.rowid, new.code, new.description); END`),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS cid_codes_ad AFTER DELETE ON cid_codes BEGIN INSERT INTO cid_codes_fts(cid_codes_fts, rowid, code, description) VALUES ('delete', old.rowid, old.code, old.description); END`),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS cid_codes_au AFTER UPDATE ON cid_codes BEGIN INSERT INTO cid_codes_fts(cid_codes_fts, rowid, code, description) VALUES ('delete', old.rowid, old.code, old.description); INSERT INTO cid_codes_fts(rowid, code, description) VALUES (new.rowid, new.code, new.description); END`),
  ]);
  await ensureColumns("prescription_medications", { administration_route: "TEXT NOT NULL DEFAULT ''" });
  await ensureColumns("exam_requests", { category: "TEXT NOT NULL DEFAULT ''", priority: "TEXT NOT NULL DEFAULT 'Rotina'" });
  await ensureColumns("presented_exams", {
    attachment_name: "TEXT", attachment_type: "TEXT", attachment_size: "INTEGER", attachment_sha256: "TEXT",
    attachment_scan_status: "TEXT", attachment_created_at: "TEXT", attachment_uploaded_by_user_id: "TEXT REFERENCES users(id)",
  });
  const appointmentInfo = await db.prepare("PRAGMA table_info(appointments)").all<{ name: string; notnull: number }>();
  if (appointmentInfo.results.find((column) => column.name === "doctor_id")?.notnull) {
    await db.batch([
      db.prepare(`CREATE TABLE appointments_v2 (id TEXT PRIMARY KEY, doctor_id TEXT REFERENCES doctors(id), created_by_user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, type TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'doctor', all_day INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'scheduled', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
      db.prepare(`INSERT INTO appointments_v2 (id, doctor_id, created_by_user_id, title, description, starts_at, ends_at, type, scope, all_day, reason, notes, status, created_at, updated_at) SELECT id, doctor_id, created_by_user_id, title, description, starts_at, ends_at, type, 'doctor', 0, '', notes, status, created_at, updated_at FROM appointments`),
      db.prepare("DROP TABLE appointments"),
      db.prepare("ALTER TABLE appointments_v2 RENAME TO appointments"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_appointments_doctor_start ON appointments(doctor_id, starts_at)"),
    ]);
  } else await ensureColumns("appointments", { scope: "TEXT NOT NULL DEFAULT 'doctor'", all_day: "INTEGER NOT NULL DEFAULT 0", reason: "TEXT NOT NULL DEFAULT ''" });
  const auditColumns = await db.prepare("PRAGMA table_info(audit_logs)").all<{ name: string }>();
  const existingAuditColumns = new Set(auditColumns.results.map((column) => column.name));
  if (!existingAuditColumns.has("actor_role")) await db.prepare("ALTER TABLE audit_logs ADD COLUMN actor_role TEXT NOT NULL DEFAULT 'unknown'").run();
  if (!existingAuditColumns.has("summary")) await db.prepare("ALTER TABLE audit_logs ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
  const governance = [
    ["clinical_attachments", "Anexos clínicos de exames", "Acesso privado, limites, integridade, triagem antimalware e retenção dos anexos.", "in_progress"],
    ["cid_structured", "Registro estruturado CID", "Captura estruturada de código e descrição, preparada para catálogo oficial futuro.", "in_progress"],
    ["independent_pentest", "Pentest independente", "Avaliação técnica externa antes do uso assistencial real.", "pending"],
    ["lgpd_legal_review", "Revisão jurídica e LGPD", "Validação externa das bases legais, avisos, contratos e processos de titulares.", "pending"],
    ["backup_retention_policy", "Backup e retenção", "Política aprovada, cópias testadas, prazos e descarte seguro.", "pending"],
    ["incident_response", "Resposta a incidentes", "Plano formal com responsáveis, contatos, comunicação e exercícios.", "pending"],
  ];
  await db.batch(governance.map(([key, title, description, status]) => db.prepare("INSERT OR IGNORE INTO governance_controls (key, title, description, status) VALUES (?, ?, ?, ?)").bind(key, title, description, status)));
  await db.prepare("UPDATE governance_controls SET title = 'Catálogo oficial CID-10', description = 'Catálogo DATASUS V2008 importado, pesquisável e versionado, com vínculo estruturado a múltiplos diagnósticos por atendimento.', status = 'complete', updated_at = CURRENT_TIMESTAMP WHERE key = 'cid_structured' AND (SELECT COUNT(*) FROM cid_codes WHERE active = 1) >= 12000").run();
  await db.prepare("PRAGMA optimize").run();
}
