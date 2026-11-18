import type { Actor } from "@/lib/domain/types";
import { assertPermission, can } from "@/lib/auth/permissions";
import { ValidationError } from "@/lib/http/errors";
import { validatePatient } from "@/lib/validation/patient";
import * as patients from "@/lib/repositories/patient-repository";
import { writeAudit } from "@/lib/repositories/audit-repository";

export async function list(actor: Actor, query = "") { assertPermission(actor, "patients.read"); return patients.listPatients(query); }
export async function get(actor: Actor, id: string) { assertPermission(actor, "patients.read"); return patients.getPatient(id); }
export async function create(actor: Actor, payload: Record<string, unknown>) { assertPermission(actor, "patients.write"); const input = validatePatient(payload); if (!can(actor, "patients.manageStatus")) input.active = true; const created = await patients.createPatient(input); await writeAudit(actor.id, "patient.created", "patient", created.id, {}, `${actor.name} cadastrou o paciente ${created.id.slice(0, 8).toUpperCase()}.`); return created; }
export async function update(actor: Actor, id: string, payload: Record<string, unknown>) { assertPermission(actor, "patients.write"); const before = await patients.getPatient(id) as { active: boolean }; const input = validatePatient(payload); if (!can(actor, "patients.manageStatus")) input.active = before.active; await patients.updatePatient(id, input); const statusChanged = before.active !== input.active; await writeAudit(actor.id, statusChanged && !input.active ? "patient.archived" : "patient.updated", "patient", id, { statusChanged }, `${actor.name} ${statusChanged ? (input.active ? "reativou" : "arquivou") : "atualizou os dados cadastrais do"} paciente ${id.slice(0, 8).toUpperCase()}.`); }

export async function remove(actor: Actor, id: string) {
  assertPermission(actor, "patients.manageStatus");
  const patient = await patients.getPatient(id) as { active: boolean };
  if (patient.active) throw new ValidationError("Arquive o paciente antes de solicitar a exclusão.");
  if (await patients.patientEncounterCount(id) > 0) throw new ValidationError("Este paciente possui histórico clínico e não pode ser excluído. O cadastro permanecerá arquivado.");
  await patients.deletePatient(id);
  await writeAudit(actor.id, "patient.deleted", "patient", id, {}, `${actor.name} removeu um cadastro de paciente sem histórico clínico.`);
}
