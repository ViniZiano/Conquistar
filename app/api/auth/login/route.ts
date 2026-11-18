import { errorResponse, privateJson } from "@/lib/http/errors";
import { login } from "@/lib/services/auth-service";

export async function POST(request: Request) {
  try {
    const result = await login(request, await request.json());
    return privateJson({ next: result.next }, { headers: { "set-cookie": result.cookie } });
  } catch (error) { return errorResponse(error); }
}
