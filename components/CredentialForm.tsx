"use client";

import { FormEvent, useState } from "react";

export function CredentialForm({ endpoint, requireCurrent = false, submitLabel }: { endpoint: string; requireCurrent?: boolean; submitLabel: string }) {
  const [currentPassword, setCurrentPassword] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword, password, confirmPassword }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar a senha.");
      window.location.replace(result.next || "/app");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível atualizar a senha."); }
    finally { setBusy(false); }
  }
  return <form className="credential-form" onSubmit={submit}>
    {requireCurrent ? <label><span>Senha atual ou temporária</span><input required autoComplete="current-password" type={visible ? "text" : "password"} maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label> : null}
    <label><span>Nova senha</span><input required autoComplete="new-password" type={visible ? "text" : "password"} minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    <label><span>Confirmar nova senha</span><input required autoComplete="new-password" type={visible ? "text" : "password"} minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
    <label className="password-visibility"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /><span>Mostrar senhas</span></label>
    <p className="password-policy">Use de 12 a 128 caracteres e combine ao menos três grupos: maiúsculas, minúsculas, números e símbolos.</p>
    {error ? <p className="auth-error" role="alert">{error}</p> : null}
    <button className="primary-action auth-submit" disabled={busy || !password || password !== confirmPassword || (requireCurrent && !currentPassword)} type="submit"><span>{busy ? "Protegendo credencial…" : submitLabel}</span><b aria-hidden="true">→</b></button>
  </form>;
}
