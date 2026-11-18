"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Actor } from "@/lib/domain/types";
import type { Appointment, AuditLog, Bootstrap, Doctor, Encounter, Patient, Section, User } from "./clinic-types";
import { actionLabel, ageFrom, dateOnly, dateTime, entityLabel, formatCpf, formatPhone, initials, roleLabel } from "./format";
import { AppointmentForm, DoctorForm, EncounterForm, PatientForm, TemporaryPasswordForm, UserForm } from "./ClinicForms";
import { ConfirmDialog } from "./ConfirmDialog";
import { AgendaView } from "./AgendaView";
import { BrandLogo } from "./BrandLogo";
import { SettingsView } from "./SettingsView";
import { PatientDetailV2 } from "./PatientDetail";

const navItems: Array<{ id: Section; label: string; icon: string; permission?: keyof Bootstrap["permissions"] }> = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "patients", label: "Pacientes", icon: "◉" },
  { id: "records", label: "Prontuários", icon: "✚", permission: "clinicalRead" },
  { id: "doctors", label: "Médicos", icon: "♙" },
  { id: "agenda", label: "Agenda", icon: "□" },
  { id: "users", label: "Usuários", icon: "◇", permission: "userManage" },
  { id: "audit", label: "Auditoria", icon: "◎", permission: "auditRead" },
  { id: "settings", label: "Configurações", icon: "⚙" },
];

type ConfirmState = { title: string; description: string; confirmLabel: string; danger?: boolean; action(): Promise<void> };
type PatientTab = "overview" | "history" | "prescriptions" | "exams";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && typeof window !== "undefined") window.location.replace("/?session=expired");
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data as T;
}

