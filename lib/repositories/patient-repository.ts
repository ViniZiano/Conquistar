import { getRawDb } from "@/db";
import { ConflictError, NotFoundError } from "@/lib/http/errors";

type PatientInput = { fullName: string; cpf: string; phone: string; birthDate: string; sex: string; address: string; email: string; emergencyContact: string; administrativeNotes: string; active: boolean };
const selectPatient = `SELECT id, full_name AS fullName, cpf, phone, birth_date AS birthDate, sex, address, email, emergency_contact AS emergencyContact, administrative_notes AS administrativeNotes, active, created_at AS createdAt, updated_at AS updatedAt FROM patients`;
const mapPatient = (row: Record<string, unknown>) => ({ ...row, active: Boolean(row.active) });

export async function listPatients(query = "") {
  const value = query.trim();
  const numeric = value.replace(/\D/g, "");
  const result = !value
    ? await getRawDb().prepare(`${selectPatient} ORDER BY active DESC, full_name LIMIT 150`).all()
    : numeric.length >= 2
      ? await getRawDb().prepare(`${selectPatient} WHERE lower(full_name) LIKE lower(?) OR cpf LIKE ? OR phone LIKE ? ORDER BY active DESC, full_name LIMIT 150`).bind(`%${value}%`, `%${numeric}%`, `%${numeric}%`).all()
      : await getRawDb().prepare(`${selectPatient} WHERE lower(full_name) LIKE lower(?) ORDER BY active DESC, full_name LIMIT 150`).bind(`%${value}%`).all();
  return result.results.map(mapPatient);
}

export async function getPatient(id: string) {
  const row = await getRawDb().prepare(`${selectPatient} WHERE id = ?`).bind(id).first<Record<string, unknown>>();
  if (!row) throw new NotFoundError("Paciente não encontrado.");
  return mapPatient(row);
}

export async function createPatient(input: PatientInput) {
  const duplicate = await getRawDb().prepare("SELECT id FROM patients WHERE cpf = ?").bind(input.cpf).first();
  if (duplicate) throw new ConflictError("Já existe um paciente com este CPF.");
  const id = crypto.randomUUID();
  const recordId = crypto.randomUUID();
  await getRawDb().batch([
    getRawDb().prepare(`INSERT INTO patients (id, full_name, cpf, phone, birth_date, sex, address, email, emergency_contact, administrative_notes, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, input.fullName, input.cpf, input.phone, input.birthDate, input.sex, input.address, input.email, input.emergencyContact, input.administrativeNotes, input.active ? 1 : 0),
    getRawDb().prepare("INSERT INTO medical_records (id, patient_id) VALUES (?, ?)").bind(recordId, id),
  ]);
  return { id, recordId };
}

export async function updatePatient(id: string, input: PatientInput) {
  await getPatient(id);
  const duplicate = await getRawDb().prepare("SELECT id FROM patients WHERE cpf = ? AND id <> ?").bind(input.cpf, id).first();
  if (duplicate) throw new ConflictError("Já existe outro paciente com este CPF.");
  await getRawDb().prepare(`UPDATE patients SET full_name = ?, cpf = ?, phone = ?, birth_date = ?, sex = ?, address = ?, email = ?, emergency_contact = ?, administrative_notes = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(input.fullName, input.cpf, input.phone, input.birthDate, input.sex, input.address, input.email, input.emergencyContact, input.administrativeNotes, input.active ? 1 : 0, id).run();
}

export async function patientEncounterCount(id: string) { const row = await getRawDb().prepare("SELECT COUNT(*) AS total FROM encounters WHERE patient_id = ?").bind(id).first<{ total: number }>(); return row?.total ?? 0; }

export async function deletePatient(id: string) {
  await getRawDb().batch([
    getRawDb().prepare("DELETE FROM medical_records WHERE patient_id = ?").bind(id),
    getRawDb().prepare("DELETE FROM patients WHERE id = ?").bind(id),
  ]);
}
