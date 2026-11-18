import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import * as service from "@/lib/services/clinical-service";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requireActor(); const { id } = await context.params; return privateJson({ encounters: await service.history(actor, id) }); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requireActor(request); const { id } = await context.params; const encounterId = await service.create(actor, id, await request.json()); return privateJson({ encounterId }, { status: 201 }); } catch (error) { return errorResponse(error); } }
