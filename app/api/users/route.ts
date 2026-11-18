import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import * as service from "@/lib/services/user-service";
export async function GET() { try { const actor = await requireActor(); return privateJson({ users: await service.list(actor) }); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const actor = await requireActor(request); const id = await service.create(actor, await request.json()); return privateJson({ id }, { status: 201 }); } catch (error) { return errorResponse(error); } }
