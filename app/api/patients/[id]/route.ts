import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import * as service from "@/lib/services/patient-service";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requireActor(); const { id } = await context.params; return privateJson({ patient: await service.get(actor, id) }); } catch (error) { return errorResponse(error); } }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requireActor(request); const { id } = await context.params; await service.update(actor, id, await request.json()); return privateJson({ ok: true }); } catch (error) { return errorResponse(error); } }
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requireActor(request); const { id } = await context.params; await service.remove(actor, id); return privateJson({ ok: true }); } catch (error) { return errorResponse(error); } }
