import type { Actor } from "@/lib/domain/types";
import { AccessError, assertPermission } from "@/lib/auth/permissions";
import { ValidationError } from "@/lib/http/errors";
import { required, textValue } from "@/lib/validation/common";
import * as agenda from "@/lib/repositories/appointment-repository";
import { writeAudit } from "@/lib/repositories/audit-repository";

export async function list(actor: Actor, from?: string, to?: string) { assertPermission(actor, "agenda.read"); return agenda.listAppointments(from, to, actor.role === "doctor" ? actor.doctorId : null, actor.role === "doctor"); }
function validate(actor: Actor, payload: Record<string, unknown>): agenda.AppointmentInput {
  const scope = payload.scope === "global" ? "global" : "doctor";
  const doctorId = scope === "doctor" ? required(payload.doctorId, "Médico") : null;
  const type = required(payload.type, "Tipo");
  if (scope === "global" && actor.role !== "admin") throw new AccessError("Somente administradores podem criar ou alterar eventos para toda a clínica.");
  if (actor.role === "doctor" && doctorId !== actor.doctorId) throw new AccessError("Você só pode criar compromissos na própria agenda.");
  if (["Clínica fechada", "Feriado", "Recesso"].includes(type) && actor.role !== "admin") throw new AccessError("Somente administradores podem criar bloqueios gerais da clínica.");
  const startsAt = required(payload.startsAt, "Horário inicial"); const endsAt = required(payload.endsAt, "Horário final");
  if (new Date(endsAt) <= new Date(startsAt)) throw new ValidationError("O horário final deve ser posterior ao inicial.");
  return { doctorId, title: required(payload.title, "Título"), description: textValue(payload.description), startsAt, endsAt, type, scope, allDay: payload.allDay === true, reason: textValue(payload.reason), notes: textValue(payload.notes) };
}
async function assertCanManage(actor: Actor, id: string) {
  const current = await agenda.getAppointment(id) as { id: string; scope: string; doctorId: string | null; title: string } | null;
  if (!current) throw new ValidationError("Compromisso não encontrado.");
  if (current.scope === "global" && actor.role !== "admin") throw new AccessError("Somente administradores podem alterar eventos globais.");
  if (actor.role === "doctor" && current.doctorId !== actor.doctorId) throw new AccessError("Você só pode alterar compromissos da própria agenda.");
  return current;
}
export async function create(actor: Actor, payload: Record<string, unknown>) {
  assertPermission(actor, "agenda.write"); const input = validate(actor, payload);
  const id = await agenda.createAppointment(input, actor.id); await writeAudit(actor.id, "appointment.created", "appointment", id, { scope: input.scope, doctorId: input.doctorId, startsAt: input.startsAt, type: input.type }, input.scope === "global" ? `${actor.name} criou o evento geral '${input.title}' para a clínica.` : `${actor.name} criou o compromisso '${input.title}' na agenda médica.`); return id;
}
export async function update(actor: Actor, id: string, payload: Record<string, unknown>) { assertPermission(actor, "agenda.write"); const before = await assertCanManage(actor, id); const input = validate(actor, payload); await agenda.updateAppointment(id, input); await writeAudit(actor.id, "appointment.updated", "appointment", id, { scope: input.scope, doctorId: input.doctorId, startsAt: input.startsAt, type: input.type }, `${actor.name} atualizou o evento '${before.title}' da agenda.`); }
export async function remove(actor: Actor, id: string) { assertPermission(actor, "agenda.write"); const before = await assertCanManage(actor, id); await agenda.deleteAppointment(id); await writeAudit(actor.id, "appointment.deleted", "appointment", id, { scope: before.scope, doctorId: before.doctorId }, `${actor.name} excluiu o compromisso '${before.title}' da agenda.`); }
