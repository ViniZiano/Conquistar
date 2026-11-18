import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { CredentialForm } from "@/components/CredentialForm";
import { readSessionActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await readSessionActor().catch(() => null);
  if (!session) redirect("/acesso");
  return <main className="credential-shell"><section><BrandLogo /><p className="eyebrow">Segurança da conta</p><h1>{session.actor.mustChangePassword ? "Troque sua senha temporária" : "Alterar senha"}</h1><p>Confirme a senha atual e escolha uma nova credencial exclusiva. Todas as sessões anteriores serão encerradas.</p><CredentialForm endpoint="/api/auth/change-password" requireCurrent submitLabel="Salvar nova senha" /><small>Sua senha nunca é exibida nem registrada nos logs de auditoria.</small></section></main>;
}
