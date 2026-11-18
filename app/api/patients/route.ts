import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import * as service from "@/lib/services/patient-service";

export async function GET(request: Request) { try { const actor = await requireActor(); const query = new URL(request.url).searchParams.get("q") ?? ""; return privateJson({ patients: await service.list(actor, query) }); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const actor = await requireActor(request); const created = await service.create(actor, await request.json()); return privateJson(created, { status: 201 }); } catch (error) { return errorResponse(error); } }
