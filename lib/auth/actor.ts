import { getChatGPTUser } from "@/app/chatgpt-auth";
import { AccessError } from "./permissions";
import { AuthenticationError } from "@/lib/http/errors";
import { resolveActor } from "@/lib/repositories/user-repository";
import { assertTrustedMutation, readSessionActor } from "@/lib/auth/session";

export async function requireActor(request?: Request, options: { allowPasswordChange?: boolean } = {}) {
  try {
    const session = await readSessionActor(request);
    if (session) {
      if (request) assertTrustedMutation(request);
      if (session.actor.mustChangePassword && !options.allowPasswordChange) throw new AuthenticationError("Atualize sua senha temporária para continuar.");
      return session.actor;
    }
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new AccessError(error instanceof Error ? error.message : "Acesso não autorizado.");
  }
  // Platform identity is kept only as a local development compatibility path.
  // Production users must present their own Conquistar session; legacy identity
  // is accepted only by the explicit /ativar-acesso flow.
  if (process.env.NODE_ENV === "production") throw new AuthenticationError("Faça login no Conquistar para continuar.");
  const identity = await getChatGPTUser();
  if (!identity) throw new AuthenticationError("Faça login para continuar.");
  try { return await resolveActor(identity); }
  catch (error) { throw new AccessError(error instanceof Error ? error.message : "Acesso não autorizado."); }
}

export async function getOptionalSessionActor() {
  try { return (await readSessionActor())?.actor ?? null; }
  catch { return null; }
}
