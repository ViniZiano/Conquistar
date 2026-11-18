import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { BootstrapAdminForm } from "@/components/BootstrapAdminForm";
import { ensureDatabase, getRawDb } from "@/db";

export const dynamic = "force-dynamic";

const DEFAULT_ADMIN_EMAIL = "viniciusziano2267@gmail.com";

function isLocalHost(value: string) {
  try {
    const hostname = new URL(`http://${value}`).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export default async function ConfigureAdministratorPage() {
  const requestHeaders = await headers();
  const local = isLocalHost(requestHeaders.get("host") ?? "");
  const token = (env as typeof env & { CONQUISTAR_BOOTSTRAP_TOKEN?: string }).CONQUISTAR_BOOTSTRAP_TOKEN ?? "";
  const enabled = token.length >= 32;

  if (!local) {
    return <main className="credential-shell"><section><BrandLogo /><p className="eyebrow">Configuração protegida</p><h1>Disponível somente no computador local</h1><p>Por segurança, o cadastro inicial do administrador só pode ser feito no ambiente local de desenvolvimento.</p><Link className="primary-action" href="/acesso">Voltar ao acesso <span>→</span></Link></section></main>;
  }

  await ensureDatabase();
  const result = await getRawDb().prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
  if ((result?.total ?? 0) > 0) {
    return <main className="credential-shell"><section><BrandLogo /><p className="eyebrow">Configuração concluída</p><h1>O cadastro inicial já foi utilizado</h1><p>Já existe pelo menos um usuário cadastrado neste banco de dados. Por segurança, a criação inicial está bloqueada.</p><Link className="primary-action" href="/acesso">Ir para o login <span>→</span></Link></section></main>;
  }

  if (!enabled) {
    return <main className="credential-shell"><section><BrandLogo /><p className="eyebrow">Configuração necessária</p><h1>Prepare o cadastro inicial</h1><p>Adicione <strong>CONQUISTAR_BOOTSTRAP_TOKEN</strong> ao arquivo <strong>.env.local</strong>, gere um token aleatório com pelo menos 32 caracteres e reinicie o servidor de desenvolvimento.</p><Link className="primary-action" href="/acesso">Voltar ao acesso <span>→</span></Link></section></main>;
  }

  return (
    <main className="credential-shell">
      <section>
        <BrandLogo />
        <p className="eyebrow">Primeiro acesso · Administrador</p>
        <h1>Configure a conta principal</h1>
        <p>Este formulário cria o primeiro administrador do banco local. O cadastro só pode ser realizado uma vez. Defina uma senha forte e guarde-a em local seguro.</p>
        <BootstrapAdminForm defaultEmail={DEFAULT_ADMIN_EMAIL} />
        <small>O token de configuração não é sua senha. Ele apenas autoriza a criação inicial e deve ser removido do .env.local depois que a conta for criada.</small>
      </section>
    </main>
  );
}
