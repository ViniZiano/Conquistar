import type { Actor } from "@/lib/domain/types";
import { AccessError, assertPermission } from "@/lib/auth/permissions";
import { validateEncounter } from "@/lib/validation/encounter";
import { getPatient } from "@/lib/repositories/patient-repository";
import { getDoctor } from "@/lib/repositories/doctor-repository";
import { cancelEncounter, createEncounter, getEncounterForCancellation, listEncounters } from "@/lib/repositories/clinical-repository";
import { writeAudit } from "@/lib/repositories/audit-repository";
import { getActiveCidCodes } from "@/lib/repositories/cid-repository";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/http/errors";

export async function history(actor: Actor, patientId: string) {
  assertPermission(actor, "clinical.read"); await getPatient(patientId);
  const result = (await listEncounters(patientId)).map((item) => {
    const encounter = item as typeof item & { authorUserId: string; doctorId: string };
    const { authorUserId, ...safe } = encounter;
    return { ...safe, canCancel: actor.role === "doctor" && Boolean(actor.doctorId) && actor.id === authorUserId && actor.doctorId === encounter.doctorId };
  });
  await writeAudit(actor.id, "medical_record.viewed", "patient", patientId, {}, `${actor.name} acessou o prontuário do paciente ${patientId.slice(0, 8).toUpperCase()}.`); return result;
}

export async function create(actor: Actor, patientId: string, payload: Record<string, unknown>) {
  assertPermission(actor, "clinical.write"); const input = validateEncounter(payload);
  if (actor.role === "doctor" && actor.doctorId !== input.doctorId) throw new AccessError("O atendimento deve ser registrado pelo médico responsável.");
  await getPatient(patientId); const doctor = await getDoctor(input.doctorId) as { active: boolean; name: string; specialty: string };
  if (!doctor.active) throw new AccessError("O médico responsável está inativo.");
  const catalogEntries = await getActiveCidCodes(input.diagnoses.map((item) => item.cidId));
  if (catalogEntries.length !== input.diagnoses.length) throw new ValidationError("Um ou mais diagnósticos não pertencem ao catálogo CID oficial ativo.");
  const id = await createEncounter(patientId, actor.id, { ...input, doctorSpecialty: doctor.specialty });
  await writeAudit(actor.id, "encounter.created", "encounter", id, { patientId, doctorId: input.doctorId, consultationType: input.consultationType, diagnosisCount: input.diagnoses.length, presentedExamCount: input.presentedExams.length, requestedExamCount: input.exams.length, medicationCount: input.medications.length }, `${actor.name} finalizou um atendimento para o paciente ${patientId.slice(0, 8).toUpperCase()}.`); return id;
}

export async function cancel(actor: Actor, encounterId: string, payload: Record<string, unknown>) {
  assertPermission(actor, "clinical.write");
  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  if (!reason) throw new ValidationError("Informe o motivo da remoção do atendimento.");
  if (reason.length < 5 || reason.length > 500) throw new ValidationError("O motivo deve ter entre 5 e 500 caracteres.");
  const encounter = await getEncounterForCancellation(encounterId);
  if (!encounter) throw new NotFoundError("Atendimento não encontrado.");
  if (actor.role !== "doctor" || !actor.doctorId || encounter.authorUserId !== actor.id || encounter.doctorId !== actor.doctorId) throw new AccessError("Sem permissão para remover este atendimento.");
  if (encounter.status === "cancelled") throw new ConflictError("Este atendimento já foi cancelado.");
  const result = await cancelEncounter(encounterId, actor.id, actor.doctorId, reason) as { meta: { changes: number } };
  if (result.meta.changes !== 1) throw new ConflictError("O atendimento não está mais disponível para cancelamento.");
  await writeAudit(actor.id, "encounter.cancelled", "encounter", encounterId, { patientId: encounter.patientId, doctorId: encounter.doctorId, reason }, `${actor.name} cancelou um atendimento de sua autoria. Motivo: ${reason}`);
}
