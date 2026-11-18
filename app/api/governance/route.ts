import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import * as service from "@/lib/services/governance-service";

export async function GET() { try { const actor = await requireActor(); return privateJson({ controls: await service.list(actor) }); } catch (error) { return errorResponse(error); } }
export async function PATCH(request: Request) { try { const actor = await requireActor(request); const payload = await request.json() as Record<string, unknown>; await service.update(actor, String(payload.key ?? ""), payload); return privateJson({ ok: true }); } catch (error) { return errorResponse(error); } }
