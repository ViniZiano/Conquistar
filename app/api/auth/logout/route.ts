import { errorResponse, privateJson } from "@/lib/http/errors";
import { logout } from "@/lib/services/auth-service";

export async function POST(request: Request) {
  try {
    const result = await logout(request);
    return privateJson({ ok: true }, { headers: { "set-cookie": result.cookie } });
  } catch (error) { return errorResponse(error); }
}
