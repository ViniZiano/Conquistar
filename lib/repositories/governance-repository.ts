import { getRawDb } from "@/db";
import { NotFoundError } from "@/lib/http/errors";
import type { GovernanceStatus } from "@/lib/domain/types";

const select = `SELECT key, title, description, status, responsible, notes, evidence_reference AS evidenceReference,
  reviewed_at AS reviewedAt, updated_at AS updatedAt FROM governance_controls`;

export async function listGovernanceControls() {
  const result = await getRawDb().prepare(`${select} ORDER BY CASE key WHEN 'clinical_attachments' THEN 1 WHEN 'cid_structured' THEN 2 ELSE 3 END, title`).all();
  return result.results;
}

export async function updateGovernanceControl(key: string, userId: string, input: { status: GovernanceStatus; responsible: string; notes: string; evidenceReference: string }) {
  const result = await getRawDb().prepare(`UPDATE governance_controls SET status = ?, responsible = ?, notes = ?, evidence_reference = ?,
    reviewed_at = CASE WHEN ? = 'complete' THEN CURRENT_TIMESTAMP ELSE NULL END, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`)
    .bind(input.status, input.responsible, input.notes, input.evidenceReference, input.status, userId, key).run() as { meta?: { changes?: number } };
  if ((result.meta?.changes ?? 0) !== 1) throw new NotFoundError("Controle de governança não encontrado.");
}
