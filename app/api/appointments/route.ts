import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import * as service from "@/lib/services/agenda-service";
export async function GET(request: Request) { try { const actor = await requireActor(); const params = new URL(request.url).searchParams; return privateJson({ appointments: await service.list(actor, params.get("from") ?? undefined, params.get("to") ?? undefined) }); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const actor = await requireActor(request); const id = await service.create(actor, await request.json()); return privateJson({ id }, { status: 201 }); } catch (error) { return errorResponse(error); } }
