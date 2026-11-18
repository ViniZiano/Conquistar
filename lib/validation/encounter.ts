import { ValidationError } from "@/lib/http/errors";
import { required, textValue } from "./common";
import type { DiagnosisInput, DiagnosisType, ExamInput, MedicationInput, PresentedExamInput } from "@/lib/domain/types";
export function validateEncounter(input: Record<string, unknown>) {
  const medications = Array.isArray(input.medications) ? input.medications.map((item) => item as MedicationInput).filter((item) => item.medication?.trim()) : [];
  const exams = Array.isArray(input.exams) ? input.exams.map((item) => item as ExamInput).filter((item) => item.examName?.trim()) : [];
  const presentedExams = Array.isArray(input.presentedExams) ? input.presentedExams.map((item) => item as PresentedExamInput).filter((item) => item.examName?.trim()) : [];
  const occurredAt = required(input.occurredAt, "Data e hora"); if (new Date(occurredAt) > new Date()) throw new ValidationError("O atendimento não pode estar no futuro.");
  const diagnosisCode = textValue(input.diagnosisCode).toUpperCase();
  if (diagnosisCode && !/^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?$/.test(diagnosisCode)) throw new ValidationError("Informe um código CID válido, como J06.9.");
  const allowedDiagnosisTypes = new Set<DiagnosisType>(["hypothesis", "confirmed", "preexisting", "other"]);
  const diagnoses = Array.isArray(input.diagnoses) ? input.diagnoses.map((item) => item as DiagnosisInput).filter((item) => item?.cidId) : [];
  if (diagnoses.length > 12) throw new ValidationError("Adicione no máximo 12 diagnósticos por atendimento.");
  if (new Set(diagnoses.map((item) => item.cidId)).size !== diagnoses.length) throw new ValidationError("O mesmo CID não pode ser adicionado duas vezes.");
  for (const item of diagnoses) {
    if (!/^cid10-datasus-v2008-[a-z][0-9]{2}[0-9a-z]?$/.test(item.cidId) || !allowedDiagnosisTypes.has(item.type)) throw new ValidationError("Selecione diagnósticos válidos no catálogo CID.");
  }
  return {
    doctorId: required(input.doctorId, "Médico"), occurredAt, consultationType: required(input.consultationType, "Tipo de consulta"),
    chiefComplaint: textValue(input.chiefComplaint), problemHistory: textValue(input.problemHistory), symptoms: textValue(input.symptoms),
    relevantHistory: textValue(input.relevantHistory), allergies: textValue(input.allergies), clinicalNotes: textValue(input.clinicalNotes),
    evolution: required(input.evolution, "Evolução médica"), diagnosticHypothesis: textValue(input.diagnosticHypothesis),
    diagnosis: textValue(input.diagnosis), diagnosisNotes: textValue(input.diagnosisNotes), diagnosisCode, diagnosisDescription: textValue(input.diagnosisDescription), conduct: textValue(input.conduct),
    patientGuidance: textValue(input.patientGuidance), notes: textValue(input.notes), diagnoses, medications, exams, presentedExams,
  };
}
