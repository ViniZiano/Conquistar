import { getRawDb } from "@/db";
import { ConflictError, NotFoundError } from "@/lib/http/errors";

export type ClinicalAttachmentRow = {
  id: string; encounterId: string; patientId: string; examName: string; attachmentKey: string | null;
  attachmentName: string | null; attachmentType: string | null; attachmentSize: number | null;
  attachmentSha256: string | null; attachmentScanStatus: string | null; attachmentCreatedAt: string | null;
};

export async function getClinicalAttachment(examId: string) {
  const row = await getRawDb().prepare(`SELECT p.id, p.encounter_id AS encounterId, e.patient_id AS patientId, p.exam_name AS examName,
    p.attachment_key AS attachmentKey, p.attachment_name AS attachmentName, p.attachment_type AS attachmentType,
    p.attachment_size AS attachmentSize, p.attachment_sha256 AS attachmentSha256,
    p.attachment_scan_status AS attachmentScanStatus, p.attachment_created_at AS attachmentCreatedAt
    FROM presented_exams p JOIN encounters e ON e.id = p.encounter_id WHERE p.id = ?`).bind(examId).first<ClinicalAttachmentRow>();
  if (!row) throw new NotFoundError("Exame apresentado não encontrado.");
  return row;
}

export async function attachClinicalFile(examId: string, userId: string, input: { key: string; name: string; type: string; size: number; sha256: string; scanStatus: string }) {
  const result = await getRawDb().prepare(`UPDATE presented_exams SET attachment_key = ?, attachment_name = ?, attachment_type = ?, attachment_size = ?,
    attachment_sha256 = ?, attachment_scan_status = ?, attachment_created_at = CURRENT_TIMESTAMP, attachment_uploaded_by_user_id = ?
    WHERE id = ? AND attachment_key IS NULL`).bind(input.key, input.name, input.type, input.size, input.sha256, input.scanStatus, userId, examId).run() as { meta?: { changes?: number } };
  if ((result.meta?.changes ?? 0) !== 1) throw new ConflictError("Este exame já possui um anexo preservado.");
}
