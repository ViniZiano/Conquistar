import { errorResponse, privateJson } from "@/lib/http/errors";
import { changePassword } from "@/lib/services/auth-service";

export async function POST(request: Request) {
  try {
    const result = await changePassword(request, await request.json());
    return privateJson({ next: result.next }, { headers: { "set-cookie": result.cookie } });
  } catch (error) { return errorResponse(error); }
}
