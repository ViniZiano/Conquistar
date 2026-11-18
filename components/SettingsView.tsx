"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import type { Actor, GovernanceControl, GovernanceStatus, ThemePreference } from "@/lib/domain/types";
import { formatPhone, initials, roleLabel } from "./format";

type Tab = "profile" | "appearance" | "preferences" | "security";

async function request<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) window.location.replace("/?session=expired");
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data as T;
}

export function SettingsView({ actor, onSaved, onNotify }: { actor: Actor; onSaved(): Promise<void>; onNotify(message: string, error?: boolean): void }) {
  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState(actor.name);
  const [phone, setPhone] = useState(formatPhone(actor.phone));
  const [theme, setTheme] = useState<ThemePreference>(actor.theme);
  const [notifyAppointments, setNotifyAppointments] = useState(actor.notifyAppointments);
  const [notifySystem, setNotifySystem] = useState(actor.notifySystem);
  const [busy, setBusy] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());
  const [governance, setGovernance] = useState<GovernanceControl[]>([]);
  const [governanceLoading, setGovernanceLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab !== "security" || actor.role !== "admin") return;
    let active = true;
    request<{ controls: GovernanceControl[] }>("/api/governance").then((result) => { if (active) setGovernance(result.controls); }).catch((error) => { if (active) onNotify(error instanceof Error ? error.message : "Falha ao carregar a governança.", true); }).finally(() => { if (active) setGovernanceLoading(false); });
    return () => { active = false; };
  }, [tab, actor.role, onNotify]);

  async function save(payload: Record<string, unknown>, message: string) {
    setBusy(true);
    try { await request("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); await onSaved(); onNotify(message); }
    catch (error) { onNotify(error instanceof Error ? error.message : "Falha ao salvar.", true); }
    finally { setBusy(false); }
  }

  async function upload(file?: File) {
    if (!file) return;
    const form = new FormData(); form.set("photo", file); setBusy(true);
    try { await request("/api/profile/avatar", { method: "POST", body: form }); setAvatarVersion(Date.now()); await onSaved(); onNotify("Foto de perfil atualizada."); }
    catch (error) { onNotify(error instanceof Error ? error.message : "Falha ao enviar a foto.", true); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function removeAvatar() {
    setBusy(true);
    try { await request("/api/profile/avatar", { method: "DELETE" }); setAvatarVersion(Date.now()); await onSaved(); onNotify("Foto de perfil removida."); }
    catch (error) { onNotify(error instanceof Error ? error.message : "Falha ao remover a foto.", true); }
    finally { setBusy(false); }
  }

  function editControl(key: string, field: keyof GovernanceControl, value: string) { setGovernance((items) => items.map((item) => item.key === key ? { ...item, [field]: value } : item)); }
  async function saveControl(control: GovernanceControl) {
    setBusy(true);
    try { await request("/api/governance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(control) }); onNotify("Controle de governança atualizado e auditado."); }
    catch (error) { onNotify(error instanceof Error ? error.message : "Falha ao salvar o controle.", true); }
    finally { setBusy(false); }
  }

  return <>
    <header className="page-title"><div><p>Configurações</p><h1>Sua conta e preferências</h1><span>Personalize o perfil, a aparência e os avisos sem alterar seu nível de acesso.</span></div></header>
    <section className="settings-profile-card">
      <div className="profile-photo">{actor.avatarKey ? <img src={`/api/profile/avatar?v=${avatarVersion}`} alt={`Foto de ${actor.name}`} /> : <span>{initials(actor.name)}</span>}</div>
      <div><p>Conta autorizada</p><h2>{actor.name}</h2><span>{actor.email}</span></div>
      <dl><div><dt>Perfil</dt><dd>{roleLabel(actor.role)}</dd></div><div><dt>Autenticação</dt><dd>{actor.authenticationMethod === "password" ? "Credencial Conquistar" : "Acesso anterior"}</dd></div><div><dt>Status</dt><dd>{actor.role === "doctor" && !actor.doctorId ? "Vínculo pendente" : "Ativo"}</dd></div></dl>
    </section>
    <div className="settings-layout">
      <nav className="settings-tabs" aria-label="Categorias de configurações">{([['profile','Perfil'],['appearance','Aparência'],['preferences','Preferências'],['security','Segurança']] as Array<[Tab,string]>).map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
      <section className="settings-content">
        {tab === "profile" ? <form onSubmit={(event) => { event.preventDefault(); save({ name, phone }, "Perfil atualizado."); }}>
          <header><p>Dados pessoais</p><h2>Perfil</h2><span>O e-mail e o perfil de acesso são protegidos e não podem ser alterados aqui.</span></header>
          <div className="photo-settings"><div className="profile-photo large">{actor.avatarKey ? <img src={`/api/profile/avatar?v=${avatarVersion}`} alt="Prévia da foto" /> : <span>{initials(actor.name)}</span>}</div><div><strong>Foto de perfil</strong><p>JPG, PNG ou WebP de até 2 MB. A imagem fica privada.</p><div><button type="button" className="secondary-button" disabled={busy} onClick={() => fileInput.current?.click()}>{actor.avatarKey ? "Trocar foto" : "Adicionar foto"}</button>{actor.avatarKey ? <button type="button" className="danger-link plain" disabled={busy} onClick={removeAvatar}>Remover</button> : null}<input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])} /></div></div></div>
          <div className="settings-fields"><label><span>Nome de exibição</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>Telefone</span><input value={phone} inputMode="tel" onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="(00) 00000-0000" /></label><label><span>E-mail</span><input value={actor.email} readOnly /></label><label><span>Perfil de acesso</span><input value={roleLabel(actor.role)} readOnly /></label></div>
          <footer><button className="green-button" disabled={busy}>{busy ? "Salvando…" : "Salvar perfil"}</button></footer>
        </form> : null}
        {tab === "appearance" ? <div className="settings-section"><header><p>Experiência visual</p><h2>Aparência</h2><span>A escolha é salva no seu perfil e aplicada em todos os dispositivos.</span></header><div className="theme-grid">{([['light','Claro','Superfícies claras e contraste suave'],['dark','Escuro','Conforto visual em ambientes com pouca luz'],['system','Sistema','Acompanha a preferência do dispositivo']] as Array<[ThemePreference,string,string]>).map(([value,label,description]) => <button key={value} disabled={busy} className={theme === value ? "active" : ""} onClick={async () => { setTheme(value); await save({ theme: value }, `Tema ${label.toLowerCase()} aplicado.`); }}><i className={`theme-preview ${value}`}><span /><b /></i><strong>{label}</strong><small>{description}</small></button>)}</div></div> : null}
        {tab === "preferences" ? <form onSubmit={(event) => { event.preventDefault(); save({ notifyAppointments, notifySystem }, "Preferências de notificação atualizadas."); }}><header><p>Central de avisos</p><h2>Preferências</h2><span>Os alertas não exibem dados clínicos sensíveis.</span></header><div className="preference-list"><div><span><strong>Compromissos próximos</strong><small>Lembretes da sua agenda e dos compromissos permitidos.</small></span><input aria-label="Ativar avisos de compromissos próximos" type="checkbox" checked={notifyAppointments} onChange={(event) => setNotifyAppointments(event.target.checked)} /></div><div><span><strong>Eventos gerais da clínica</strong><small>Feriados, recessos, manutenção e avisos administrativos.</small></span><input aria-label="Ativar avisos de eventos gerais" type="checkbox" checked={notifySystem} onChange={(event) => setNotifySystem(event.target.checked)} /></div></div><footer><button className="green-button" disabled={busy}>{busy ? "Salvando…" : "Salvar preferências"}</button></footer></form> : null}
        {tab === "security" ? <div className="settings-section"><header><p>Proteção da conta</p><h2>Segurança</h2><span>Controles técnicos efetivos e pendências externas sem falsa indicação de conclusão.</span></header><div className="security-cards"><article><i>✓</i><div><strong>Credencial própria protegida</strong><p>Senhas são verificadas no backend e as sessões usam cookies seguros que não ficam disponíveis ao JavaScript.</p>{actor.authenticationMethod === "password" ? <a className="text-button" href="/alterar-senha">Alterar minha senha →</a> : <a className="text-button" href="/ativar-acesso">Ativar login próprio →</a>}</div></article><article><i>✓</i><div><strong>Menor privilégio</strong><p>Cada rota valida o perfil no backend, inclusive anexos privados e informações clínicas.</p></div></article><article><i>✓</i><div><strong>Histórico rastreável</strong><p>Ações importantes são auditadas e atendimentos antigos não têm edição ou exclusão silenciosa.</p></div></article><article><i>✓</i><div><strong>Anexos clínicos protegidos</strong><p>PDFs e imagens têm limite de 10 MB, assinatura do formato, triagem de conteúdo, hash de integridade, armazenamento privado e acesso auditado.</p></div></article></div>{actor.role === "admin" ? <section className="governance-panel"><header><p>Prontidão operacional</p><h2>Pendências reais e evidências</h2><span>Marque como concluído apenas após validação por responsável competente. O sistema registra acompanhamento; não substitui pentest, assessoria jurídica ou operação de backup.</span></header>{governanceLoading ? <p className="empty-inline">Carregando controles…</p> : <div className="governance-list">{governance.map((control) => <article key={control.key}><div className="governance-title"><div><strong>{control.title}</strong><p>{control.description}</p></div><select aria-label={`Status de ${control.title}`} value={control.status} onChange={(event) => editControl(control.key, "status", event.target.value as GovernanceStatus)}><option value="pending">Pendente</option><option value="in_progress">Em andamento</option><option value="complete">Concluído</option><option value="not_applicable">Não aplicável</option></select></div><div className="governance-fields"><label><span>Responsável</span><input value={control.responsible} onChange={(event) => editControl(control.key, "responsible", event.target.value)} placeholder="Pessoa ou empresa responsável" /></label><label><span>Referência da evidência</span><input value={control.evidenceReference} onChange={(event) => editControl(control.key, "evidenceReference", event.target.value)} placeholder="Relatório, chamado ou local seguro" /></label><label className="wide"><span>Observações</span><textarea rows={2} value={control.notes} onChange={(event) => editControl(control.key, "notes", event.target.value)} placeholder="Próxima ação, escopo e data prevista" /></label></div><footer><span>{control.reviewedAt ? `Revisado em ${new Date(control.reviewedAt).toLocaleDateString("pt-BR")}` : "Sem evidência de conclusão"}</span><button className="secondary-button" disabled={busy} onClick={() => saveControl(control)}>Salvar controle</button></footer></article>)}</div>}</section> : <div className="settings-note"><strong>Preparação para uso assistencial real</strong><p>A clínica mantém controles operacionais acompanhados pelos administradores.</p></div>}</div> : null}
      </section>
    </div>
  </>;
}
