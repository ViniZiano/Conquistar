import { getRawDb } from "@/db";

export type AppointmentInput = { doctorId: string | null; title: string; description: string; startsAt: string; endsAt: string; type: string; scope: "global" | "doctor"; allDay: boolean; reason: string; notes: string };
const select = `SELECT a.id, a.doctor_id AS doctorId, d.name AS doctorName, a.created_by_user_id AS createdByUserId, u.name AS createdByName, a.title, a.description, a.starts_at AS startsAt, a.ends_at AS endsAt, a.type, a.scope, a.all_day AS allDay, a.reason, a.notes, a.status, a.created_at AS createdAt, a.updated_at AS updatedAt FROM appointments a LEFT JOIN doctors d ON d.id = a.doctor_id JOIN users u ON u.id = a.created_by_user_id`;
export async function listAppointments(from?: string, to?: string, doctorId?: string | null, restrictToDoctor = false) {
  const clauses: string[] = []; const values: string[] = [];
  if (from) { clauses.push("a.starts_at >= ?"); values.push(from); }
  if (to) { clauses.push("a.starts_at <= ?"); values.push(to); }
  if (restrictToDoctor) { if (doctorId) { clauses.push("(a.scope = 'global' OR a.doctor_id = ?)"); values.push(doctorId); } else clauses.push("a.scope = 'global'"); }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const result = await getRawDb().prepare(`${select}${where} ORDER BY a.starts_at LIMIT 200`).bind(...values).all();
  return result.results.map((item) => ({ ...item, allDay: Boolean(item.allDay) }));
}
export async function createAppointment(input: AppointmentInput, userId: string) {
  const id = crypto.randomUUID();
  await getRawDb().prepare("INSERT INTO appointments (id, doctor_id, created_by_user_id, title, description, starts_at, ends_at, type, scope, all_day, reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.doctorId, userId, input.title, input.description, input.startsAt, input.endsAt, input.type, input.scope, input.allDay ? 1 : 0, input.reason, input.notes).run();
  return id;
}
export async function getAppointment(id: string) { const row = await getRawDb().prepare(`${select} WHERE a.id = ?`).bind(id).first<Record<string, unknown>>(); return row ? { ...row, allDay: Boolean(row.allDay) } : null; }
export async function updateAppointment(id: string, input: AppointmentInput) { await getRawDb().prepare("UPDATE appointments SET doctor_id = ?, title = ?, description = ?, starts_at = ?, ends_at = ?, type = ?, scope = ?, all_day = ?, reason = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(input.doctorId, input.title, input.description, input.startsAt, input.endsAt, input.type, input.scope, input.allDay ? 1 : 0, input.reason, input.notes, id).run(); }
export async function deleteAppointment(id: string) { await getRawDb().prepare("DELETE FROM appointments WHERE id = ?").bind(id).run(); }
