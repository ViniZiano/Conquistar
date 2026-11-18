import { chatGPTSignInPath } from "../chatgpt-auth";
import { cookies } from "next/headers";
import { BrandLogo } from "../../components/BrandLogo";
import { LoginForm } from "../../components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const hasSession = (await cookies()).has("conquistar_session");
  const user = hasSession ? await import("@/lib/auth/actor").then(({ getOptionalSessionActor }) => getOptionalSessionActor()) : null;

  return (
    <main className="login-shell">
      <section className="login-brand" aria-labelledby="brand-title">
        <div className="brand-mark" aria-hidden="true"><span>+</span></div>
        <div className="brand-copy">
          <p className="eyebrow">Conquistar · Gestão clínica integrada</p>
          <h1 id="brand-title">Com trabalho se conquista</h1>
          <p className="brand-description">
            Pacientes, prontuários, histórico clínico e agenda em um só lugar,
            com acesso por perfil e rastreabilidade em cada ação.
          </p>
        </div>
        <div className="trust-list" aria-label="Recursos de segurança">
          <span>Dados clínicos protegidos</span>
          <span>Permissões por perfil</span>
          <span>Auditoria completa</span>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <BrandLogo />
        <div className="login-card">
          <div className="status-pill"><i /> Ambiente protegido</div>
          <h2 id="login-title">Acesse o Conquistar</h2>
          <p>Use suas credenciais próprias. O cadastro continua restrito aos usuários autorizados pela clínica.</p>
          <LoginForm activationPath={chatGPTSignInPath("/ativar-acesso")} authenticatedUser={user ? { name: user.name, email: user.email } : null} mustChangePassword={user?.mustChangePassword} />
          <p className="privacy-note">
            Ao acessar, você concorda com as políticas internas de privacidade
            e proteção de dados da clínica.
          </p>
        </div>
        <footer><span>Uso restrito a profissionais autorizados</span><span>•</span><span>LGPD</span></footer>
      </section>
    </main>
  );
}
