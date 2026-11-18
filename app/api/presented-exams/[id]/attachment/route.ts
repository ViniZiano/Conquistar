import { env } from "cloudflare:workers";
import { requireActor } from "@/lib/auth/actor";
import { assertPermission } from "@/lib/auth/permissions";
import { errorResponse, privateJson, ConflictError, NotFoundError, ValidationError } from "@/lib/http/errors";
import { attachClinicalFile, getClinicalAttachment } from "@/lib/repositories/attachment-repository";
import { writeAudit } from "@/lib/repositories/audit-repository";

const maxBytes = 10 * 1024 * 1024;
const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
function bucket() { if (!env.FILES) throw new Error("O armazenamento de anexos não está disponível."); return env.FILES; }
function isExpectedFile(bytes: Uint8Array, type: string) {
  if (type === "application/pdf") return bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (type === "image/png") return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value);
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}
function passesThreatScreen(bytes: Uint8Array, type: string) {
  const content = new TextDecoder("latin1").decode(bytes);
  if (content.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")) return false;
  if (type === "application/pdf" && /\/(JavaScript|JS|OpenAction|Launch|EmbeddedFile)\b/i.test(content)) return false;
  return true;
}
function extension(type: string) { return ({ "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[type]; }
function safeName(name: string, type: string) { const stem = name.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}._ -]+/gu, "_").trim().slice(0, 100) || "exame"; return `${stem}.${extension(type)}`; }

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(); assertPermission(actor, "clinical.read"); const { id } = await context.params;
    const attachment = await getClinicalAttachment(id);
    if (!attachment.attachmentKey || attachment.attachmentScanStatus !== "passed") throw new NotFoundError("Este exame não possui anexo disponível.");
    const object = await bucket().get(attachment.attachmentKey); if (!object) throw new NotFoundError("O arquivo anexado não foi encontrado.");
    await writeAudit(actor.id, "clinical_attachment.viewed", "presented_exam", id, { patientId: attachment.patientId }, `${actor.name} acessou um anexo clínico protegido.`);
    const headers = new Headers({ "cache-control": "private, no-store", "content-type": attachment.attachmentType || "application/octet-stream", "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.attachmentName || "exame")}`, "x-content-type-options": "nosniff" });
    return new Response(object.body, { headers });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let uploadedKey = "";
  try {
    const actor = await requireActor(request); assertPermission(actor, "clinical.write"); const { id } = await context.params;
    const attachment = await getClinicalAttachment(id); if (attachment.attachmentKey) throw new ConflictError("Este exame já possui um anexo preservado.");
    const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) throw new ValidationError("Selecione um arquivo.");
    if (!allowed.has(file.type)) throw new ValidationError("Envie PDF, JPG, PNG ou WebP.");
    if (!file.size || file.size > maxBytes) throw new ValidationError("O anexo deve ter entre 1 byte e 10 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isExpectedFile(bytes, file.type)) throw new ValidationError("O conteúdo do arquivo não corresponde ao formato informado.");
    if (!passesThreatScreen(bytes, file.type)) throw new ValidationError("O arquivo foi bloqueado pela triagem de segurança.");
    const digest = await crypto.subtle.digest("SHA-256", bytes); const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const name = safeName(file.name, file.type); uploadedKey = `clinical/${attachment.patientId}/${attachment.encounterId}/${id}/${crypto.randomUUID()}.${extension(file.type)}`;
    await bucket().put(uploadedKey, bytes, { httpMetadata: { contentType: file.type, cacheControl: "private, no-store" }, customMetadata: { sha256, scan: "conquistar-signature-v1" } });
    await attachClinicalFile(id, actor.id, { key: uploadedKey, name, type: file.type, size: file.size, sha256, scanStatus: "passed" });
    await writeAudit(actor.id, "clinical_attachment.uploaded", "presented_exam", id, { patientId: attachment.patientId, contentType: file.type, size: file.size, sha256: sha256.slice(0, 16), scan: "conquistar-signature-v1" }, `${actor.name} adicionou um anexo clínico protegido.`);
    return privateJson({ ok: true, attachment: { name, type: file.type, size: file.size, sha256, scanStatus: "passed" } }, { status: 201 });
  } catch (error) {
    if (uploadedKey) await bucket().delete(uploadedKey).catch(() => undefined);
    return errorResponse(error);
  }
}
