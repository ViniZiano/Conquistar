"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import type { Actor, Role } from "@/lib/domain/types";
import type { Appointment, Doctor, EncounterDiagnosis, Patient, User } from "./clinic-types";
import { formatCpf, formatPhone, toLocalDateTime } from "./format";
import { CidAutocomplete } from "./CidAutocomplete";

export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  drawer = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose(): void;
  wide?: boolean;
  drawer?: boolean;
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className={`modal-backdrop ${drawer ? "is-drawer" : ""}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""} ${drawer ? "modal-drawer" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header>
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function PatientForm({ patient, canManageStatus, busy, onClose, onSave }: { patient?: Patient | null; canManageStatus: boolean; busy: boolean; onClose(): void; onSave(data: Record<string, unknown>): void }) {
  const [form, setForm] = useState({ fullName: patient?.fullName ?? "", cpf: formatCpf(patient?.cpf ?? ""), phone: formatPhone(patient?.phone ?? ""), birthDate: patient?.birthDate ?? "", sex: patient?.sex ?? "Não informado", address: patient?.address ?? "", email: patient?.email ?? "", emergencyContact: patient?.emergencyContact ?? "", administrativeNotes: patient?.administrativeNotes ?? "", active: patient?.active ?? true });
  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal title={patient ? "Editar paciente" : "Novo paciente"} subtitle="Dados administrativos e de contato" onClose={onClose} wide drawer><form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
    <label className="span-2"><span>Nome completo *</span><input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Nome completo do paciente" /></label>
    <label><span>CPF *</span><input required inputMode="numeric" value={form.cpf} onChange={(e) => set("cpf", formatCpf(e.target.value))} placeholder="000.000.000-00" /></label>
    <label><span>Telefone *</span><input required inputMode="tel" value={form.phone} onChange={(e) => set("phone", formatPhone(e.target.value))} placeholder="(00) 00000-0000" /></label>
    <label><span>Data de nascimento *</span><input required type="date" max={toLocalDateTime().slice(0, 10)} value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} /></label>
    <label><span>Sexo</span><select value={form.sex} onChange={(e) => set("sex", e.target.value)}><option>Não informado</option><option>Feminino</option><option>Masculino</option><option>Outro</option></select></label>
    <label><span>E-mail</span><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="paciente@email.com" /></label>
    <label><span>Contato de emergência</span><input value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} placeholder="Nome e telefone" /></label>
    <label className="span-2"><span>Endereço</span><input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Rua, número, bairro e cidade" /></label>
    <label className="span-2"><span>Observações administrativas</span><textarea rows={3} value={form.administrativeNotes} onChange={(e) => set("administrativeNotes", e.target.value)} placeholder="Convênio, preferências de contato ou informações administrativas" /></label>
    {canManageStatus ? <label className="toggle-row span-2"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /><span>Paciente ativo</span></label> : null}
    <footer className="form-actions span-2"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="green-button" disabled={busy}>{busy ? "Salvando…" : "Salvar paciente"}</button></footer>
  </form></Modal>;
}

export function DoctorForm({ doctor, users, busy, onClose, onSave }: { doctor?: Doctor | null; users: User[]; busy: boolean; onClose(): void; onSave(data: Record<string, unknown>): void }) {
  const [form, setForm] = useState({ name: doctor?.name ?? "", crm: doctor?.crm ?? "", specialty: doctor?.specialty ?? "", phone: formatPhone(doctor?.phone ?? ""), email: doctor?.email ?? "", userId: doctor?.userId ?? "", active: doctor?.active ?? true });
  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal title={doctor ? "Editar médico" : "Novo médico"} subtitle="Identificação profissional e vínculo de acesso" onClose={onClose} drawer><form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
    <label className="span-2"><span>Nome *</span><input required value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
    <label><span>CRM *</span><input required value={form.crm} onChange={(e) => set("crm", e.target.value)} placeholder="CRM/UF 000000" /></label>
    <label><span>Especialidade *</span><input required value={form.specialty} onChange={(e) => set("specialty", e.target.value)} /></label>
    <label><span>Telefone</span><input value={form.phone} onChange={(e) => set("phone", formatPhone(e.target.value))} /></label>
    <label><span>E-mail</span><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
    <label className="span-2"><span>Usuário associado</span><select value={form.userId} onChange={(e) => set("userId", e.target.value)}><option value="">Sem vínculo</option>{users.filter((user) => user.role === "doctor").map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></label>
    <label className="toggle-row span-2"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /><span>Médico ativo</span></label>
    <footer className="form-actions span-2"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="green-button" disabled={busy}>{busy ? "Salvando…" : "Salvar médico"}</button></footer>
  </form></Modal>;
}

export function AppointmentForm({ appointment, doctors, actor, busy, onClose, onSave }: { appointment?: Appointment | null; doctors: Doctor[]; actor: Actor; busy: boolean; onClose(): void; onSave(data: Record<string, unknown>): void }) {
  const ownDoctor = actor.role === "doctor" ? actor.doctorId ?? "" : "";
  const [form, setForm] = useState<{
    doctorId: string | null; scope: "doctor" | "global"; title: string; description: string;
    startsAt: string; endsAt: string; type: string; allDay: boolean; reason: string; notes: string;
  }>(() => {
    const start = new Date();
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    return { doctorId: appointment?.doctorId ?? ownDoctor, scope: appointment?.scope ?? "doctor", title: appointment?.title ?? "", description: appointment?.description ?? "", startsAt: appointment?.startsAt?.slice(0, 16) ?? toLocalDateTime(start), endsAt: appointment?.endsAt?.slice(0, 16) ?? toLocalDateTime(end), type: appointment?.type ?? "Compromisso", allDay: appointment?.allDay ?? false, reason: appointment?.reason ?? "", notes: appointment?.notes ?? "" };
  });
  const set = (key: string, value: string | boolean | null) => setForm((current) => ({ ...current, [key]: value }));
  const globalTypes = ["Clínica fechada", "Feriado", "Recesso", "Manutenção"];
  const appointmentTypes = actor.role === "admin" ? ["Compromisso","Reunião","Plantão","Horário bloqueado","Evento interno",...globalTypes,"Outro"] : ["Compromisso","Reunião","Plantão","Horário bloqueado","Evento interno","Outro"];
  const chooseType = (type: string) => setForm((current) => ({ ...current, type, ...(actor.role === "admin" && globalTypes.includes(type) ? { scope: "global", doctorId: null, allDay: true, title: current.title || type } : {}) }));
  return <Modal title={appointment ? "Editar compromisso" : "Novo compromisso"} subtitle="Agenda interna da equipe e eventos gerais" onClose={onClose} drawer><form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSave({ ...form, doctorId: form.scope === "global" ? null : form.doctorId, startsAt: form.allDay ? `${form.startsAt.slice(0, 10)}T00:00` : form.startsAt, endsAt: form.allDay ? `${form.endsAt.slice(0, 10)}T23:59` : form.endsAt }); }}>
    <label className="span-2"><span>Escopo *</span><select value={form.scope} disabled={actor.role !== "admin"} onChange={(e) => setForm((current) => ({ ...current, scope: e.target.value as "global" | "doctor", doctorId: e.target.value === "global" ? null : current.doctorId || ownDoctor }))}><option value="doctor">Médico específico</option>{actor.role === "admin" ? <option value="global">Toda a clínica</option> : null}</select><small className="field-hint">Eventos globais aparecem uma única vez e são exibidos para toda a equipe.</small></label>
    {form.scope === "doctor" ? <label className="span-2"><span>Médico *</span><select required disabled={actor.role === "doctor"} value={form.doctorId ?? ""} onChange={(e) => set("doctorId", e.target.value)}><option value="">Selecione</option>{doctors.filter((doctor) => doctor.active).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label> : null}
    <label className="span-2"><span>Título *</span><input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Reunião clínica, plantão..." /></label>
    <label><span>Tipo *</span><select value={form.type} onChange={(e) => chooseType(e.target.value)}>{appointmentTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
    <label className="toggle-row"><input type="checkbox" checked={form.allDay} onChange={(e) => set("allDay", e.target.checked)} /><span>Dia inteiro</span></label>
    <label><span>Início *</span><input required type={form.allDay ? "date" : "datetime-local"} value={form.allDay ? form.startsAt.slice(0, 10) : form.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></label>
    <label><span>Fim *</span><input required type={form.allDay ? "date" : "datetime-local"} value={form.allDay ? form.endsAt.slice(0, 10) : form.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></label>
    <label className="span-2"><span>Motivo</span><input value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Feriado, manutenção, alinhamento..." /></label>
    <label className="span-2"><span>Descrição</span><textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
    <label className="span-2"><span>Observações</span><textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></label>
    <footer className="form-actions span-2"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="green-button" disabled={busy}>{busy ? "Salvando…" : appointment ? "Salvar alterações" : "Criar compromisso"}</button></footer>
  </form></Modal>;
}

export function UserForm({ user, doctors, busy, onClose, onSave }: { user?: User | null; doctors: Doctor[]; busy: boolean; onClose(): void; onSave(data: Record<string, unknown>): void }) {
  const [form, setForm] = useState<{ name: string; email: string; username: string; role: Role; active: boolean; doctorId: string }>({ name: user?.name ?? "", email: user?.email ?? "", username: user?.username ?? "", role: user?.role ?? "reception", active: user?.active ?? true, doctorId: user?.doctorId ?? "" });
  const availableDoctors = doctors.filter((doctor) => doctor.active && (!doctor.userId || doctor.userId === user?.id));
  const setEmail = (email: string) => { const exact = availableDoctors.filter((doctor) => doctor.email.trim().toLowerCase() === email.trim().toLowerCase()); setForm((current) => ({ ...current, email, doctorId: current.role === "doctor" && exact.length === 1 ? exact[0].id : current.doctorId })); };
  return <Modal title={user ? "Editar usuário" : "Novo usuário"} subtitle="Identidade autorizada e perfil de menor privilégio" onClose={onClose} drawer><form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
    <label className="span-2"><span>Nome *</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
    <label className="span-2"><span>E-mail de acesso *</span><input required type="email" autoComplete="email" value={form.email} onChange={(e) => setEmail(e.target.value)} /><small className="field-hint">O e-mail é validado no backend e pode ser usado diretamente no login próprio.</small></label>
    <label className="span-2"><span>Nome de usuário (opcional)</span><input autoComplete="off" minLength={3} maxLength={40} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="nome.sobrenome" /><small className="field-hint">Use letras, números, ponto, hífen ou sublinhado. Também poderá ser usado no login.</small></label>
    <label className="span-2"><span>Perfil *</span><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role, doctorId: e.target.value === "doctor" ? form.doctorId : "" })}><option value="admin">Administrador</option><option value="doctor">Médico</option><option value="reception">Recepção/Funcionário</option></select></label>
    {form.role === "doctor" ? <label className="span-2"><span>Profissional médico associado *</span><select required={form.active} value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}><option value="">Selecione o cadastro profissional</option>{availableDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} — {doctor.crm} — {doctor.email || "sem e-mail"}</option>)}</select><small className="field-hint">A identidade de login e o cadastro profissional são vínculos diferentes. Ambos precisam estar válidos para liberar o prontuário.</small></label> : null}
    <label className="toggle-row span-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span>Usuário ativo</span></label>
    <div className="credential-box span-2"><strong>{user?.passwordConfigured ? "Login próprio configurado" : "Login próprio ainda pendente"}</strong><p>{user?.passwordConfigured ? "A senha permanece protegida e nunca é exibida. Use a ação Redefinir senha somente quando necessário." : "Após salvar, o usuário pode ativar o acesso usando a identidade já validada ou receber uma senha temporária definida pelo administrador."}</p></div>
    <footer className="form-actions span-2"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="green-button" disabled={busy}>{busy ? "Salvando…" : user ? "Salvar alterações" : "Autorizar usuário"}</button></footer>
  </form></Modal>;
}

export function TemporaryPasswordForm({ user, busy, onClose, onSave }: { user: User; busy: boolean; onClose(): void; onSave(data: Record<string, unknown>): void }) {
  const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [visible, setVisible] = useState(false);
  return <Modal title={user.passwordConfigured ? "Redefinir senha" : "Definir acesso inicial"} subtitle={`${user.name} · senha temporária e troca obrigatória`} onClose={onClose}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave({ password, confirmPassword }); }}>
    <div className="credential-box span-2"><strong>Fluxo seguro de recuperação</strong><p>O usuário entrará com esta senha temporária e deverá substituí-la imediatamente. Todas as sessões anteriores serão encerradas.</p></div>
    <label className="span-2"><span>Senha temporária *</span><input required type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    <label className="span-2"><span>Confirmar senha *</span><input required type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
    <label className="toggle-row span-2"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /><span>Mostrar senha durante a definição</span></label>
    <small className="field-hint span-2">Use de 12 a 128 caracteres e combine ao menos três grupos: maiúsculas, minúsculas, números e símbolos.</small>
    <footer className="form-actions span-2"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="green-button" disabled={busy || !password || password !== confirmPassword}>{busy ? "Protegendo…" : "Salvar senha temporária"}</button></footer>
  </form></Modal>;
}

type Medication = { medication: string; dosage: string; administrationRoute: string; frequency: string; duration: string; instructions: string };
type Exam = { examName: string; category: string; priority: string; notes: string };
type PresentedExam = { examName: string; performedAt: string; laboratory: string; resultSummary: string; medicalNotes: string };

export function EncounterForm({ patient, doctors, actor, busy, onClose, onSave }: { patient: Patient; doctors: Doctor[]; actor: Actor; busy: boolean; onClose(): void; onSave(data: Record<string, unknown>): void }) {
  const [form, setForm] = useState({ doctorId: actor.doctorId ?? "", occurredAt: toLocalDateTime(), consultationType: "Consulta de retorno", chiefComplaint: "", problemHistory: "", symptoms: "", relevantHistory: "", allergies: "", clinicalNotes: "", evolution: "", diagnosticHypothesis: "", diagnosis: "", diagnosisNotes: "", conduct: "", patientGuidance: "", notes: "" });
  const [medications, setMedications] = useState<Medication[]>([]); const [exams, setExams] = useState<Exam[]>([]); const [presentedExams, setPresentedExams] = useState<PresentedExam[]>([]);
  const [diagnoses, setDiagnoses] = useState<EncounterDiagnosis[]>([]);
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateMedication = (index: number, key: keyof Medication, value: string) => setMedications((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const updateExam = (index: number, key: keyof Exam, value: string) => setExams((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const updatePresentedExam = (index: number, key: keyof PresentedExam, value: string) => setPresentedExams((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  return <Modal title="Novo atendimento" subtitle={`${patient.fullName} · registro clínico permanente`} onClose={onClose} wide drawer><form className="clinical-form" onSubmit={(e: FormEvent) => { e.preventDefault(); onSave({ ...form, diagnoses: diagnoses.map(({ cidId, type }) => ({ cidId, type })), medications, exams, presentedExams }); }}>
    <div className="form-grid"><label><span>Médico responsável *</span><select required disabled={actor.role === "doctor"} value={form.doctorId} onChange={(e) => set("doctorId", e.target.value)}><option value="">Selecione</option>{doctors.filter((doctor) => doctor.active).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} — {doctor.specialty}</option>)}</select></label><label><span>Data e hora do registro</span><input required readOnly type="datetime-local" value={form.occurredAt} /><small className="field-hint">Definida automaticamente e preservada na auditoria.</small></label><label className="span-2"><span>Tipo de consulta *</span><select value={form.consultationType} onChange={(e) => set("consultationType", e.target.value)}>{["Primeira consulta","Consulta de retorno","Acompanhamento","Avaliação","Teleatendimento","Outro"].map((type) => <option key={type}>{type}</option>)}</select></label></div>
    <fieldset><legend>Anamnese e informações clínicas</legend><div className="form-grid"><label className="span-2"><span>Queixa principal</span><textarea rows={2} value={form.chiefComplaint} onChange={(e) => set("chiefComplaint", e.target.value)} /></label><label><span>História da doença / problema atual</span><textarea rows={3} value={form.problemHistory} onChange={(e) => set("problemHistory", e.target.value)} /></label><label><span>Sintomas</span><textarea rows={3} value={form.symptoms} onChange={(e) => set("symptoms", e.target.value)} /></label><label><span>Antecedentes relevantes</span><textarea rows={3} value={form.relevantHistory} onChange={(e) => set("relevantHistory", e.target.value)} /></label><label><span>Alergias</span><textarea rows={3} value={form.allergies} onChange={(e) => set("allergies", e.target.value)} /></label><label className="span-2"><span>Observações clínicas</span><textarea rows={2} value={form.clinicalNotes} onChange={(e) => set("clinicalNotes", e.target.value)} /></label></div></fieldset>
    <fieldset><legend>Evolução e avaliação médica</legend><div className="form-grid"><label className="span-2"><span>Evolução / avaliação médica *</span><textarea required rows={4} value={form.evolution} onChange={(e) => set("evolution", e.target.value)} /></label><label><span>Hipótese diagnóstica em texto livre</span><textarea rows={3} value={form.diagnosticHypothesis} onChange={(e) => set("diagnosticHypothesis", e.target.value)} /></label><label><span>Diagnóstico em texto livre</span><textarea rows={3} value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} /></label><label className="span-2"><span>Observações relacionadas ao diagnóstico</span><textarea rows={2} value={form.diagnosisNotes} onChange={(e) => set("diagnosisNotes", e.target.value)} /></label></div><CidAutocomplete value={diagnoses} onChange={setDiagnoses} /></fieldset>
    <fieldset><div className="fieldset-title"><legend>Exames apresentados pelo paciente</legend><button type="button" className="text-button" onClick={() => setPresentedExams([...presentedExams, { examName: "", performedAt: "", laboratory: "", resultSummary: "", medicalNotes: "" }])}>+ Adicionar exame apresentado</button></div>{presentedExams.length ? presentedExams.map((exam, index) => <div className="repeat-card" key={index}><div className="form-grid"><label><span>Nome / tipo do exame *</span><input required value={exam.examName} onChange={(e) => updatePresentedExam(index, "examName", e.target.value)} /></label><label><span>Data do exame</span><input type="date" max={toLocalDateTime().slice(0,10)} value={exam.performedAt} onChange={(e) => updatePresentedExam(index, "performedAt", e.target.value)} /></label><label className="span-2"><span>Laboratório / local</span><input value={exam.laboratory} onChange={(e) => updatePresentedExam(index, "laboratory", e.target.value)} /></label><label><span>Resultado / resumo</span><textarea rows={3} value={exam.resultSummary} onChange={(e) => updatePresentedExam(index, "resultSummary", e.target.value)} /></label><label><span>Observação médica</span><textarea rows={3} value={exam.medicalNotes} onChange={(e) => updatePresentedExam(index, "medicalNotes", e.target.value)} /></label></div><button type="button" className="remove-button" onClick={() => setPresentedExams(presentedExams.filter((_, i) => i !== index))}>Remover</button></div>) : <p className="empty-inline">Nenhum exame apresentado nesta consulta.</p>}</fieldset>
    <fieldset><div className="fieldset-title"><legend>Prescrição desta consulta</legend><button type="button" className="text-button" onClick={() => setMedications([...medications, { medication: "", dosage: "", administrationRoute: "", frequency: "", duration: "", instructions: "" }])}>+ Adicionar medicamento</button></div>{medications.length ? medications.map((medication, index) => <div className="repeat-card" key={index}><div className="form-grid"><label><span>Medicamento *</span><input required value={medication.medication} onChange={(e) => updateMedication(index, "medication", e.target.value)} /></label><label><span>Dosagem</span><input value={medication.dosage} onChange={(e) => updateMedication(index, "dosage", e.target.value)} /></label><label><span>Via de administração</span><input value={medication.administrationRoute} onChange={(e) => updateMedication(index, "administrationRoute", e.target.value)} placeholder="Oral, tópica, intramuscular..." /></label><label><span>Frequência</span><input value={medication.frequency} onChange={(e) => updateMedication(index, "frequency", e.target.value)} /></label><label><span>Duração</span><input value={medication.duration} onChange={(e) => updateMedication(index, "duration", e.target.value)} /></label><label><span>Orientações</span><input value={medication.instructions} onChange={(e) => updateMedication(index, "instructions", e.target.value)} /></label></div><button type="button" className="remove-button" onClick={() => setMedications(medications.filter((_, i) => i !== index))}>Remover</button></div>) : <p className="empty-inline">Nenhum medicamento adicionado.</p>}</fieldset>
    <fieldset><div className="fieldset-title"><legend>Exames solicitados nesta consulta</legend><button type="button" className="text-button" onClick={() => setExams([...exams, { examName: "", category: "", priority: "Rotina", notes: "" }])}>+ Adicionar exame</button></div>{exams.length ? exams.map((exam, index) => <div className="repeat-card" key={index}><div className="form-grid"><label><span>Exame *</span><input required value={exam.examName} onChange={(e) => updateExam(index, "examName", e.target.value)} placeholder="Hemograma, ultrassom..." /></label><label><span>Categoria</span><input value={exam.category} onChange={(e) => updateExam(index, "category", e.target.value)} placeholder="Laboratorial, imagem..." /></label><label><span>Prioridade</span><select value={exam.priority} onChange={(e) => updateExam(index, "priority", e.target.value)}><option>Rotina</option><option>Prioritário</option><option>Urgente</option></select></label><label><span>Indicação / observação</span><input value={exam.notes} onChange={(e) => updateExam(index, "notes", e.target.value)} /></label></div><button type="button" className="remove-button" onClick={() => setExams(exams.filter((_, i) => i !== index))}>Remover</button></div>) : <p className="empty-inline">Nenhum exame solicitado.</p>}</fieldset>
    <fieldset><legend>Conduta e orientações</legend><div className="form-grid"><label><span>Conduta médica</span><textarea rows={3} value={form.conduct} onChange={(e) => set("conduct", e.target.value)} /></label><label><span>Orientações ao paciente</span><textarea rows={3} value={form.patientGuidance} onChange={(e) => set("patientGuidance", e.target.value)} /></label></div></fieldset>
    <label><span>Observações adicionais</span><textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></label>
    <footer className="form-actions"><p className="form-help">Ao finalizar, o registro será permanente, atribuído ao médico e auditado.</p><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="green-button" disabled={busy}>{busy ? "Finalizando…" : "Finalizar atendimento"}</button></footer>
  </form></Modal>;
}