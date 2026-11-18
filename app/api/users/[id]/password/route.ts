import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import { setTemporaryPassword } from "@/lib/services/auth-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(request); const { id } = await context.params;
    await setTemporaryPassword(actor, id, await request.json());
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}
