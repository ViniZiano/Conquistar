import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import { cancel } from "@/lib/services/clinical-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(request);
    const { id } = await context.params;
    await cancel(actor, id, await request.json());
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}