export function ClinicApp({ initialActor }: { initialActor: Actor }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [section, setSection] = useState<Section>("dashboard");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [globalResults, setGlobalResults] = useState<{ patients: Patient[]; doctors: Doctor[] }>({ patients: [], doctors: [] });
  const searchSequence = useRef(0);
  const [patientFilter, setPatientFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientTab, setPatientTab] = useState<PatientTab>("overview");
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [calendarMode, setCalendarMode] = useState<"day" | "week" | "month">("week");
  const [patientForm, setPatientForm] = useState<Patient | "new" | null>(null);
  const [doctorForm, setDoctorForm] = useState<Doctor | "new" | null>(null);
  const [userForm, setUserForm] = useState<User | "new" | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [appointmentForm, setAppointmentForm] = useState<Appointment | "new" | null>(null);
  const [encounterForm, setEncounterForm] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const notify = useCallback((message: string, error = false) => {
    setToast({ message, error });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const refresh = useCallback(async () => {
    const result = await api<Bootstrap>("/api/bootstrap");
    setData(result); setLoadError(""); return result;
  }, []);

  useEffect(() => {
    let active = true;
    api<Bootstrap>("/api/bootstrap")
      .then((result) => { if (active) { setData(result); setLoadError(""); } })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Falha ao carregar o sistema."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const preference = data?.actor.theme ?? initialActor.theme ?? "system";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => { document.documentElement.dataset.theme = preference === "system" ? (media.matches ? "dark" : "light") : preference; };
    applyTheme(); media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [data?.actor.theme, initialActor.theme]);

  async function loadHistory(patient: Patient) {
    if (!data?.permissions.clinicalRead) return;
    setHistoryLoading(true);
    try { setEncounters((await api<{ encounters: Encounter[] }>(`/api/patients/${patient.id}/encounters`)).encounters); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível carregar o prontuário.", true); }
    finally { setHistoryLoading(false); }
  }

  async function openPatient(patient: Patient, record = false) {
    setSelectedPatient(patient); setPatientTab(record ? "history" : "overview"); setSection(record ? "records" : "patients"); setMenuOpen(false); await loadHistory(patient);
  }

  async function changeSection(next: Section) {
    setSection(next); setSelectedPatient(null); setMenuOpen(false);
    if (next === "audit" && data?.permissions.auditRead) {
      try { setAudit((await api<{ logs: AuditLog[] }>("/api/audit")).logs); }
      catch (error) { notify(error instanceof Error ? error.message : "Falha ao carregar a auditoria.", true); }
    }
  }

  async function mutate(work: () => Promise<unknown>, success: string, keepPatient = false) {
    setBusy(true);
    try {
      await work(); const refreshed = await refresh();
      const currentPatient = keepPatient && selectedPatient ? refreshed.patients.find((item) => item.id === selectedPatient.id) ?? selectedPatient : null;
      if (currentPatient) { setSelectedPatient(currentPatient); if (refreshed.permissions.clinicalRead) await loadHistory(currentPatient); }
      setPatientForm(null); setDoctorForm(null); setUserForm(null); setPasswordUser(null); setAppointmentForm(null); setEncounterForm(false); setConfirm(null); notify(success);
    } catch (error) { notify(error instanceof Error ? error.message : "Não foi possível concluir a operação.", true); }
    finally { setBusy(false); }
  }

  async function runConfirmation() { if (!confirm) return; setBusy(true); try { await confirm.action(); setConfirm(null); } finally { setBusy(false); } }

  async function signOut() {
    setBusy(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { window.location.replace("/?signed_out=1"); }
  }

  async function handleGlobalSearch(value: string) {
    setSearch(value); const query = value.trim(); const sequence = ++searchSequence.current;
    if (query.length < 2) { setGlobalResults({ patients: [], doctors: [] }); setSearching(false); return; }
    setSearching(true);
    try { const result = await api<{ patients: Patient[]; doctors: Doctor[] }>(`/api/search?q=${encodeURIComponent(query)}`); if (sequence === searchSequence.current) setGlobalResults(result); }
    catch (error) { if (sequence === searchSequence.current) notify(error instanceof Error ? error.message : "Busca indisponível.", true); }
    finally { if (sequence === searchSequence.current) setSearching(false); }
  }

  if (loading) return <LoadingScreen />;
  if (!data || loadError) return <ErrorState message={loadError || "Não foi possível carregar o ambiente."} onRetry={() => { setLoading(true); refresh().catch((error) => setLoadError(error instanceof Error ? error.message : "Falha ao tentar novamente.")).finally(() => setLoading(false)); }} />;
  const actor = data.actor ?? initialActor;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><BrandLogo compact inverse /><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">×</button></div>
      <div className="sidebar-context"><span>Ambiente clínico</span><strong>{roleLabel(actor.role)}</strong></div>
      <nav aria-label="Navegação principal">{navItems.filter((item) => !item.permission || data.permissions[item.permission]).map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => changeSection(item.id)}><i aria-hidden="true">{item.icon}</i><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-foot"><div className="sidebar-user"><UserAvatar actor={actor} /><div><strong>{actor.name}</strong><span>{actor.email}</span></div></div><button className="sidebar-logout" onClick={signOut} disabled={busy} aria-label="Sair do Conquistar"><span>↗</span><small>Sair</small></button></div>
    </aside>
    {menuOpen ? <button className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} /> : null}
    <div className="app-main">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">☰</button><div className="global-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => handleGlobalSearch(event.target.value)} placeholder="Buscar paciente, CPF, médico ou CRM..." aria-label="Busca global" />{search.length >= 2 ? <div className="search-results" role="listbox" aria-label="Resultados da busca">{searching ? <p>Pesquisando com segurança…</p> : null}{!searching && !globalResults.patients.length && !globalResults.doctors.length ? <p>Nenhum resultado encontrado.</p> : null}{globalResults.patients.map((patient) => <button key={patient.id} onClick={() => { openPatient(patient); setSearch(""); }}><i className="mini-avatar">{initials(patient.fullName)}</i><span><strong>{patient.fullName}</strong><small>Paciente · {formatCpf(patient.cpf)}</small></span><em>Abrir</em></button>)}{globalResults.doctors.map((doctor) => <button key={doctor.id} onClick={() => { setDoctorFilter(doctor.name); changeSection("doctors"); setSearch(""); }}><i className="mini-avatar doctor">{initials(doctor.name)}</i><span><strong>{doctor.name}</strong><small>{doctor.specialty} · {doctor.crm}</small></span><em>Ver equipe</em></button>)}</div> : null}</div><div className="notification-wrap"><button className="notification-button" aria-label={`${data.notifications.length} notificações`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><span aria-hidden="true">♢</span>{data.notifications.length ? <b>{data.notifications.length}</b> : null}</button>{notificationsOpen ? <div className="notification-popover"><header><strong>Central de avisos</strong><small>{data.notifications.length ? `${data.notifications.length} próximos` : "Tudo em dia"}</small></header>{data.notifications.length ? data.notifications.map((item) => <button key={item.id} onClick={() => { setNotificationsOpen(false); changeSection("agenda"); }}><i>{item.kind === "system" ? "!" : "•"}</i><span><strong>{item.title}</strong><small>{item.description} · {item.allDay ? dateOnly(item.startsAt) : dateTime(item.startsAt)}</small></span></button>) : <p>Nenhum aviso novo para as suas preferências.</p>}</div> : null}</div><div className="topbar-user"><UserAvatar actor={actor} /><span><strong>{actor.name.split(" ")[0]}</strong><small>{roleLabel(actor.role)}</small></span></div></header>
      <main className="workspace">
        {actor.authenticationMethod === "legacy" ? <div className="migration-banner" role="status"><i>↗</i><div><strong>Ative seu login próprio do Conquistar</strong><span>Você entrou pelo acesso anterior. Crie sua senha para passar a entrar diretamente no sistema.</span></div><a href="/ativar-acesso">Ativar agora</a></div> : null}
        {actor.role === "doctor" && !actor.doctorId ? <div className="professional-pending-banner" role="status"><i>!</i><div><strong>Identidade validada; vínculo profissional pendente</strong><span>Você pode entrar no sistema, mas prontuários e registros clínicos permanecem bloqueados até um administrador associar seu usuário a um médico ativo com CRM e especialidade.</span></div></div> : null}
        {section === "dashboard" ? <Dashboard data={data} onSection={changeSection} onAgenda={(mode) => { setCalendarMode(mode); changeSection("agenda"); }} onNewPatient={() => setPatientForm("new")} onNewAppointment={() => setAppointmentForm("new")} /> : null}
        {section === "patients" && !selectedPatient ? <PatientsView patients={data.patients} query={patientFilter} onQuery={setPatientFilter} permissions={data.permissions} onNew={() => setPatientForm("new")} onOpen={openPatient} onEdit={(patient) => setPatientForm(patient)} onArchive={(patient) => setConfirm({ title: patient.active ? "Arquivar paciente?" : "Reativar paciente?", description: patient.active ? "O cadastro sairá das listas ativas, mas qualquer histórico clínico será integralmente preservado." : "O paciente voltará a aparecer entre os cadastros ativos.", confirmLabel: patient.active ? "Arquivar" : "Reativar", danger: patient.active, action: () => mutate(() => api(`/api/patients/${patient.id}`, { method: "PATCH", body: JSON.stringify({ ...patient, active: !patient.active }) }), patient.active ? "Paciente arquivado com segurança." : "Paciente reativado.") })} onDelete={(patient) => setConfirm({ title: "Excluir cadastro sem histórico?", description: "A exclusão só será aceita se o paciente estiver arquivado e nunca tiver recebido atendimento. Caso exista histórico, o sistema bloqueará a operação.", confirmLabel: "Solicitar exclusão", danger: true, action: () => mutate(() => api(`/api/patients/${patient.id}`, { method: "DELETE" }), "Cadastro sem histórico removido.") })} /> : null}
        {section === "records" && !selectedPatient ? <RecordsIndex patients={data.patients} query={patientFilter} onQuery={setPatientFilter} onOpen={(patient) => openPatient(patient, true)} /> : null}
        {(section === "patients" || section === "records") && selectedPatient ? <PatientDetailV2 patient={selectedPatient} encounters={encounters} historyLoading={historyLoading} permissions={data.permissions} tab={patientTab} onTab={setPatientTab} onBack={() => setSelectedPatient(null)} onEdit={() => setPatientForm(selectedPatient)} onNewEncounter={() => setEncounterForm(true)} onHistoryChanged={() => loadHistory(selectedPatient)} onNotify={notify} /> : null}
        {section === "doctors" ? <DoctorsView doctors={data.doctors} query={doctorFilter} onQuery={setDoctorFilter} canManage={data.permissions.doctorManage} onNew={() => setDoctorForm("new")} onEdit={(doctor) => setDoctorForm(doctor)} onToggle={(doctor) => setConfirm({ title: doctor.active ? "Desativar médico?" : "Reativar médico?", description: doctor.active ? "O profissional perderá o acesso clínico e os atendimentos já registrados permanecerão preservados." : "O profissional voltará a poder exercer as funções vinculadas ao perfil médico.", confirmLabel: doctor.active ? "Desativar" : "Reativar", danger: doctor.active, action: () => mutate(() => api(`/api/doctors/${doctor.id}`, { method: "PATCH", body: JSON.stringify({ ...doctor, active: !doctor.active }) }), doctor.active ? "Médico desativado; histórico preservado." : "Médico reativado.") })} onDelete={(doctor) => setConfirm({ title: "Excluir médico sem histórico?", description: "A exclusão será bloqueada se houver atendimentos ou compromissos associados. Para preservar registros, mantenha o profissional desativado.", confirmLabel: "Solicitar exclusão", danger: true, action: () => mutate(() => api(`/api/doctors/${doctor.id}`, { method: "DELETE" }), "Cadastro médico sem histórico removido.") })} /> : null}
        {section === "agenda" ? <AgendaView appointments={data.appointments} actor={actor} mode={calendarMode} onMode={setCalendarMode} onNew={() => setAppointmentForm("new")} onEdit={setAppointmentForm} onDelete={(appointment) => setConfirm({ title: "Excluir compromisso?", description: appointment.scope === "global" ? "O evento será removido da agenda de toda a clínica. A ação ficará registrada na auditoria." : "O compromisso será removido da agenda e a ação ficará registrada na auditoria.", confirmLabel: "Excluir compromisso", danger: true, action: () => mutate(() => api(`/api/appointments/${appointment.id}`, { method: "DELETE" }), "Compromisso excluído e auditado.") })} /> : null}
        {section === "users" ? <UsersView users={data.users} doctors={data.doctors} actorId={actor.id} onNew={() => setUserForm("new")} onEdit={(user) => setUserForm(user)} onPassword={setPasswordUser} onToggle={(user) => setConfirm({ title: user.active ? "Revogar acesso?" : "Reativar usuário?", description: user.active ? "O usuário perderá o acesso imediatamente. Registros e autoria serão preservados." : "O usuário poderá entrar novamente com suas credenciais autorizadas.", confirmLabel: user.active ? "Revogar acesso" : "Reativar", danger: user.active, action: () => mutate(() => api(`/api/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ active: !user.active }) }), user.active ? "Acesso revogado." : "Usuário reativado.") })} onDelete={(user) => setConfirm({ title: "Excluir usuário sem histórico?", description: "A exclusão só será permitida para usuário inativo e sem vínculos, autoria ou histórico. Caso contrário, mantenha o acesso revogado.", confirmLabel: "Solicitar exclusão", danger: true, action: () => mutate(() => api(`/api/users/${user.id}`, { method: "DELETE" }), "Usuário sem histórico removido.") })} /> : null}
        {section === "audit" ? <AuditView logs={audit} /> : null}
        {section === "settings" ? <SettingsView actor={actor} onSaved={async () => { await refresh(); }} onNotify={notify} /> : null}
      </main>
    </div>
    {patientForm ? <PatientForm patient={patientForm === "new" ? null : patientForm} canManageStatus={data.permissions.patientManage} busy={busy} onClose={() => setPatientForm(null)} onSave={(payload) => mutate(() => api(patientForm === "new" ? "/api/patients" : `/api/patients/${patientForm.id}`, { method: patientForm === "new" ? "POST" : "PATCH", body: JSON.stringify(payload) }), patientForm === "new" ? "Paciente cadastrado com prontuário único." : "Dados do paciente atualizados.", patientForm !== "new")} /> : null}
    {doctorForm ? <DoctorForm doctor={doctorForm === "new" ? null : doctorForm} users={data.users} busy={busy} onClose={() => setDoctorForm(null)} onSave={(payload) => mutate(() => api(doctorForm === "new" ? "/api/doctors" : `/api/doctors/${doctorForm.id}`, { method: doctorForm === "new" ? "POST" : "PATCH", body: JSON.stringify(payload) }), doctorForm === "new" ? "Médico cadastrado." : "Médico atualizado.")} /> : null}
    {userForm ? <UserForm user={userForm === "new" ? null : userForm} doctors={data.doctors} busy={busy} onClose={() => setUserForm(null)} onSave={(payload) => mutate(() => api(userForm === "new" ? "/api/users" : `/api/users/${userForm.id}`, { method: userForm === "new" ? "POST" : "PATCH", body: JSON.stringify(payload) }), userForm === "new" ? "Usuário autorizado e vínculos validados." : "Usuário, identidade e vínculo profissional atualizados.")} /> : null}
    {passwordUser ? <TemporaryPasswordForm user={passwordUser} busy={busy} onClose={() => setPasswordUser(null)} onSave={(payload) => mutate(() => api(`/api/users/${passwordUser.id}/password`, { method: "POST", body: JSON.stringify(payload) }), "Senha temporária protegida; troca obrigatória no próximo acesso.")} /> : null}
    {appointmentForm ? <AppointmentForm appointment={appointmentForm === "new" ? null : appointmentForm} doctors={data.doctors} actor={actor} busy={busy} onClose={() => setAppointmentForm(null)} onSave={(payload) => mutate(() => api(appointmentForm === "new" ? "/api/appointments" : `/api/appointments/${appointmentForm.id}`, { method: appointmentForm === "new" ? "POST" : "PATCH", body: JSON.stringify(payload) }), appointmentForm === "new" ? "Compromisso adicionado à agenda." : "Compromisso atualizado e auditado.")} /> : null}
    {encounterForm && selectedPatient ? <EncounterForm patient={selectedPatient} doctors={data.doctors} actor={actor} busy={busy} onClose={() => setEncounterForm(false)} onSave={(payload) => mutate(() => api(`/api/patients/${selectedPatient.id}/encounters`, { method: "POST", body: JSON.stringify(payload) }), "Atendimento salvo no prontuário e na linha do tempo.", true)} /> : null}
    {confirm ? <ConfirmDialog title={confirm.title} description={confirm.description} confirmLabel={confirm.confirmLabel} danger={confirm.danger} busy={busy} onCancel={() => setConfirm(null)} onConfirm={runConfirmation} /> : null}
    {toast ? <div className={`toast ${toast.error ? "toast-error" : ""}`} role="status" aria-live="polite"><i>{toast.error ? "!" : "✓"}</i>{toast.message}</div> : null}
  </div>;
}

function LoadingScreen() { return <div className="app-loading"><div className="loading-mark">C</div><div><strong>Preparando seu ambiente seguro</strong><span>Validando sessão, perfil e permissões…</span><div className="loading-bar" /></div></div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry(): void }) { return <main className="error-state"><div>!</div><p>Não foi possível abrir o Conquistar</p><h1>Encontramos uma interrupção</h1><span>{message}</span><button className="green-button" onClick={onRetry}>Tentar novamente</button></main>; }
function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <header className="page-title"><div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>{action}</header>; }

function Dashboard({ data, onSection, onAgenda, onNewPatient, onNewAppointment }: { data: Bootstrap; onSection(section: Section): void; onAgenda(mode: "day" | "week"): void; onNewPatient(): void; onNewAppointment(): void }) {
  const hour = new Date().getHours(); const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const cards = [
    { label: "Pacientes ativos", value: data.dashboard.stats.patients, note: "cadastros disponíveis", icon: "P", tone: "green", action: () => onSection("patients") },
    { label: "Médicos", value: data.dashboard.stats.doctors, note: "profissionais ativos", icon: "M", tone: "blue", action: () => onSection("doctors") },
    { label: "Compromissos hoje", value: data.dashboard.stats.today, note: "na agenda interna", icon: "H", tone: "amber", action: () => onAgenda("day") },
    { label: "Próximos", value: data.dashboard.stats.upcoming, note: "compromissos futuros", icon: "↗", tone: "purple", action: () => onAgenda("week") },
  ];
  return <><PageTitle eyebrow={greeting} title={`Olá, ${data.actor.name.split(" ")[0]}`} description="Visão operacional da clínica, organizada pelo seu perfil de acesso." /><section className="stat-grid" aria-label="Indicadores do dashboard">{cards.map((card) => <button className="stat-card" key={card.label} onClick={card.action} aria-label={`${card.label}: ${card.value}. Abrir módulo.`}><div className={`stat-icon ${card.tone}`}>{card.icon}</div><div><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></div><em>→</em></button>)}</section><section className="dashboard-grid"><div className="panel agenda-panel"><header className="panel-header"><div><p>Operação do dia</p><h2>Próximos compromissos</h2></div><button className="text-button" onClick={() => onSection("agenda")}>Abrir agenda →</button></header><div className="appointment-list">{data.dashboard.appointments.length ? data.dashboard.appointments.map((appointment) => <article key={appointment.id}><time><strong>{new Date(appointment.startsAt).toLocaleDateString("pt-BR", { day: "2-digit" })}</strong><span>{new Date(appointment.startsAt).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></time><div><strong>{appointment.title}</strong><span>{dateTime(appointment.startsAt)} · {appointment.doctorName}</span></div><em>{appointment.type}</em></article>) : <EmptyState compact icon="□" title="Agenda livre" text="Nenhum compromisso futuro cadastrado." />}</div></div><div className="quick-panel"><header><p>Fluxos principais</p><h2>Acesso rápido</h2></header><div className="quick-actions">{data.permissions.patientWrite ? <button onClick={onNewPatient}><i>01</i><span><strong>Novo paciente</strong><small>Cadastrar e criar prontuário</small></span><em>→</em></button> : null}<button onClick={() => onSection("patients")}><i>02</i><span><strong>Pesquisar paciente</strong><small>Nome, CPF ou telefone</small></span><em>→</em></button><button onClick={onNewAppointment}><i>03</i><span><strong>Novo compromisso</strong><small>Organizar agenda médica</small></span><em>→</em></button>{data.permissions.clinicalRead ? <button onClick={() => onSection("records")}><i>04</i><span><strong>Prontuários</strong><small>Histórico clínico contínuo</small></span><em>→</em></button> : null}</div></div></section>{data.permissions.auditRead ? <section className="panel recent-panel"><header className="panel-header"><div><p>Rastreabilidade</p><h2>Atividades recentes</h2></div><button className="text-button" onClick={() => onSection("audit")}>Ver auditoria →</button></header>{data.dashboard.recent.length ? <div className="activity-list">{data.dashboard.recent.map((item) => <div key={item.id}><i>✓</i><span><strong>{actionLabel(item.action)}</strong><small>{item.summary || `${item.userName} · ${dateTime(item.createdAt)}`}</small></span></div>)}</div> : <EmptyState compact icon="◎" title="Nenhuma atividade registrada" text="As ações relevantes aparecerão aqui." />}</section> : null}</>;
}

function PatientsView({ patients, query, onQuery, permissions, onNew, onOpen, onEdit, onArchive, onDelete }: { patients: Patient[]; query: string; onQuery(value: string): void; permissions: Bootstrap["permissions"]; onNew(): void; onOpen(patient: Patient, record?: boolean): void; onEdit(patient: Patient): void; onArchive(patient: Patient): void; onDelete(patient: Patient): void }) {
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); const numeric = q.replace(/\D/g, ""); return patients.filter((patient) => patient.fullName.toLowerCase().includes(q) || (numeric.length >= 2 && (patient.cpf.includes(numeric) || patient.phone.includes(numeric)))); }, [patients, query]);
  return <><PageTitle eyebrow="Cadastros" title="Pacientes" description="Dados administrativos, contato e continuidade do cuidado." action={permissions.patientWrite ? <button className="green-button" onClick={onNew}>+ Novo paciente</button> : undefined} /><div className="table-panel"><div className="table-toolbar"><div className="search-field"><span>⌕</span><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Pesquisar por nome, CPF ou telefone" aria-label="Pesquisar pacientes" /></div><span>{filtered.length} paciente{filtered.length === 1 ? "" : "s"}</span></div>{filtered.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Paciente</th><th>Contato</th><th>Nascimento</th><th>Status</th><th aria-label="Ações" /></tr></thead><tbody>{filtered.map((patient) => <tr key={patient.id}><td><button className="person-cell" onClick={() => onOpen(patient)}><i>{initials(patient.fullName)}</i><span><strong>{patient.fullName}</strong><small>{formatCpf(patient.cpf)}</small></span></button></td><td><strong>{formatPhone(patient.phone)}</strong><small>{patient.email || "Sem e-mail"}</small></td><td>{dateOnly(patient.birthDate)}<small>{ageFrom(patient.birthDate)} anos · {patient.sex}</small></td><td><Status active={patient.active} /></td><td><div className="row-actions"><button onClick={() => onOpen(patient, permissions.clinicalRead)}>{permissions.clinicalRead ? "Prontuário" : "Abrir"}</button>{permissions.patientWrite ? <button onClick={() => onEdit(patient)}>Editar</button> : null}{permissions.patientManage ? <button onClick={() => onArchive(patient)}>{patient.active ? "Arquivar" : "Reativar"}</button> : null}{permissions.patientManage && !patient.active ? <button className="danger-link" onClick={() => onDelete(patient)}>Excluir</button> : null}</div></td></tr>)}</tbody></table></div> : <EmptyState icon="P" title="Nenhum paciente encontrado" text="Ajuste a busca ou cadastre o primeiro paciente." action={permissions.patientWrite ? <button className="green-button" onClick={onNew}>Cadastrar paciente</button> : undefined} />}</div></>;
}

function RecordsIndex({ patients, query, onQuery, onOpen }: { patients: Patient[]; query: string; onQuery(value: string): void; onOpen(patient: Patient): void }) {
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); const numeric = q.replace(/\D/g, ""); return patients.filter((patient) => patient.fullName.toLowerCase().includes(q) || (numeric.length >= 2 && (patient.cpf.includes(numeric) || patient.phone.includes(numeric)))); }, [patients, query]);
  return <><PageTitle eyebrow="Cuidado contínuo" title="Prontuários" description="Encontre o paciente e consulte a história clínica preservada." /><div className="record-search"><div className="search-field large"><span>⌕</span><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Digite nome, CPF ou telefone do paciente" aria-label="Pesquisar prontuários" /></div>{query.length >= 2 ? <div className="record-results">{filtered.length ? filtered.slice(0, 12).map((patient) => <button key={patient.id} onClick={() => onOpen(patient)}><i>{initials(patient.fullName)}</i><span><strong>{patient.fullName}</strong><small>{formatCpf(patient.cpf)} · {ageFrom(patient.birthDate)} anos</small></span><em>Abrir prontuário →</em></button>) : <EmptyState compact icon="⌕" title="Paciente não encontrado" text="Confira o termo pesquisado." />}</div> : <div className="search-guidance"><div>✚</div><h2>Continuidade clínica em uma linha do tempo</h2><p>Os registros preservam o médico, a autoria, a data e o conteúdo original de cada atendimento.</p></div>}</div></>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PatientDetail({ patient, encounters, historyLoading, permissions, tab, onTab, onBack, onEdit, onNewEncounter }: { patient: Patient; encounters: Encounter[]; historyLoading: boolean; permissions: Bootstrap["permissions"]; tab: PatientTab; onTab(tab: PatientTab): void; onBack(): void; onEdit(): void; onNewEncounter(): void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const medications = encounters.flatMap((encounter) => encounter.medications.map((item) => ({ ...item, encounter })));
  const exams = encounters.flatMap((encounter) => encounter.exams.map((item) => ({ ...item, encounter })));
  return <><button className="back-button" onClick={onBack}>← Voltar para a lista</button><section className="patient-hero"><div className="patient-identity"><i>{initials(patient.fullName)}</i><div><p>Paciente {patient.id.slice(0, 8).toUpperCase()}</p><h1>{patient.fullName}</h1><span>{ageFrom(patient.birthDate)} anos · {patient.sex} · {formatCpf(patient.cpf)}</span></div></div><div className="hero-actions"><Status active={patient.active} />{permissions.patientWrite ? <button className="secondary-button" onClick={onEdit}>Editar cadastro</button> : null}{permissions.clinicalWrite ? <button className="green-button clinical-cta" onClick={onNewEncounter}>+ Novo atendimento</button> : null}</div></section><section className="patient-facts" aria-label="Informações do paciente"><div><span>Telefone</span><strong>{formatPhone(patient.phone)}</strong></div><div><span>E-mail</span><strong>{patient.email || "Não informado"}</strong></div><div><span>Nascimento</span><strong>{dateOnly(patient.birthDate)}</strong></div><div><span>CPF</span><strong>{formatCpf(patient.cpf)}</strong></div><div><span>Sexo</span><strong>{patient.sex}</strong></div><div><span>Emergência</span><strong>{patient.emergencyContact || "Não informado"}</strong></div></section><div className="patient-tabs" role="tablist" aria-label="Seções do paciente"><button className={tab === "overview" ? "active" : ""} onClick={() => onTab("overview")} role="tab">Visão geral</button>{permissions.clinicalRead ? <><button className={tab === "history" ? "active" : ""} onClick={() => onTab("history")} role="tab">Histórico clínico <span>{encounters.length}</span></button><button className={tab === "prescriptions" ? "active" : ""} onClick={() => onTab("prescriptions")} role="tab">Prescrições <span>{medications.length}</span></button><button className={tab === "exams" ? "active" : ""} onClick={() => onTab("exams")} role="tab">Exames <span>{exams.length}</span></button></> : null}</div>{tab === "overview" ? <section className="patient-overview"><article><p>Dados administrativos</p><h2>Contato e acompanhamento</h2><dl><div><dt>Endereço</dt><dd>{patient.address || "Não informado"}</dd></div><div><dt>Contato de emergência</dt><dd>{patient.emergencyContact || "Não informado"}</dd></div><div><dt>Cadastro realizado</dt><dd>{dateOnly(patient.createdAt)}</dd></div></dl></article><article className="overview-note"><p>Observações administrativas</p><h2>Informações operacionais</h2><span>{patient.administrativeNotes || "Nenhuma observação administrativa registrada."}</span></article></section> : null}{!permissions.clinicalRead && tab === "overview" ? <div className="restricted-card"><i>↯</i><div><h2>Informações clínicas restritas</h2><p>O perfil administrativo não concede acesso automático a diagnósticos, prescrições ou evoluções médicas.</p></div></div> : null}{permissions.clinicalRead && tab === "history" ? <section className="timeline-panel"><header className="panel-header"><div><p>Registro permanente</p><h2>Linha do tempo clínica</h2></div><span className="protected-label">● Informação protegida</span></header>{historyLoading ? <TimelineSkeleton /> : encounters.length ? <div className="timeline">{encounters.map((encounter) => { const open = expanded === encounter.id; return <article key={encounter.id} className={open ? "expanded" : ""}><div className="timeline-dot" /><button className="encounter-toggle" onClick={() => setExpanded(open ? null : encounter.id)} aria-expanded={open}><div><time>{dateTime(encounter.occurredAt)}</time><h3>{encounter.doctorName}</h3><span>{encounter.specialty} · {encounter.crm}</span></div><div><em>Registro v{encounter.version}</em><b>{open ? "Ocultar detalhes ↑" : "Ver atendimento completo ↓"}</b></div></button><div className="encounter-glance"><span><b>Queixa</b>{encounter.chiefComplaint}</span><span><b>Hipótese</b>{encounter.diagnosis || "Não informada"}</span><span><b>Conduta</b>{encounter.conduct || "Não informada"}</span></div>{open ? <div className="clinical-details"><ClinicalBlock label="Queixa principal" text={encounter.chiefComplaint} /><ClinicalBlock label="Anamnese / história clínica" text={encounter.problemHistory} /><ClinicalBlock label="Sintomas" text={encounter.symptoms} /><ClinicalBlock label="Informações clínicas" text={encounter.clinicalNotes} /><ClinicalBlock label="Evolução médica" text={encounter.evolution} /><ClinicalBlock label="Diagnóstico / hipótese" text={encounter.diagnosis} /><ClinicalBlock label="Conduta" text={encounter.conduct} /><ClinicalBlock label="Observações" text={encounter.notes} />{encounter.medications.length ? <div className="detail-span"><b>Prescrição</b><ul>{encounter.medications.map((medication) => <li key={medication.id}><strong>{medication.medication}</strong><span>{[medication.dosage, medication.frequency, medication.duration].filter(Boolean).join(" · ")}</span>{medication.instructions ? <small>{medication.instructions}</small> : null}</li>)}</ul></div> : null}{encounter.exams.length ? <div className="detail-span"><b>Exames solicitados</b><ul>{encounter.exams.map((exam) => <li key={exam.id}><strong>{exam.examName}</strong>{exam.notes ? <small>{exam.notes}</small> : null}</li>)}</ul></div> : null}<footer>Registrado por {encounter.authorName} em {dateTime(encounter.createdAt)} · conteúdo original preservado</footer></div> : null}</article>; })}</div> : <EmptyState icon="✚" title="Prontuário pronto para o primeiro atendimento" text="O prontuário único já existe. Quando um médico autorizado registrar o atendimento, ele aparecerá aqui imediatamente." action={permissions.clinicalWrite ? <button className="green-button" onClick={onNewEncounter}>+ Registrar primeiro atendimento</button> : undefined} />}</section> : null}{permissions.clinicalRead && tab === "prescriptions" ? <ClinicalCollection title="Prescrições" empty="Nenhum medicamento foi prescrito." items={medications.map((item) => ({ id: item.id, title: item.medication, meta: [item.dosage, item.frequency, item.duration].filter(Boolean).join(" · "), notes: item.instructions, footer: `${dateOnly(item.encounter.occurredAt)} · ${item.encounter.doctorName}` }))} /> : null}{permissions.clinicalRead && tab === "exams" ? <ClinicalCollection title="Exames solicitados" empty="Nenhuma solicitação de exame registrada." items={exams.map((item) => ({ id: item.id, title: item.examName, meta: item.notes, footer: `${dateOnly(item.encounter.occurredAt)} · ${item.encounter.doctorName}` }))} /> : null}</>;
}

function ClinicalBlock({ label, text }: { label: string; text: string }) { return text ? <div><b>{label}</b><p>{text}</p></div> : null; }
function ClinicalCollection({ title, empty, items }: { title: string; empty: string; items: Array<{ id: string; title: string; meta?: string; notes?: string; footer: string }> }) { return <section className="clinical-collection"><header><p>Histórico consolidado</p><h2>{title}</h2></header>{items.length ? <div>{items.map((item) => <article key={item.id}><i>✚</i><div><h3>{item.title}</h3>{item.meta ? <p>{item.meta}</p> : null}{item.notes ? <span>{item.notes}</span> : null}<small>{item.footer}</small></div></article>)}</div> : <EmptyState icon="□" title={empty} text="Os registros aparecerão aqui conforme os atendimentos forem realizados." />}</section>; }

function DoctorsView({ doctors, query, onQuery, canManage, onNew, onEdit, onToggle, onDelete }: { doctors: Doctor[]; query: string; onQuery(value: string): void; canManage: boolean; onNew(): void; onEdit(doctor: Doctor): void; onToggle(doctor: Doctor): void; onDelete(doctor: Doctor): void }) {
  const filtered = doctors.filter((doctor) => doctor.name.toLowerCase().includes(query.toLowerCase()) || doctor.crm.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle eyebrow="Equipe clínica" title="Médicos" description="Profissionais, especialidades, status e vínculos de acesso." action={canManage ? <button className="green-button" onClick={onNew}>+ Novo médico</button> : undefined} /><div className="module-toolbar"><div className="search-field"><span>⌕</span><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Pesquisar por nome ou CRM" aria-label="Pesquisar médicos" /></div><span>{filtered.length} profissional{filtered.length === 1 ? "" : "is"}</span></div><div className="doctor-list">{filtered.map((doctor) => <article key={doctor.id}><div className="doctor-avatar">{initials(doctor.name)}</div><div className="doctor-main"><div><h2>{doctor.name}</h2><Status active={doctor.active} /></div><p>{doctor.specialty}</p><span>{doctor.crm} · {formatPhone(doctor.phone) || "Telefone não informado"}</span></div><div className="doctor-access"><small>Acesso associado</small><strong>{doctor.userName || "Sem usuário vinculado"}</strong></div>{canManage ? <div className="context-actions"><button onClick={() => onEdit(doctor)}>Editar</button><button onClick={() => onToggle(doctor)}>{doctor.active ? "Desativar" : "Reativar"}</button>{!doctor.active ? <button className="danger-link" onClick={() => onDelete(doctor)}>Excluir</button> : null}</div> : null}</article>)}{!filtered.length ? <EmptyState icon="M" title="Nenhum médico encontrado" text="Ajuste a busca ou cadastre um profissional." action={canManage ? <button className="green-button" onClick={onNew}>Cadastrar médico</button> : undefined} /> : null}</div></>;
}

function UsersView({ users, doctors, actorId, onNew, onEdit, onPassword, onToggle, onDelete }: { users: User[]; doctors: Doctor[]; actorId: string; onNew(): void; onEdit(user: User): void; onPassword(user: User): void; onToggle(user: User): void; onDelete(user: User): void }) {
  const doctorNames = new Map(doctors.map((doctor) => [doctor.id, doctor.name]));
  return <><PageTitle eyebrow="Administração" title="Usuários e permissões" description="Gerencie credenciais próprias, perfis e vínculos profissionais sem alterar o histórico." action={<button className="green-button" onClick={onNew}>+ Autorizar usuário</button>} /><div className="security-banner"><i>✓</i><div><strong>Login próprio com menor privilégio</strong><span>Senhas são protegidas no backend. Contas médicas também exigem associação a um cadastro profissional ativo.</span></div></div><div className="table-panel"><div className="data-table-wrap"><table className="data-table users-table"><thead><tr><th>Usuário</th><th>Perfil</th><th>Credencial</th><th>Vínculo profissional</th><th>Status</th><th aria-label="Ações" /></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="person-cell static"><i>{initials(user.name)}</i><span><strong>{user.name}</strong><small>{user.email}{user.username ? ` · @${user.username}` : ""}</small></span></div></td><td><span className={`role-badge ${user.role}`}>{roleLabel(user.role)}</span></td><td><span className={`credential-state ${user.passwordConfigured ? (user.mustChangePassword ? "pending" : "verified") : "blocked"}`}>{user.passwordConfigured ? (user.mustChangePassword ? "Troca obrigatória" : "Login próprio ativo") : "Senha pendente"}</span></td><td>{user.role === "doctor" ? <span className={`credential-state ${user.doctorId ? "verified" : "blocked"}`}>{user.doctorId ? doctorNames.get(user.doctorId) || "Médico vinculado" : "Vínculo pendente"}</span> : <span className="credential-state neutral">Não se aplica</span>}</td><td><Status active={user.active} /></td><td><div className="row-actions"><button onClick={() => onEdit(user)}>Editar</button><button onClick={() => onPassword(user)}>{user.passwordConfigured ? "Redefinir senha" : "Definir acesso"}</button><button disabled={user.id === actorId} onClick={() => onToggle(user)}>{user.active ? "Revogar" : "Reativar"}</button>{!user.active ? <button disabled={user.id === actorId} className="danger-link" onClick={() => onDelete(user)}>Excluir</button> : null}</div></td></tr>)}</tbody></table></div></div></>;
}

function AuditView({ logs }: { logs: AuditLog[] }) {
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [user, setUser] = useState(""); const [action, setAction] = useState(""); const [entity, setEntity] = useState("");
  const users = Array.from(new Set(logs.map((log) => log.userName))).sort(); const actions = Array.from(new Set(logs.map((log) => log.action))).sort(); const entities = Array.from(new Set(logs.map((log) => log.entityType))).sort();
  const filtered = logs.filter((log) => (!from || log.createdAt.slice(0, 10) >= from) && (!to || log.createdAt.slice(0, 10) <= to) && (!user || log.userName === user) && (!action || log.action === action) && (!entity || log.entityType === entity));
  return <><PageTitle eyebrow="Rastreabilidade" title="Auditoria" description="Ações, autores e entidades sem copiar conteúdo clínico sensível." /><div className="security-banner"><i>✓</i><div><strong>Trilha administrativa exclusiva</strong><span>Diagnósticos, prescrições, tokens e senhas não são armazenados no log.</span></div></div><div className="audit-filters"><label><span>De</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label><span>Até</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label><span>Usuário</span><select value={user} onChange={(event) => setUser(event.target.value)}><option value="">Todos</option>{users.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>Ação</span><select value={action} onChange={(event) => setAction(event.target.value)}><option value="">Todas</option>{actions.map((value) => <option key={value} value={value}>{actionLabel(value)}</option>)}</select></label><label><span>Entidade</span><select value={entity} onChange={(event) => setEntity(event.target.value)}><option value="">Todas</option>{entities.map((value) => <option key={value} value={value}>{entityLabel(value)}</option>)}</select></label><button className="secondary-button" onClick={() => { setFrom(""); setTo(""); setUser(""); setAction(""); setEntity(""); }}>Limpar filtros</button></div><div className="audit-stream">{filtered.map((log) => <article key={log.id}><div className="audit-time"><strong>{new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong><span>{dateOnly(log.createdAt)}</span></div><i>◎</i><div><header><h2>{actionLabel(log.action)}</h2><span className="entity-badge">{entityLabel(log.entityType)}</span></header><p>{log.summary || `${log.userName} realizou uma ação em ${entityLabel(log.entityType).toLowerCase()}.`}</p><small>{log.userName} · {roleLabel(log.actorRole)} · registro {log.entityId.slice(0, 8).toUpperCase()}</small></div></article>)}{!filtered.length ? <EmptyState icon="◎" title="Nenhum evento encontrado" text="Ajuste os filtros para consultar a trilha de auditoria." /> : null}</div></>;
}

function TimelineSkeleton() { return <div className="timeline-skeleton" aria-label="Carregando histórico"><i /><div><span /><span /><span /></div></div>; }
function UserAvatar({ actor }: { actor: Actor }) { return <div className="user-avatar">{actor.avatarKey ? <img /* eslint-disable-line @next/next/no-img-element */ src="/api/profile/avatar" alt="" /> : initials(actor.name)}</div>; }
function Status({ active }: { active: boolean }) { return <span className={`status ${active ? "active" : "inactive"}`}><i />{active ? "Ativo" : "Inativo"}</span>; }
function EmptyState({ icon, title, text, action, compact = false }: { icon: string; title: string; text: string; action?: React.ReactNode; compact?: boolean }) { return <div className={`empty-state ${compact ? "compact" : ""}`}><i>{icon}</i><h3>{title}</h3><p>{text}</p>{action}</div>; }
