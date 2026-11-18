import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

export default function RecoverAccessPage() {
  return <main className="credential-shell"><section><BrandLogo /><p className="eyebrow">Recuperação segura</p><h1>Recupere seu acesso</h1><p>Como a clínica ainda não possui um serviço de e-mail transacional configurado, a redefinição é assistida: solicite a um administrador uma senha temporária. No próximo login, o sistema exigirá a criação de uma nova senha pessoal.</p><div className="recovery-note"><strong>O que informar</strong><span>Seu nome e o e-mail cadastrado. Nenhuma senha existente será enviada ou exibida.</span></div><Link className="primary-action" href="/acesso">Voltar para o login <span>→</span></Link></section></main>;
}
