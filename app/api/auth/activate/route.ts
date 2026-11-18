import { getChatGPTUser } from "@/app/chatgpt-auth";
import { assertTrustedMutation } from "@/lib/auth/session";
import { AuthenticationError, errorResponse, privateJson } from "@/lib/http/errors";
import { activateLegacyIdentity } from "@/lib/services/auth-service";

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const identity = await getChatGPTUser();
    if (!identity) throw new AuthenticationError("Valide sua identidade atual para ativar o novo acesso.");
    const result = await activateLegacyIdentity(request, identity, await request.json());
    return privateJson({ next: result.next }, { headers: { "set-cookie": result.cookie } });
  } catch (error) { return errorResponse(error); }
}
