import { getRawDb } from "@/db";
import { NotFoundError } from "@/lib/http/errors";
import type { DiagnosisInput, ExamInput, MedicationInput, PresentedExamInput } from "@/lib/domain/types";

export async function listEncounters(patientId: string) {
  const result = await getRawDb().prepare(`SELECT e.id, e.occurred_at AS occurredAt, e.created_at AS createdAt, e.consultation_type AS consultationType, e.chief_complaint AS chiefComplaint, e.problem_history AS problemHistory, e.symptoms, e.relevant_history AS relevantHistory, e.allergies, e.clinical_notes AS clinicalNotes, e.evolution, e.diagnostic_hypothesis AS diagnosticHypothesis, e.diagnosis, e.diagnosis_notes AS diagnosisNotes, e.diagnosis_code AS diagnosisCode, e.diagnosis_description AS diagnosisDescription, e.conduct, e.patient_guidance AS patientGuidance, e.notes, e.version, e.author_user_id AS authorUserId, d.id AS doctorId, d.name AS doctorName, d.crm, COALESCE(NULLIF(e.doctor_specialty, ''), d.specialty) AS specialty, u.name AS authorName FROM encounters e JOIN doctors d ON d.id = e.doctor_id JOIN users u ON u.id = e.author_user_id WHERE e.patient_id = ? AND e.status = 'active' ORDER BY e.occurred_at DESC, e.created_at DESC`).bind(patientId).all<Record<string, unknown>>();
  return Promise.all(result.results.map(async (encounter) => {
    const [diagnoses, medications, exams, presentedExams] = await Promise.all([
      getRawDb().prepare(`SELECT ed.id, ed.cid_id AS cidId, ed.type, c.code, c.description, c.category, c.version FROM encounter_diagnoses ed JOIN cid_codes c ON c.id = ed.cid_id WHERE ed.encounter_id = ? ORDER BY c.code`).bind(encounter.id).all(),
      getRawDb().prepare(`SELECT m.id, m.medication, m.dosage, m.administration_route AS administrationRoute, m.frequency, m.duration, m.instructions FROM prescription_medications m JOIN prescriptions p ON p.id = m.prescription_id WHERE p.encounter_id = ?`).bind(encounter.id).all(),
      getRawDb().prepare("SELECT id, exam_name AS examName, category, priority, notes FROM exam_requests WHERE encounter_id = ?").bind(encounter.id).all(),
      getRawDb().prepare("SELECT id, exam_name AS examName, performed_at AS performedAt, laboratory, result_summary AS resultSummary, medical_notes AS medicalNotes, attachment_name AS attachmentName, attachment_type AS attachmentType, attachment_size AS attachmentSize, attachment_sha256 AS attachmentSha256, attachment_scan_status AS attachmentScanStatus, attachment_created_at AS attachmentCreatedAt FROM presented_exams WHERE encounter_id = ?").bind(encounter.id).all(),
    ]);
    return { ...encounter, diagnoses: diagnoses.results, medications: medications.results, exams: exams.results, presentedExams: presentedExams.results };
  }));
}

export async function createEncounter(patientId: string, userId: string, input: { doctorId: string; doctorSpecialty: string; occurredAt: string; consultationType: string; chiefComplaint: string; problemHistory: string; symptoms: string; relevantHistory: string; allergies: string; clinicalNotes: string; evolution: string; diagnosticHypothesis: string; diagnosis: string; diagnosisNotes: string; diagnosisCode: string; diagnosisDescription: string; conduct: string; patientGuidance: string; notes: string; diagnoses: DiagnosisInput[]; medications: MedicationInput[]; exams: ExamInput[]; presentedExams: PresentedExamInput[] }) {
  const record = await getRawDb().prepare("SELECT id FROM medical_records WHERE patient_id = ?").bind(patientId).first<{ id: string }>();
  if (!record) throw new NotFoundError("Prontuário não encontrado.");
  const encounterId = crypto.randomUUID(); const prescriptionId = crypto.randomUUID();
  const statements = [getRawDb().prepare(`INSERT INTO encounters (id, medical_record_id, patient_id, doctor_id, author_user_id, occurred_at, consultation_type, doctor_specialty, chief_complaint, problem_history, symptoms, relevant_history, allergies, clinical_notes, evolution, diagnostic_hypothesis, diagnosis, diagnosis_notes, diagnosis_code, diagnosis_description, conduct, patient_guidance, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(encounterId, record.id, patientId, input.doctorId, userId, input.occurredAt, input.consultationType, input.doctorSpecialty, input.chiefComplaint, input.problemHistory, input.symptoms, input.relevantHistory, input.allergies, input.clinicalNotes, input.evolution, input.diagnosticHypothesis, input.diagnosis, input.diagnosisNotes, input.diagnosisCode, input.diagnosisDescription, input.conduct, input.patientGuidance, input.notes)];
  for (const diagnosis of input.diagnoses) statements.push(getRawDb().prepare("INSERT INTO encounter_diagnoses (id, encounter_id, cid_id, type) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), encounterId, diagnosis.cidId, diagnosis.type));
  if (input.medications.length) {
    statements.push(getRawDb().prepare("INSERT INTO prescriptions (id, encounter_id) VALUES (?, ?)").bind(prescriptionId, encounterId));
    for (const medication of input.medications) statements.push(getRawDb().prepare("INSERT INTO prescription_medications (id, prescription_id, medication, dosage, administration_route, frequency, duration, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), prescriptionId, medication.medication.trim(), medication.dosage?.trim() ?? "", medication.administrationRoute?.trim() ?? "", medication.frequency?.trim() ?? "", medication.duration?.trim() ?? "", medication.instructions?.trim() ?? ""));
  }
  for (const exam of input.exams) statements.push(getRawDb().prepare("INSERT INTO exam_requests (id, encounter_id, exam_name, category, priority, notes) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), encounterId, exam.examName.trim(), exam.category?.trim() ?? "", exam.priority?.trim() || "Rotina", exam.notes?.trim() ?? ""));
  for (const exam of input.presentedExams) statements.push(getRawDb().prepare("INSERT INTO presented_exams (id, encounter_id, exam_name, performed_at, laboratory, result_summary, medical_notes) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), encounterId, exam.examName.trim(), exam.performedAt?.trim() ?? "", exam.laboratory?.trim() ?? "", exam.resultSummary?.trim() ?? "", exam.medicalNotes?.trim() ?? ""));
  await getRawDb().batch(statements);
  return encounterId;
}

export async function getEncounterForCancellation(id: string) {
  return getRawDb().prepare("SELECT id, patient_id AS patientId, doctor_id AS doctorId, author_user_id AS authorUserId, status FROM encounters WHERE id = ?").bind(id).first<{ id: string; patientId: string; doctorId: string; authorUserId: string; status: string }>();
}

export async function cancelEncounter(id: string, userId: string, doctorId: string, reason: string) {
  return getRawDb().prepare("UPDATE encounters SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancelled_by_user_id = ?, cancellation_reason = ? WHERE id = ? AND status = 'active' AND author_user_id = ? AND doctor_id = ?")
    .bind(userId, reason, id, userId, doctorId).run();
}
