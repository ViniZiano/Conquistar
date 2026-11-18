import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import { update } from "@/lib/services/profile-service";

export async function PATCH(request: Request) {
  try { const actor = await requireActor(request); await update(actor, await request.json()); return privateJson({ ok: true }); }
  catch (error) { return errorResponse(error); }
}
