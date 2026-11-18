import { requireActor } from "@/lib/auth/actor";
import { errorResponse, privateJson } from "@/lib/http/errors";
import { search } from "@/lib/services/cid-service";

export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const params = new URL(request.url).searchParams;
    return privateJson({
      results: await search(actor, params.get("q"), params.get("limit")),
      classification: { name: "CID-10", version: "DATASUS V2008", source: "DATASUS/CBCD" },
    });
  } catch (error) { return errorResponse(error); }
}
