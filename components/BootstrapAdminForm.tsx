"use client";

import { FormEvent, useState } from "react";

export function BootstrapAdminForm({ defaultEmail }: { defaultEmail: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/setup/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, token, password, confirmPassword }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível criar o administrador.");
      window.location.assign(result.next || "/app");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar o administrador.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="credential-form" onSubmit={submit}>
      <label><span>Nome do administrador</span><input required autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome completo" /></label>
      <label><span>E-mail do administrador</span><input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label><span>Token de configuração local</span><input required type="password" autoComplete="off" minLength={32} value={token} onChange={(event) => setToken(event.target.value)} placeholder="Cole o token criado no .env.local" /></label>
      <label><span>Senha</span><input required type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Crie uma senha forte" /></label>
      <label><span>Confirmar senha</span><input required type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Digite a senha novamente" /></label>
      <label className="password-visibility"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /><span>Mostrar senhas</span></label>
      <p className="password-policy">Use de 12 a 128 caracteres e combine ao menos três grupos: maiúsculas, minúsculas, números e símbolos. Não reutilize uma senha de outro serviço.</p>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="primary-action auth-submit" disabled={busy || !name.trim() || !email.trim() || token.length < 32 || password.length < 12 || password !== confirmPassword} type="submit"><span>{busy ? "Criando administrador…" : "Criar administrador e entrar"}</span><b aria-hidden="true">→</b></button>
    </form>
  );
}
