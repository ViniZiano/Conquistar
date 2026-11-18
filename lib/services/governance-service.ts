import type { Actor, GovernanceStatus } from "@/lib/domain/types";
import { assertPermission } from "@/lib/auth/permissions";
import { ValidationError } from "@/lib/http/errors";
import { textValue } from "@/lib/validation/common";
import { listGovernanceControls, updateGovernanceControl } from "@/lib/repositories/governance-repository";
import { writeAudit } from "@/lib/repositories/audit-repository";

const statuses = new Set<GovernanceStatus>(["pending", "in_progress", "complete", "not_applicable"]);
export async function list(actor: Actor) { assertPermission(actor, "audit.read"); return listGovernanceControls(); }
export async function update(actor: Actor, key: string, payload: Record<string, unknown>) {
  assertPermission(actor, "users.manage"); const status = textValue(payload.status) as GovernanceStatus;
  if (!statuses.has(status)) throw new ValidationError("Status de governança inválido.");
  const input = { status, responsible: textValue(payload.responsible).slice(0, 120), notes: textValue(payload.notes).slice(0, 1500), evidenceReference: textValue(payload.evidenceReference).slice(0, 500) };
  if (status === "complete" && (!input.responsible || !input.evidenceReference)) throw new ValidationError("Para concluir, informe o responsável e a referência da evidência.");
  await updateGovernanceControl(key, actor.id, input);
  await writeAudit(actor.id, "governance.updated", "governance_control", key, { status }, `${actor.name} atualizou um controle de governança para ${status}.`);
}
