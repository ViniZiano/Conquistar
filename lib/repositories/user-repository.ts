import { ensureDatabase, getRawDb } from "@/db";
import type { Actor, Role, ThemePreference } from "@/lib/domain/types";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/http/errors";

type UserRow = { id: string; authUserId: string | null; emailVerifiedAt: string | null; name: string; email: string; username: string | null; passwordHash: string | null; mustChangePassword: number; role: Role; active: number; doctorId: string | null; doctorActive: number | null; phone: string; avatarKey: string | null; theme: ThemePreference; notifyAppointments: number; notifySystem: number; lastSeenAt: string | null };
type DoctorLinkRow = { id: string; userId: string | null; active: number };
const actorSql = `SELECT u.id, u.auth_user_id AS authUserId, u.email_verified_at AS emailVerifiedAt, u.name, u.email, u.username, u.password_hash AS passwordHash, u.must_change_password AS mustChangePassword, u.role, u.active, u.phone, u.avatar_key AS avatarKey, u.theme, u.notify_appointments AS notifyAppointments, u.notify_system AS notifySystem, u.last_seen_at AS lastSeenAt, d.id AS doctorId, d.active AS doctorActive FROM users u LEFT JOIN doctors d ON d.user_id = u.id`;
function asActor(row: UserRow): Actor { const { doctorActive, passwordHash, ...actor } = row; void doctorActive; return { ...actor, passwordConfigured: Boolean(passwordHash), mustChangePassword: Boolean(row.mustChangePassword), active: Boolean(row.active), notifyAppointments: Boolean(row.notifyAppointments), notifySystem: Boolean(row.notifySystem) }; }

async function chooseDoctorLink(role: Role, doctorId: string | null | undefined, email: string, userId?: string) {
  if (role !== "doctor") return null;
  if (doctorId) {
    const selected = await getRawDb().prepare("SELECT id, user_id AS userId, active FROM doctors WHERE id = ?").bind(doctorId).first<DoctorLinkRow>();
    if (!selected) throw new ValidationError("Selecione um médico cadastrado.");
    if (!selected.active) throw new ValidationError("O profissional selecionado está inativo.");
    if (selected.userId && selected.userId !== userId) throw new ConflictError("Este médico já está associado a outro usuário.");
    return selected.id;
  }
  if (doctorId === null) return null;
  const matches = await getRawDb().prepare("SELECT id, user_id AS userId, active FROM doctors WHERE lower(email) = lower(?) AND active = 1").bind(email).all<DoctorLinkRow>();
  const available = matches.results.filter((doctor) => !doctor.userId || doctor.userId === userId);
  return matches.results.length === 1 && available.length === 1 ? available[0].id : null;
}

