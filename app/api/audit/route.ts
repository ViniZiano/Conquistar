import { requireActor } from "@/lib/auth/actor";
import { assertPermission } from "@/lib/auth/permissions";
import { errorResponse, privateJson } from "@/lib/http/errors";
import { listAudit } from "@/lib/repositories/audit-repository";
export async function GET(request: Request) { try { const actor = await requireActor(); assertPermission(actor, "audit.read"); const params = new URL(request.url).searchParams; return privateJson({ logs: await listAudit({ from: params.get("from") ?? undefined, to: params.get("to") ?? undefined, userId: params.get("userId") ?? undefined, action: params.get("action") ?? undefined, entityType: params.get("entityType") ?? undefined }) }); } catch (error) { return errorResponse(error); } }
