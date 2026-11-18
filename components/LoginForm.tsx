"use client";

import { FormEvent, useState } from "react";

export function LoginForm({ activationPath, authenticatedUser, mustChangePassword = false }: { activationPath: string; authenticatedUser?: { name: string; email: string } | null; mustChangePassword?: boolean }) {
  const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      window.location.assign(result.next || "/app");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }

  if (authenticatedUser) return <div className="login-form">
    <div className="signed-user"><div className="avatar">{authenticatedUser.name.slice(0, 1).toUpperCase()}</div><div><strong>{authenticatedUser.name}</strong><span>{authenticatedUser.email}</span></div></div>
    <a data-testid="primary-access" className="primary-action" href={mustChangePassword ? "/alterar-senha" : "/app"}>{mustChangePassword ? "Atualizar senha temporária" : "Continuar para o dashboard"}<span aria-hidden="true">→</span></a>
  </div>;

  return <form className="login-form" onSubmit={submit} noValidate>
    <label><span>E-mail ou usuário</span><input name="identifier" type="text" autoComplete="username" required maxLength={254} value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="seu.email@clinica.com" /></label>
    <label><span>Senha</span><div className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" /><button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Ocultar" : "Mostrar"}</button></div></label>
    {error ? <p className="auth-error" role="alert">{error}</p> : null}
    <button data-testid="login-submit" className="primary-action auth-submit" disabled={busy || !identifier.trim() || !password} type="submit"><span>{busy ? "Validando acesso…" : "Entrar"}</span><b aria-hidden="true">→</b></button>
    <div className="login-support"><a href="/recuperar-acesso">Esqueci minha senha</a><a href={activationPath}>Ativar acesso existente</a></div>
  </form>;
}