export async function resolveActor(identity: ChatGPTUser): Promise<Actor> {
  await ensureDatabase();
  const db = getRawDb();
  const identityEmail = identity.email.trim().toLowerCase();
  let row = await db.prepare(`${actorSql} WHERE u.auth_user_id = ? LIMIT 1`).bind(identity.userId).first<UserRow>();
  if (row && row.email.toLowerCase() !== identityEmail) throw new Error("O e-mail desta identidade não corresponde ao e-mail autorizado. Peça ao administrador para revisar o acesso.");
  if (!row) row = await db.prepare(`${actorSql} WHERE lower(u.email) = lower(?) LIMIT 1`).bind(identityEmail).first<UserRow>();
  if (row) {
    if (row.authUserId && row.authUserId !== identity.userId) throw new Error("Este e-mail já foi validado por outra identidade. Peça ao administrador para revisar o acesso.");
    if (!row.authUserId || !row.emailVerifiedAt) await db.prepare("UPDATE users SET auth_user_id = ?, email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(identity.userId, row.id).run();
    if (!row.active) throw new Error("Seu acesso está inativo. Procure um administrador.");
    row = await db.prepare(`${actorSql} WHERE u.id = ?`).bind(row.id).first<UserRow>();
    if (row?.role === "doctor" && !row.doctorId) {
      const autoDoctorId = await chooseDoctorLink("doctor", undefined, row.email, row.id);
      if (autoDoctorId) {
        await db.prepare("UPDATE doctors SET user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id IS NULL").bind(row.id, autoDoctorId).run();
        row = await db.prepare(`${actorSql} WHERE u.id = ?`).bind(row.id).first<UserRow>();
      }
    }
    if (row?.role === "doctor" && row.doctorId && !row.doctorActive) throw new Error("O cadastro profissional associado ao seu acesso está inativo.");
    await db.prepare("UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?").bind(row!.id).run();
    return { ...asActor({ ...row!, lastSeenAt: new Date().toISOString() }), authenticationMethod: "legacy" };
  }
  const count = await db.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
  if ((count?.total ?? 0) > 0) throw new Error("Seu usuário ainda não foi autorizado pela clínica.");
  const id = crypto.randomUUID();
  await db.prepare("INSERT INTO users (id, auth_user_id, email_verified_at, name, email, role) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, 'admin')").bind(id, identity.userId, identity.displayName, identityEmail).run();
  return { id, authUserId: identity.userId, emailVerifiedAt: new Date().toISOString(), name: identity.displayName, email: identityEmail, username: null, passwordConfigured: false, mustChangePassword: false, authenticationMethod: "legacy", role: "admin", active: true, doctorId: null, phone: "", avatarKey: null, theme: "system", notifyAppointments: true, notifySystem: true, lastSeenAt: new Date().toISOString() };
}

export async function resolveActiveUserById(id: string): Promise<Actor> {
  await ensureDatabase();
  const row = await getRawDb().prepare(`${actorSql} WHERE u.id = ?`).bind(id).first<UserRow>();
  if (!row || !row.active) throw new Error("Sua sessão não possui acesso ativo.");
  if (row.role === "doctor" && row.doctorId && !row.doctorActive) throw new Error("O cadastro profissional associado ao seu acesso está inativo.");
  return asActor(row);
}

export async function listUsers() {
  const result = await getRawDb().prepare(`${actorSql} ORDER BY u.active DESC, u.name`).all<UserRow>();
  return result.results.map(asActor);
}

export async function getUser(id: string) {
  const row = await getRawDb().prepare(`${actorSql} WHERE u.id = ?`).bind(id).first<UserRow>();
  if (!row) throw new NotFoundError("Usuário não encontrado.");
  return asActor(row);
}

export async function createUser(input: { name: string; email: string; username?: string | null; role: Role; active?: boolean; doctorId?: string | null }) {
  const existing = await getRawDb().prepare("SELECT id FROM users WHERE lower(email) = lower(?)").bind(input.email).first();
  if (existing) throw new ConflictError("Já existe um usuário com este e-mail.");
  if (input.username && await getRawDb().prepare("SELECT id FROM users WHERE lower(username) = lower(?)").bind(input.username).first()) throw new ConflictError("Este nome de usuário já está em uso.");
  const id = crypto.randomUUID();
  const doctorId = await chooseDoctorLink(input.role, input.doctorId, input.email, id);
  if (input.role === "doctor" && input.active !== false && !doctorId) throw new ValidationError("Selecione o médico correspondente para ativar este acesso clínico.");
  const statements = [getRawDb().prepare("INSERT INTO users (id, name, email, username, role, active) VALUES (?, ?, ?, ?, ?, ?)").bind(id, input.name, input.email.toLowerCase(), input.username || null, input.role, input.active === false ? 0 : 1)];
  if (doctorId) statements.push(getRawDb().prepare("UPDATE doctors SET user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id, doctorId));
  await getRawDb().batch(statements);
  return { id, doctorId };
}

export async function updateUser(id: string, input: { name?: string; email?: string; username?: string | null; role?: Role; active?: boolean; doctorId?: string | null }) {
  const before = await getUser(id);
  if (input.email && await getRawDb().prepare("SELECT id FROM users WHERE lower(email) = lower(?) AND id <> ?").bind(input.email, id).first()) throw new ConflictError("Já existe outro usuário com este e-mail.");
  if (input.username && await getRawDb().prepare("SELECT id FROM users WHERE lower(username) = lower(?) AND id <> ?").bind(input.username, id).first()) throw new ConflictError("Este nome de usuário já está em uso.");
  const role = input.role ?? before.role; const email = input.email ?? before.email;
  const doctorId = input.doctorId === undefined && role === "doctor" && before.doctorId ? before.doctorId : await chooseDoctorLink(role, input.doctorId, email, id);
  const active = input.active ?? before.active;
  if (role === "doctor" && active && !doctorId) throw new ValidationError("Selecione o médico correspondente para manter este acesso clínico ativo.");
  const emailChanged = Boolean(input.email && input.email.toLowerCase() !== before.email.toLowerCase());
  const statements = [
    getRawDb().prepare("UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), username = CASE WHEN ? = 1 THEN ? ELSE username END, role = COALESCE(?, role), active = COALESCE(?, active), auth_user_id = CASE WHEN ? = 1 THEN NULL ELSE auth_user_id END, email_verified_at = CASE WHEN ? = 1 THEN NULL ELSE email_verified_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(input.name ?? null, input.email?.toLowerCase() ?? null, input.username === undefined ? 0 : 1, input.username || null, input.role ?? null, input.active === undefined ? null : input.active ? 1 : 0, emailChanged ? 1 : 0, emailChanged ? 1 : 0, id),
    getRawDb().prepare("UPDATE doctors SET user_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND (? IS NULL OR id <> ?)").bind(id, doctorId, doctorId),
  ];
  if (doctorId) statements.push(getRawDb().prepare("UPDATE doctors SET user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id, doctorId));
  await getRawDb().batch(statements);
  return doctorId;
}

export async function updateProfile(id: string, input: { name: string; phone: string; theme: ThemePreference; notifyAppointments: boolean; notifySystem: boolean }) {
  await getRawDb().prepare("UPDATE users SET name = ?, phone = ?, theme = ?, notify_appointments = ?, notify_system = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(input.name, input.phone, input.theme, input.notifyAppointments ? 1 : 0, input.notifySystem ? 1 : 0, id).run();
}

export async function updateAvatar(id: string, avatarKey: string | null) { await getRawDb().prepare("UPDATE users SET avatar_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(avatarKey, id).run(); }

export async function countActiveAdmins() { const row = await getRawDb().prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = 1").first<{ total: number }>(); return row?.total ?? 0; }

export async function userDependencies(id: string) {
  const row = await getRawDb().prepare(`SELECT
    (SELECT COUNT(*) FROM doctors WHERE user_id = ?) AS doctors,
    (SELECT COUNT(*) FROM encounters WHERE author_user_id = ?) AS encounters,
    (SELECT COUNT(*) FROM appointments WHERE created_by_user_id = ?) AS appointments,
    (SELECT COUNT(*) FROM audit_logs WHERE user_id = ?) AS auditLogs,
    (SELECT COUNT(*) FROM auth_sessions WHERE user_id = ?) AS authSessions`).bind(id, id, id, id, id).first<Record<string, number>>();
  return { doctors: Number(row?.doctors ?? 0), encounters: Number(row?.encounters ?? 0), appointments: Number(row?.appointments ?? 0), auditLogs: Number(row?.auditLogs ?? 0), authSessions: Number(row?.authSessions ?? 0) };
}

export async function deleteUser(id: string) { await getRawDb().prepare("DELETE FROM users WHERE id = ?").bind(id).run(); }
