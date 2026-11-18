import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { BrandLogo } from "@/components/BrandLogo";
import { CredentialForm } from "@/components/CredentialForm";
import { resolveActor } from "@/lib/repositories/user-repository";

export const dynamic = "force-dynamic";

export default async function ActivateAccessPage() {
  const identity = await requireChatGPTUser("/ativar-acesso");
  const access = await resolveActor(identity).then((actor) => ({ actor, error: null as unknown }), (error: unknown) => ({ actor: null, error }));
  if (!access.actor) return <main className="access-denied"><div className="clinic-symbol" aria-hidden="true">+</div><p className="eyebrow">Ativação protegida</p><h1>Conta não autorizada</h1><p>{access.error instanceof Error ? access.error.message : "Procure um administrador da clínica."}</p><a className="primary-action" href={chatGPTSignOutPath("/acesso")}>Voltar ao acesso <span>→</span></a></main>;
  return <main className="credential-shell"><section><BrandLogo /><p className="eyebrow">Migração segura de acesso</p><h1>Crie sua senha do Conquistar</h1><p>A identidade já validada de <strong>{access.actor.email}</strong> será vinculada às credenciais próprias, preservando seu perfil e o profissional associado.</p><CredentialForm endpoint="/api/auth/activate" submitLabel="Ativar meu acesso" /><small>Depois desta ativação, você poderá entrar diretamente no Conquistar sem repetir esta validação.</small></section></main>;
}
