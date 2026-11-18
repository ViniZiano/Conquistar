import type { Actor, Role } from "@/lib/domain/types";
import { assertPermission } from "@/lib/auth/permissions";
import { ValidationError } from "@/lib/http/errors";
import { required, textValue, validEmail } from "@/lib/validation/common";
import * as users from "@/lib/repositories/user-repository";
import { writeAudit } from "@/lib/repositories/audit-repository";
import { revokeUserSessions } from "@/lib/repositories/auth-repository";

const roles = new Set<Role>(["admin", "doctor", "reception"]);
function roleValue(value: unknown): Role { const role = String(value) as Role; if (!roles.has(role)) throw new ValidationError("Perfil de usuário inválido."); return role; }
function usernameValue(value: unknown) { const username = textValue(value).toLowerCase(); if (!username) return null; if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new ValidationError("O usuário deve ter de 3 a 40 caracteres, usando letras, números, ponto, hífen ou sublinhado."); return username; }
export async function list(actor: Actor) { assertPermission(actor, "users.manage"); return users.listUsers(); }
export async function create(actor: Actor, payload: Record<string, unknown>) { assertPermission(actor, "users.manage"); const role = roleValue(payload.role); const input = { name: required(payload.name, "Nome"), email: validEmail(payload.email), username: usernameValue(payload.username), role, active: payload.active !== false, doctorId: role === "doctor" ? (textValue(payload.doctorId) || undefined) : null }; const created = await users.createUser(input); if (role === "doctor" && input.active && !created.doctorId) throw new ValidationError("Selecione o médico correspondente para ativar este acesso clínico."); await writeAudit(actor.id, "user.created", "user", created.id, { role: input.role, doctorLinked: Boolean(created.doctorId), usernameConfigured: Boolean(input.username) }, `${actor.name} autorizou um novo usuário com perfil ${input.role}.`); return created.id; }
export async function update(actor: Actor, id: string, payload: Record<string, unknown>) {
  assertPermission(actor, "users.manage");
  const before = await users.getUser(id);
  const role = payload.role === undefined ? undefined : roleValue(payload.role);
  const active = typeof payload.active === "boolean" ? payload.active : undefined;
  if (actor.id === id && active === false) throw new ValidationError("Você não pode desativar o próprio acesso.");
  if (before.role === "admin" && before.active && ((role && role !== "admin") || active === false) && await users.countActiveAdmins() <= 1) throw new ValidationError("Mantenha pelo menos um administrador ativo no sistema.");
  const name = payload.name === undefined ? undefined : required(payload.name, "Nome");
  const email = payload.email === undefined ? undefined : validEmail(payload.email);
  const username = payload.username === undefined ? undefined : usernameValue(payload.username);
  if (actor.id === id && email && email !== before.email) throw new ValidationError("Peça a outro administrador para alterar seu e-mail de acesso, evitando bloquear a própria conta.");
  const effectiveRole = role ?? before.role; const effectiveActive = active ?? before.active;
  const doctorId = payload.doctorId === undefined ? undefined : (textValue(payload.doctorId) || null);
  const linkedDoctorId = await users.updateUser(id, { name, email, username, role, active, doctorId });
  if (effectiveRole === "doctor" && effectiveActive && !linkedDoctorId) throw new ValidationError("Selecione o médico correspondente para manter este acesso clínico ativo.");
  const changes: string[] = [];
  if (role && role !== before.role) changes.push(`perfil de ${before.role} para ${role}`);
  if (active !== undefined && active !== before.active) changes.push(active ? "acesso reativado" : "acesso revogado");
  if (name && name !== before.name) changes.push("nome atualizado");
  if (email && email !== before.email) changes.push("e-mail de acesso atualizado");
  if (username !== undefined && username !== before.username) changes.push(username ? "nome de usuário atualizado" : "nome de usuário removido");
  if (linkedDoctorId !== before.doctorId) changes.push(linkedDoctorId ? "vínculo médico atualizado" : "vínculo médico removido");
  if (active === false || (email && email !== before.email)) await revokeUserSessions(id, active === false ? "user_deactivated" : "login_identifier_changed");
  await writeAudit(actor.id, active === false ? "user.deactivated" : "user.updated", "user", id, { changedFields: changes }, `${actor.name} alterou o usuário ${before.name}: ${changes.join(", ") || "dados revisados"}.`);
}

export async function remove(actor: Actor, id: string) {
  assertPermission(actor, "users.manage");
  if (actor.id === id) throw new ValidationError("Você não pode excluir o próprio usuário.");
  const target = await users.getUser(id);
  if (target.role === "admin" && target.active && await users.countActiveAdmins() <= 1) throw new ValidationError("Mantenha pelo menos um administrador ativo no sistema.");
  const dependencies = await users.userDependencies(id);
  if (Object.values(dependencies).some((total) => total > 0)) throw new ValidationError("Este usuário possui vínculos ou histórico. Revogue o acesso para preservar a rastreabilidade.");
  if (target.active) throw new ValidationError("Desative o usuário antes de excluí-lo.");
  await users.deleteUser(id);
  await writeAudit(actor.id, "user.deleted", "user", id, {}, `${actor.name} removeu um usuário sem histórico associado.`);
}
