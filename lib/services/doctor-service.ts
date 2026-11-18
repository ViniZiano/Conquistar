import type { Actor } from "@/lib/domain/types";
import { assertPermission } from "@/lib/auth/permissions";
import { validateDoctor } from "@/lib/validation/doctor";
import * as doctors from "@/lib/repositories/doctor-repository";
import { writeAudit } from "@/lib/repositories/audit-repository";
import { ValidationError } from "@/lib/http/errors";

export async function list(actor: Actor, query = "") { assertPermission(actor, "doctors.read"); return doctors.listDoctors(query); }
export async function create(actor: Actor, payload: Record<string, unknown>) { assertPermission(actor, "doctors.manage"); const input = validateDoctor(payload); const id = await doctors.createDoctor(input); await writeAudit(actor.id, "doctor.created", "doctor", id, { crm: input.crm }, `${actor.name} cadastrou ${input.name} (${input.crm}).`); return id; }
export async function update(actor: Actor, id: string, payload: Record<string, unknown>) { assertPermission(actor, "doctors.manage"); const before = await doctors.getDoctor(id) as { active: boolean; name: string; crm: string }; const input = validateDoctor(payload); await doctors.updateDoctor(id, input); const statusChanged = before.active !== input.active; await writeAudit(actor.id, statusChanged && !input.active ? "doctor.deactivated" : "doctor.updated", "doctor", id, { statusChanged, crm: input.crm }, `${actor.name} ${statusChanged ? (input.active ? "reativou" : "desativou") : "atualizou"} ${before.name} (${before.crm}).`); }

export async function remove(actor: Actor, id: string) {
  assertPermission(actor, "doctors.manage");
  const doctor = await doctors.getDoctor(id) as { active: boolean; name: string };
  if (doctor.active) throw new ValidationError("Desative o médico antes de solicitar a exclusão.");
  const dependencies = await doctors.doctorDependencies(id);
  if (Object.values(dependencies).some((total) => total > 0)) throw new ValidationError("Este médico possui atendimentos ou compromissos e deve permanecer desativado para preservar o histórico.");
  await doctors.deleteDoctor(id);
  await writeAudit(actor.id, "doctor.deleted", "doctor", id, {}, `${actor.name} removeu o cadastro de ${doctor.name}, que não possuía histórico associado.`);
}
