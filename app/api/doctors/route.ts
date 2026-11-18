import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import * as service from "@/lib/services/doctor-service";
export async function GET(request: Request) { try { const actor = await requireActor(); const query = new URL(request.url).searchParams.get("q") ?? ""; return privateJson({ doctors: await service.list(actor, query) }); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const actor = await requireActor(request); const id = await service.create(actor, await request.json()); return privateJson({ id }, { status: 201 }); } catch (error) { return errorResponse(error); } }
