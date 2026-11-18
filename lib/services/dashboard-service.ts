import { getRawDb } from "@/db";
import type { Actor } from "@/lib/domain/types";
import { assertPermission, can } from "@/lib/auth/permissions";

export async function getDashboard(actor: Actor) {
  assertPermission(actor, "dashboard.read");
  const db = getRawDb(); const doctorFilter = actor.role === "doctor" ? (actor.doctorId ? " AND doctor_id = ?" : " AND 1 = 0") : ""; const bindings = actor.role === "doctor" && actor.doctorId ? [actor.doctorId] : [];
  const [patientCount, doctorCount, todayCount, futureCount, appointments, recent] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS total FROM patients WHERE active = 1").first<{ total: number }>(),
    db.prepare("SELECT COUNT(*) AS total FROM doctors WHERE active = 1").first<{ total: number }>(),
    db.prepare(`SELECT COUNT(*) AS total FROM appointments WHERE date(starts_at) = date('now')${doctorFilter}`).bind(...bindings).first<{ total: number }>(),
    db.prepare(`SELECT COUNT(*) AS total FROM appointments WHERE starts_at > datetime('now')${doctorFilter}`).bind(...bindings).first<{ total: number }>(),
    db.prepare(`SELECT a.id, a.title, a.starts_at AS startsAt, a.type, d.name AS doctorName FROM appointments a JOIN doctors d ON d.id = a.doctor_id WHERE a.starts_at >= datetime('now')${doctorFilter.replace("doctor_id", "a.doctor_id")} ORDER BY a.starts_at LIMIT 5`).bind(...bindings).all(),
    can(actor, "audit.read") ? db.prepare("SELECT a.id, a.action, a.entity_type AS entityType, a.summary, a.created_at AS createdAt, u.name AS userName FROM audit_logs a JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 5").all() : Promise.resolve({ results: [] }),
  ]);
  return { stats: { patients: patientCount?.total ?? 0, doctors: doctorCount?.total ?? 0, today: todayCount?.total ?? 0, upcoming: futureCount?.total ?? 0 }, appointments: appointments.results, recent: recent.results };
}
