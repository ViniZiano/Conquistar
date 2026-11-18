import { env } from "cloudflare:workers";
import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson, ValidationError } from "@/lib/http/errors";
import { updateAvatar } from "@/lib/repositories/user-repository";
import { writeAudit } from "@/lib/repositories/audit-repository";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
function bucket() { if (!env.FILES) throw new Error("O armazenamento de imagens não está disponível."); return env.FILES; }

export async function GET() {
  try {
    const actor = await requireActor();
    if (!actor.avatarKey) return new Response(null, { status: 404 });
    const object = await bucket().get(actor.avatarKey);
    if (!object) return new Response(null, { status: 404 });
    const headers = new Headers({ "cache-control": "private, max-age=300", etag: object.httpEtag });
    object.writeHttpMetadata(headers);
    return new Response(object.body, { headers });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request); const form = await request.formData(); const file = form.get("photo");
    if (!(file instanceof File)) throw new ValidationError("Selecione uma imagem.");
    if (!allowed.has(file.type)) throw new ValidationError("Use uma imagem JPG, PNG ou WebP.");
    if (file.size > 2 * 1024 * 1024) throw new ValidationError("A foto deve ter no máximo 2 MB.");
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const key = `profiles/${actor.id}/${crypto.randomUUID()}.${extension}`;
    await bucket().put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    if (actor.avatarKey) await bucket().delete(actor.avatarKey);
    await updateAvatar(actor.id, key);
    await writeAudit(actor.id, "profile.photo.updated", "user", actor.id, {}, `${actor.name} atualizou sua foto de perfil.`);
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireActor(request);
    if (actor.avatarKey) await bucket().delete(actor.avatarKey);
    await updateAvatar(actor.id, null);
    await writeAudit(actor.id, "profile.photo.removed", "user", actor.id, {}, `${actor.name} removeu sua foto de perfil.`);
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}
