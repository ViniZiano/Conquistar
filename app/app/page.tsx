import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { AuthenticationError } from "@/lib/http/errors";
import { ClinicApp } from "@/components/ClinicApp";

export const dynamic = "force-dynamic";

export default async function ProtectedAppPage() {
  const access = await requireActor(undefined, { allowPasswordChange: true }).then(
    (actor) => ({ actor, error: null as unknown }),
    (error: unknown) => ({ actor: null, error }),
  );

  if (access.error instanceof AuthenticationError) redirect("/acesso?session=required");
  if (access.actor?.mustChangePassword) redirect("/alterar-senha");

  if (!access.actor) {
    return (
      <main className="access-denied">
        <div className="clinic-symbol" aria-hidden="true">+</div>
        <p className="eyebrow">Acesso protegido</p>
        <h1>Acesso ainda não autorizado</h1>
        <p>{access.error instanceof Error ? access.error.message : "Procure um administrador da clínica."}</p>
        <Link className="primary-action" href="/acesso">Voltar ao acesso da equipe <span>→</span></Link>
      </main>
    );
  }

  return <ClinicApp initialActor={access.actor} />;
}
