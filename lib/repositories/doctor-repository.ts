import { getRawDb } from "@/db";
import { ConflictError, NotFoundError } from "@/lib/http/errors";

type DoctorInput = { name: string; crm: string; specialty: string; phone: string; email: string; userId: string | null; active: boolean };
const selectDoctor = `SELECT d.id, d.user_id AS userId, d.name, d.crm, d.specialty, d.phone, d.email, d.active, d.created_at AS createdAt, u.name AS userName FROM doctors d LEFT JOIN users u ON u.id = d.user_id`;
const mapDoctor = (row: Record<string, unknown>) => ({ ...row, active: Boolean(row.active) });

export async function listDoctors(query = "") {
  const value = query.trim();
  const result = value ? await getRawDb().prepare(`${selectDoctor} WHERE lower(d.name) LIKE lower(?) OR lower(d.crm) LIKE lower(?) ORDER BY d.active DESC, d.name`).bind(`%${value}%`, `%${value}%`).all() : await getRawDb().prepare(`${selectDoctor} ORDER BY d.active DESC, d.name`).all();
  return result.results.map(mapDoctor);
}
export async function getDoctor(id: string) { const row = await getRawDb().prepare(`${selectDoctor} WHERE d.id = ?`).bind(id).first<Record<string, unknown>>(); if (!row) throw new NotFoundError("Médico não encontrado."); return mapDoctor(row); }
export async function createDoctor(input: DoctorInput) {
  if (await getRawDb().prepare("SELECT id FROM doctors WHERE crm = ?").bind(input.crm).first()) throw new ConflictError("Já existe um médico com este CRM.");
  if (input.userId && await getRawDb().prepare("SELECT id FROM doctors WHERE user_id = ?").bind(input.userId).first()) throw new ConflictError("Este usuário já está associado a outro médico.");
  const id = crypto.randomUUID();
  await getRawDb().prepare("INSERT INTO doctors (id, user_id, name, crm, specialty, phone, email, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.userId, input.name, input.crm, input.specialty, input.phone, input.email, input.active ? 1 : 0).run();
  return id;
}
export async function updateDoctor(id: string, input: DoctorInput) {
  await getDoctor(id);
  if (await getRawDb().prepare("SELECT id FROM doctors WHERE crm = ? AND id <> ?").bind(input.crm, id).first()) throw new ConflictError("Já existe outro médico com este CRM.");
  if (input.userId && await getRawDb().prepare("SELECT id FROM doctors WHERE user_id = ? AND id <> ?").bind(input.userId, id).first()) throw new ConflictError("Este usuário já está associado a outro médico.");
  await getRawDb().prepare("UPDATE doctors SET user_id = ?, name = ?, crm = ?, specialty = ?, phone = ?, email = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(input.userId, input.name, input.crm, input.specialty, input.phone, input.email, input.active ? 1 : 0, id).run();
}

export async function doctorDependencies(id: string) {
  const row = await getRawDb().prepare(`SELECT
    (SELECT COUNT(*) FROM encounters WHERE doctor_id = ?) AS encounters,
    (SELECT COUNT(*) FROM appointments WHERE doctor_id = ?) AS appointments`).bind(id, id).first<Record<string, number>>();
  return { encounters: Number(row?.encounters ?? 0), appointments: Number(row?.appointments ?? 0) };
}

export async function deleteDoctor(id: string) { await getRawDb().prepare("DELETE FROM doctors WHERE id = ?").bind(id).run(); }
