import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const run = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const cpf = String(Date.now()).slice(-11).padStart(11, "7");
const adminHeaders = identity("qa-admin", "admin.qa@clinica.local", "Administrador QA");
const doctorAEmail = `medico.a.${run}@conquistar.local`;
const doctorBEmail = `medico.b.${run}@conquistar.local`;
const receptionEmail = `recepcao.${run}@conquistar.local`;
const inactiveEmail = `inativo.${run}@conquistar.local`;
const disposableEmail = `descartavel.${run}@conquistar.local`;
const doctorAHeaders = identity(`doctor-a-${run}`, doctorAEmail, "Dra. Ana Continuidade");
const doctorBHeaders = identity(`doctor-b-${run}`, doctorBEmail, "Dr. Bruno Continuidade");
const receptionHeaders = identity(`reception-${run}`, receptionEmail, "Recepção Teste");
const inactiveHeaders = identity(`inactive-${run}`, inactiveEmail, "Usuário Inativo");

test("fluxo completo, persistência, auditoria e segurança por perfil", async (context) => {
  let doctorAUserId; let doctorBUserId; let inactiveUserId; let doctorAId; let doctorBId; let patientId; let encounterId; let presentedExamId; let disposableUserId; let doctorAppointmentId; let globalAppointmentId; let hypertensionCid; let asthmaCid;
  let patientPayload;

  await context.test("protege APIs sem autenticação", async () => {
    const denied = await request("/api/bootstrap");
    assert.equal(denied.status, 401);
    assert.match(denied.headers["cache-control"], /private.*no-store/);
    assert.equal(denied.headers["x-content-type-options"], "nosniff");
  });

  await context.test("provisiona e reconhece administrador sem acesso clínico", async () => {
    const result = await request("/api/bootstrap", { headers: adminHeaders });
    assert.equal(result.status, 200);
    assert.equal(result.body.actor.role, "admin");
    assert.equal(result.body.permissions.userManage, true);
    assert.equal(result.body.permissions.patientManage, true);
    assert.equal(result.body.permissions.auditRead, true);
    assert.equal(result.body.permissions.clinicalRead, false);
  });

  await context.test("autoriza usuários, edita credencial e bloqueia inativo", async () => {
    assert.equal((await post("/api/users", { name: "E-mail inválido", email: "email-sem-dominio", role: "reception", active: true }, adminHeaders)).status, 400);
    const doctorA = await post("/api/users", { name: "Dra. Ana Continuidade", email: doctorAEmail, username: `medico.a-${run}`, role: "doctor", active: false }, adminHeaders);
    assert.equal(doctorA.status, 201); doctorAUserId = doctorA.body.id;
    const doctorB = await post("/api/users", { name: "Dr. Bruno Continuidade", email: doctorBEmail, role: "doctor", active: false }, adminHeaders);
    assert.equal(doctorB.status, 201); doctorBUserId = doctorB.body.id;
    const reception = await post("/api/users", { name: "Recepção Teste", email: receptionEmail, username: `recepcao-${run}`, role: "reception", active: true }, adminHeaders);
    assert.equal(reception.status, 201);
    const inactive = await post("/api/users", { name: "Usuário Inativo", email: inactiveEmail, role: "reception", active: false }, adminHeaders);
    assert.equal(inactive.status, 201); inactiveUserId = inactive.body.id;
    const disposable = await post("/api/users", { name: "Usuário Descartável", email: disposableEmail, role: "reception", active: false }, adminHeaders);
    assert.equal(disposable.status, 201); disposableUserId = disposable.body.id;
    assert.equal((await patch(`/api/users/${reception.body.id}`, { name: "Recepção Atualizada", email: receptionEmail, role: "reception", active: true }, adminHeaders)).status, 200);
    assert.equal((await request("/api/bootstrap", { headers: inactiveHeaders })).status, 403);
    const admin = (await request("/api/bootstrap", { headers: adminHeaders })).body.actor;
    assert.equal((await patch(`/api/users/${admin.id}`, { active: false }, adminHeaders)).status, 400);
  });

  await context.test("exclui somente usuário inativo sem vínculos", async () => {
    assert.equal((await del(`/api/users/${disposableUserId}`, adminHeaders)).status, 200);
    const users = await request("/api/users", { headers: adminHeaders });
    assert.equal(users.body.users.some((user) => user.id === disposableUserId), false);
  });

  await context.test("cadastra dois médicos e exige vínculo profissional ativo", async () => {
    assert.equal((await request("/api/bootstrap", { headers: doctorAHeaders })).status, 403);
    assert.equal((await patch(`/api/users/${doctorAUserId}`, { active: true }, adminHeaders)).status, 400);
    const createdA = await post("/api/doctors", { name: "Dra. Ana Continuidade", crm: `CRM-A-${run.slice(-8)}`, specialty: "Clínica Médica", phone: "85999990000", email: doctorAEmail, userId: doctorAUserId, active: true }, adminHeaders);
    assert.equal(createdA.status, 201); doctorAId = createdA.body.id;
    const createdB = await post("/api/doctors", { name: "Dr. Bruno Continuidade", crm: `CRM-B-${run.slice(-8)}`, specialty: "Medicina de Família", phone: "85999990001", email: doctorBEmail, userId: doctorBUserId, active: true }, adminHeaders);
    assert.equal(createdB.status, 201); doctorBId = createdB.body.id;
    assert.equal((await patch(`/api/users/${doctorAUserId}`, { active: true, doctorId: doctorAId }, adminHeaders)).status, 200);
    assert.equal((await patch(`/api/users/${doctorBUserId}`, { active: true, doctorId: doctorBId }, adminHeaders)).status, 200);
    assert.equal((await patch(`/api/doctors/${doctorAId}`, { name: "Dra. Ana Continuidade", crm: `CRM-A-${run.slice(-8)}`, specialty: "Neurologia", phone: "85999990000", email: doctorAEmail, userId: doctorAUserId, active: true }, adminHeaders)).status, 200);
    const doctorBootstrap = await request("/api/bootstrap", { headers: doctorAHeaders });
    assert.equal(doctorBootstrap.body.actor.doctorId, doctorAId);
    assert.ok(doctorBootstrap.body.actor.emailVerifiedAt);
    assert.equal((await request("/api/bootstrap", { headers: identity(doctorAHeaders["oai-authenticated-user-id"], `outro.${run}@conquistar.local`, "Identidade divergente") })).status, 403);
  });

  await context.test("autentica com senha própria, preserva perfil e vínculo, rotaciona sessão e encerra logout", async () => {
    const temporaryPassword = `Temp!${run}Aa9#`; const newPassword = `Nova!${run}Bb8#`;
    const crossSiteLogin = await post("/api/auth/login", { identifier: doctorAEmail, password: temporaryPassword }, { origin: "https://malicioso.example", "sec-fetch-site": "cross-site" });
    assert.equal(crossSiteLogin.status, 403);
    assert.equal((await post(`/api/users/${doctorAUserId}/password`, { password: temporaryPassword, confirmPassword: temporaryPassword }, adminHeaders)).status, 200);
    const login = await post("/api/auth/login", { identifier: `medico.a-${run}`, password: temporaryPassword }, {});
    assert.equal(login.status, 200); assert.equal(login.body.next, "/alterar-senha");
    const temporaryCookie = cookieFrom(login.headers["set-cookie"]); assert.match(temporaryCookie, /^conquistar_session=/);
    assert.equal((await request("/api/bootstrap", { headers: { cookie: temporaryCookie } })).status, 401);
    const changed = await post("/api/auth/change-password", { currentPassword: temporaryPassword, password: newPassword, confirmPassword: newPassword }, { cookie: temporaryCookie });
    assert.equal(changed.status, 200); const activeCookie = cookieFrom(changed.headers["set-cookie"]);
    assert.equal((await request("/api/bootstrap", { headers: { cookie: temporaryCookie } })).status, 401);
    const firstRefresh = await request("/api/bootstrap", { headers: { cookie: activeCookie } });
    const secondRefresh = await request("/api/bootstrap", { headers: { cookie: activeCookie } });
    assert.equal(firstRefresh.status, 200); assert.equal(secondRefresh.status, 200);
    assert.equal(firstRefresh.body.actor.role, "doctor"); assert.equal(firstRefresh.body.actor.doctorId, doctorAId);
    assert.equal(firstRefresh.body.actor.authenticationMethod, "password"); assert.equal(firstRefresh.body.permissions.clinicalRead, true);
    assert.equal((await request("/api/users", { headers: { cookie: activeCookie } })).status, 403);
    assert.equal((await patch("/api/profile", { name: "Tentativa externa" }, { cookie: activeCookie, origin: "https://malicioso.example", "sec-fetch-site": "cross-site" })).status, 403);
    const secondPassword = `Outro!${run}Dd6#`;
    const secondNewPassword = `Final!${run}Ee5#`;
    assert.equal((await post(`/api/users/${doctorBUserId}/password`, { password: secondPassword, confirmPassword: secondPassword }, adminHeaders)).status, 200);
    const secondLogin = await post("/api/auth/login", { identifier: doctorBEmail, password: secondPassword }, {});
    assert.equal(secondLogin.status, 200); assert.equal(secondLogin.body.next, "/alterar-senha");
    const secondTemporaryCookie = cookieFrom(secondLogin.headers["set-cookie"]);
    const secondChanged = await post("/api/auth/change-password", { currentPassword: secondPassword, password: secondNewPassword, confirmPassword: secondNewPassword }, { cookie: secondTemporaryCookie });
    assert.equal(secondChanged.status, 200);
    const secondCookie = cookieFrom(secondChanged.headers["set-cookie"]);
    const secondActor = await request("/api/bootstrap", { headers: { cookie: secondCookie } });
    assert.equal(secondActor.status, 200); assert.equal(secondActor.body.actor.id, doctorBUserId);
    assert.equal(firstRefresh.body.actor.id, doctorAUserId);
    assert.equal((await post("/api/auth/logout", {}, { cookie: activeCookie })).status, 200);
    assert.equal((await request("/api/bootstrap", { headers: { cookie: activeCookie } })).status, 401);
    const otherBrowserAfterLogout = await request("/api/bootstrap", { headers: { cookie: secondCookie } });
    assert.equal(otherBrowserAfterLogout.status, 200); assert.equal(otherBrowserAfterLogout.body.actor.id, doctorBUserId);
    assert.equal((await post("/api/auth/logout", {}, { cookie: secondCookie })).status, 200);
    const relogin = await post("/api/auth/login", { identifier: doctorAEmail, password: newPassword }, {});
    assert.equal(relogin.status, 200); assert.equal(relogin.body.next, "/app");
  });

  await context.test("bloqueia usuário inativo e limita força bruta sem revelar a conta", async () => {
    const inactivePassword = `Inativo!${run}Cc7#`;
    assert.equal((await post(`/api/users/${inactiveUserId}/password`, { password: inactivePassword, confirmPassword: inactivePassword }, adminHeaders)).status, 200);
    const inactiveLogin = await post("/api/auth/login", { identifier: inactiveEmail, password: inactivePassword }, {});
    assert.equal(inactiveLogin.status, 401); assert.equal(inactiveLogin.body.error, "E-mail/usuário ou senha inválidos.");
    const statuses = [];
    for (let index = 0; index < 5; index += 1) statuses.push((await post("/api/auth/login", { identifier: `desconhecido-${run}`, password: "Senha-Incorreta!123" }, {})).status);
    assert.deepEqual(statuses, [401, 401, 401, 401, 429]);
    assert.equal((await post("/api/auth/login", { identifier: `desconhecido-${run}`, password: "Senha-Incorreta!123" }, {})).status, 429);
  });

  await context.test("valida, persiste, pesquisa e atualiza paciente", async () => {
    patientPayload = { fullName: `Paciente Integração ${run}`, cpf, phone: "85988887777", birthDate: "1990-05-12", sex: "Feminino", address: "Ambiente local de teste", email: `paciente.${run}@local`, emergencyContact: "Contato QA 85900000000", administrativeNotes: "Registro de teste automatizado", active: true };
    const created = await post("/api/patients", patientPayload, adminHeaders);
    assert.equal(created.status, 201); patientId = created.body.id;
    assert.equal((await post("/api/patients", patientPayload, adminHeaders)).status, 409);
    assert.equal((await post("/api/patients", { ...patientPayload, cpf: "12345678901", birthDate: "2099-01-01" }, adminHeaders)).status, 400);
    for (const query of [run, cpf, "85988887777", `CRM-B-${run.slice(-8)}`]) {
      const searched = await request(`/api/search?q=${encodeURIComponent(query)}`, { headers: adminHeaders });
      assert.equal(searched.status, 200);
      assert.ok(searched.body.patients.length + searched.body.doctors.length >= 1);
    }
    const emptySearch = await request("/api/search?q=zzzz-qa-sem-resultado", { headers: adminHeaders });
    assert.equal(emptySearch.body.patients.length + emptySearch.body.doctors.length, 0);
    assert.equal((await patch(`/api/patients/${patientId}`, { ...patientPayload, administrativeNotes: "Atualizado e auditado" }, adminHeaders)).status, 200);
  });

  await context.test("cria, edita e exclui agenda médica com isolamento por profissional", async () => {
    const start = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
    const end = new Date(Date.now() + 90_000_000).toISOString().slice(0, 16);
    const created = await post("/api/appointments", { scope: "doctor", doctorId: doctorAId, title: "Reunião de integração", description: "Teste automatizado", startsAt: start, endsAt: end, type: "Reunião", allDay: false, reason: "Alinhamento", notes: "QA" }, doctorAHeaders);
    assert.equal(created.status, 201); doctorAppointmentId = created.body.id;
    assert.equal((await post("/api/appointments", { scope: "doctor", doctorId: doctorBId, title: "Agenda alheia", startsAt: start, endsAt: end, type: "Reunião", allDay: false }, doctorAHeaders)).status, 403);
    assert.equal((await patch(`/api/appointments/${doctorAppointmentId}`, { scope: "doctor", doctorId: doctorAId, title: "Reunião atualizada", description: "Persistência confirmada", startsAt: start, endsAt: end, type: "Reunião", allDay: false, reason: "Alinhamento", notes: "QA" }, doctorAHeaders)).status, 200);
    const visible = await request("/api/appointments", { headers: doctorAHeaders });
    assert.equal(visible.body.appointments.find((item) => item.id === doctorAppointmentId).title, "Reunião atualizada");
    assert.equal((await del(`/api/appointments/${doctorAppointmentId}`, doctorAHeaders)).status, 200);
    assert.equal((await request("/api/appointments", { headers: doctorAHeaders })).body.appointments.some((item) => item.id === doctorAppointmentId), false);
  });

  await context.test("administrador cria, edita e exclui evento global sem duplicidade", async () => {
    const day = new Date(Date.now() + 172_800_000).toISOString().slice(0, 10);
    const created = await post("/api/appointments", { scope: "global", doctorId: null, title: "Clínica fechada", description: "Evento geral", startsAt: `${day}T00:00`, endsAt: `${day}T23:59`, type: "Clínica fechada", allDay: true, reason: "Manutenção preventiva", notes: "QA global" }, adminHeaders);
    assert.equal(created.status, 201); globalAppointmentId = created.body.id;
    assert.equal((await post("/api/appointments", { scope: "global", title: "Evento proibido", startsAt: `${day}T00:00`, endsAt: `${day}T23:59`, type: "Feriado", allDay: true }, doctorAHeaders)).status, 403);
    assert.equal((await patch(`/api/appointments/${globalAppointmentId}`, { scope: "global", doctorId: null, title: "Clínica fechada — atualizado", description: "Evento geral", startsAt: `${day}T00:00`, endsAt: `${day}T23:59`, type: "Clínica fechada", allDay: true, reason: "Manutenção concluída", notes: "QA global" }, adminHeaders)).status, 200);
    const doctorView = await request("/api/appointments", { headers: doctorBHeaders });
    assert.equal(doctorView.body.appointments.filter((item) => item.id === globalAppointmentId).length, 1);
    assert.equal((await patch(`/api/appointments/${globalAppointmentId}`, { scope: "global", title: "Tentativa", startsAt: `${day}T00:00`, endsAt: `${day}T23:59`, type: "Feriado", allDay: true }, doctorAHeaders)).status, 403);
    assert.equal((await del(`/api/appointments/${globalAppointmentId}`, adminHeaders)).status, 200);
  });

  await context.test("registra atendimento completo com autor, prescrição e exames", async () => {
    assert.equal((await post(`/api/patients/${patientId}/encounters`, { doctorId: doctorAId, occurredAt: localDateTime(new Date(Date.now() - 60_000)), consultationType: "Avaliação", evolution: "Teste", diagnosisCode: "codigo-invalido" }, doctorAHeaders)).status, 400);
    const hypertension = await request(`/api/cid?q=${encodeURIComponent("hipertensão")}`, { headers: doctorAHeaders });
    assert.equal(hypertension.status, 200); assert.equal(hypertension.body.classification.version, "DATASUS V2008");
    assert.ok(hypertension.body.results.length >= 3); hypertensionCid = hypertension.body.results.find((item) => item.code === "I10"); assert.ok(hypertensionCid);
    const asthma = await request("/api/cid?q=J45", { headers: doctorAHeaders });
    assert.equal(asthma.status, 200); asthmaCid = asthma.body.results.find((item) => item.code === "J45"); assert.ok(asthmaCid);
    assert.equal((await post(`/api/patients/${patientId}/encounters`, { doctorId: doctorAId, occurredAt: localDateTime(new Date(Date.now() - 60_000)), consultationType: "Avaliação", evolution: "Teste", diagnoses: [{ cidId: "cid10-datasus-v2008-u999", type: "confirmed" }] }, doctorAHeaders)).status, 400);
    const encounter = await post(`/api/patients/${patientId}/encounters`, { doctorId: doctorAId, occurredAt: localDateTime(new Date(Date.now() - 60_000)), consultationType: "Primeira consulta", chiefComplaint: "Cefaleia há dois dias", problemHistory: "Sem sinais de alarme", symptoms: "Dor frontal leve", relevantHistory: "Histórico familiar sem particularidades", allergies: "Nega alergias", clinicalNotes: "Sinais vitais estáveis", evolution: "Paciente avaliada em bom estado geral.", diagnosticHypothesis: "Cefaleia primária", diagnosis: "Cefaleia tensional", diagnoses: [{ cidId: hypertensionCid.id, type: "confirmed" }, { cidId: asthmaCid.id, type: "hypothesis" }], diagnosisNotes: "Sem sinais de gravidade", conduct: "Orientações e acompanhamento", patientGuidance: "Hidratação e retorno se piora", notes: "Retorno se piora", medications: [{ medication: "Dipirona", dosage: "500 mg", administrationRoute: "Oral", frequency: "8/8h se dor", duration: "3 dias", instructions: "Após alimentação" }], presentedExams: [{ examName: "Tomografia de crânio", performedAt: "2026-08-10", laboratory: "Centro Diagnóstico QA", resultSummary: "Sem alterações agudas", medicalNotes: "Resultado revisado" }], exams: [{ examName: "Hemograma", category: "Laboratorial", priority: "Rotina", notes: "Se persistência dos sintomas" }] }, doctorAHeaders);
    assert.equal(encounter.status, 201, JSON.stringify(encounter.body));
    encounterId = encounter.body.encounterId;
    const history = await request(`/api/patients/${patientId}/encounters`, { headers: doctorAHeaders });
    assert.equal(history.status, 200);
    assert.equal(history.body.encounters[0].medications.length, 1);
    assert.equal(history.body.encounters[0].exams.length, 1);
    assert.equal(history.body.encounters[0].presentedExams.length, 1);
    assert.deepEqual(history.body.encounters[0].diagnoses.map((item) => item.code), ["I10", "J45"]);
    assert.deepEqual(history.body.encounters[0].diagnoses.map((item) => item.type), ["confirmed", "hypothesis"]);
    assert.equal(history.body.encounters[0].canCancel, true);
    presentedExamId = history.body.encounters[0].presentedExams[0].id;
    assert.equal(history.body.encounters[0].medications[0].administrationRoute, "Oral");
    assert.equal(history.body.encounters[0].consultationType, "Primeira consulta");
    assert.equal(history.body.encounters[0].doctorSpecialty, undefined);
    assert.equal(history.body.encounters[0].doctorName, "Dra. Ana Continuidade");
    assert.equal(history.body.encounters[0].authorName, "Dra. Ana Continuidade");
    assert.ok(history.body.encounters[0].createdAt);
    assert.equal((await post(`/api/patients/${patientId}/encounters`, { doctorId: doctorBId, occurredAt: localDateTime(new Date()), consultationType: "Avaliação", chiefComplaint: "Teste", evolution: "Teste" }, doctorAHeaders)).status, 403);
  });

  await context.test("garante continuidade entre médicos autorizados", async () => {
    const history = await request(`/api/patients/${patientId}/encounters`, { headers: doctorBHeaders });
    assert.equal(history.status, 200);
    assert.equal(history.body.encounters[0].doctorId, doctorAId);
    assert.equal(history.body.encounters[0].specialty, "Neurologia");
    assert.equal(history.body.encounters[0].diagnosis, "Cefaleia tensional");
    assert.equal(history.body.encounters[0].presentedExams[0].resultSummary, "Sem alterações agudas");
    assert.equal(history.body.encounters[0].patientGuidance, "Hidratação e retorno se piora");
    assert.equal(history.body.encounters[0].canCancel, false);
    assert.equal(history.body.encounters[0].diagnoses[0].description, "Hipertensão essencial (primária)");
  });

  await context.test("protege, valida e preserva anexos clínicos", async () => {
    const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,8,215,99,248,207,192,240,31,0,5,0,1,255,137,153,61,29,0,0,0,0,73,69,68,174,66,96,130]);
    const badForm = new FormData(); badForm.set("file", new Blob(["arquivo executável"], { type: "application/pdf" }), "invalido.pdf");
    assert.equal((await request(`/api/presented-exams/${presentedExamId}/attachment`, { method: "POST", headers: doctorAHeaders, body: badForm })).status, 400);
    const form = new FormData(); form.set("file", new Blob([png], { type: "image/png" }), "tomografia.png");
    assert.equal((await request(`/api/presented-exams/${presentedExamId}/attachment`, { method: "POST", headers: doctorAHeaders, body: form })).status, 201);
    assert.equal((await rawRequest(`/api/presented-exams/${presentedExamId}/attachment`, { headers: doctorBHeaders })).status, 200);
    assert.equal((await rawRequest(`/api/presented-exams/${presentedExamId}/attachment`, { headers: receptionHeaders })).status, 403);
    assert.equal((await rawRequest(`/api/presented-exams/${presentedExamId}/attachment`, { headers: adminHeaders })).status, 403);
    const duplicate = new FormData(); duplicate.set("file", new Blob([png], { type: "image/png" }), "segunda.png");
    assert.equal((await request(`/api/presented-exams/${presentedExamId}/attachment`, { method: "POST", headers: doctorAHeaders, body: duplicate })).status, 409);
    const history = await request(`/api/patients/${patientId}/encounters`, { headers: doctorAHeaders });
    assert.equal(history.body.encounters[0].presentedExams[0].attachmentName, "tomografia.png");
    assert.equal(history.body.encounters[0].presentedExams[0].attachmentScanStatus, "passed");
  });

  await context.test("permite cancelamento somente ao médico autor e preserva rastreabilidade", async () => {
    const created = await post(`/api/patients/${patientId}/encounters`, { doctorId: doctorAId, occurredAt: localDateTime(new Date(Date.now() - 30_000)), consultationType: "Avaliação", evolution: "Registro específico para testar cancelamento autoral.", diagnoses: [{ cidId: hypertensionCid.id, type: "confirmed" }] }, doctorAHeaders);
    assert.equal(created.status, 201); const targetId = created.body.encounterId;
    const authorHistory = await request(`/api/patients/${patientId}/encounters`, { headers: doctorAHeaders });
    assert.equal(authorHistory.body.encounters.find((item) => item.id === targetId).canCancel, true);
    const otherHistory = await request(`/api/patients/${patientId}/encounters`, { headers: doctorBHeaders });
    assert.equal(otherHistory.body.encounters.find((item) => item.id === targetId).canCancel, false);
    assert.equal((await patch(`/api/encounters/${targetId}/cancel`, { reason: "Tentativa por outro médico" }, doctorBHeaders)).status, 403);
    assert.equal((await patch(`/api/encounters/${targetId}/cancel`, { reason: "Tentativa administrativa" }, adminHeaders)).status, 403);
    assert.equal((await patch(`/api/encounters/${targetId}/cancel`, { reason: "" }, doctorAHeaders)).status, 400);
    assert.equal((await patch(`/api/encounters/${targetId}/cancel`, { reason: "Registro criado para o paciente incorreto." }, doctorAHeaders)).status, 200);
    const refreshed = await request(`/api/patients/${patientId}/encounters`, { headers: doctorAHeaders });
    assert.equal(refreshed.body.encounters.some((item) => item.id === targetId), false);
    assert.equal(refreshed.body.encounters.some((item) => item.id === encounterId), true);
    assert.equal((await patch(`/api/encounters/${targetId}/cancel`, { reason: "Segunda tentativa" }, doctorAHeaders)).status, 409);
    const audit = await request(`/api/audit?action=encounter.cancelled&entityType=encounter&user=${doctorAUserId}`, { headers: adminHeaders });
    const entry = audit.body.logs.find((item) => item.entityId === targetId);
    assert.ok(entry); assert.match(entry.summary, /Registro criado para o paciente incorreto/);
    assert.doesNotMatch(JSON.stringify(entry), /Registro específico para testar cancelamento autoral/);
  });

  await context.test("acompanha pendências externas sem marcar conclusão fictícia", async () => {
    const listed = await request("/api/governance", { headers: adminHeaders });
    assert.equal(listed.status, 200);
    assert.ok(listed.body.controls.some((control) => control.key === "independent_pentest" && control.status !== "complete"));
    assert.equal((await patch("/api/governance", { key: "independent_pentest", status: "complete", responsible: "", evidenceReference: "" }, adminHeaders)).status, 400);
    assert.equal((await patch("/api/governance", { key: "independent_pentest", status: "in_progress", responsible: "Empresa externa QA", evidenceReference: "Chamado QA", notes: "Teste automatizado" }, adminHeaders)).status, 200);
    assert.equal((await request("/api/governance", { headers: receptionHeaders })).status, 403);
  });

  await context.test("persiste perfil, tema, preferências e foto privada", async () => {
    assert.equal((await patch("/api/profile", { name: "Dr. Bruno Perfil", phone: "85999998888", theme: "dark", notifyAppointments: false, notifySystem: true, role: "admin" }, doctorBHeaders)).status, 200);
    let bootstrap = await request("/api/bootstrap", { headers: doctorBHeaders });
    assert.equal(bootstrap.body.actor.name, "Dr. Bruno Perfil");
    assert.equal(bootstrap.body.actor.phone, "85999998888");
    assert.equal(bootstrap.body.actor.theme, "dark");
    assert.equal(bootstrap.body.actor.role, "doctor");
    assert.equal(bootstrap.body.actor.notifyAppointments, false);
    assert.equal((await patch("/api/profile", { theme: "light" }, doctorBHeaders)).status, 200);
    bootstrap = await request("/api/bootstrap", { headers: doctorBHeaders });
    assert.equal(bootstrap.body.actor.name, "Dr. Bruno Perfil");
    assert.equal(bootstrap.body.actor.phone, "85999998888");
    assert.equal(bootstrap.body.actor.theme, "light");
    assert.equal(bootstrap.body.actor.notifyAppointments, false);
    const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,8,215,99,248,207,192,240,31,0,5,0,1,255,137,153,61,29,0,0,0,0,73,69,68,174,66,96,130]);
    const form = new FormData(); form.set("photo", new Blob([png], { type: "image/png" }), "perfil.png");
    assert.equal((await request("/api/profile/avatar", { method: "POST", headers: doctorBHeaders, body: form })).status, 200);
    assert.equal((await rawRequest("/api/profile/avatar", { headers: doctorBHeaders })).status, 200);
    assert.equal((await del("/api/profile/avatar", doctorBHeaders)).status, 200);
    assert.equal((await rawRequest("/api/profile/avatar", { headers: doctorBHeaders })).status, 404);
  });

  await context.test("isola dados clínicos da recepção e do administrador", async () => {
    const reception = await request("/api/bootstrap", { headers: receptionHeaders });
    assert.equal(reception.status, 200);
    assert.equal(reception.body.permissions.clinicalRead, false);
    assert.equal((await request("/api/patients", { headers: receptionHeaders })).status, 200);
    assert.equal((await request(`/api/patients/${patientId}/encounters`, { headers: receptionHeaders })).status, 403);
    assert.equal((await post(`/api/patients/${patientId}/encounters`, {}, receptionHeaders)).status, 403);
    assert.equal((await request("/api/audit", { headers: receptionHeaders })).status, 403);
    assert.equal((await request("/api/users", { headers: receptionHeaders })).status, 403);
    assert.equal((await request(`/api/patients/${patientId}/encounters`, { headers: adminHeaders })).status, 403);
    assert.equal((await post(`/api/patients/${patientId}/encounters`, {}, adminHeaders)).status, 403);
    assert.equal((await request("/api/cid?q=asma", { headers: receptionHeaders })).status, 403);
    assert.equal((await request("/api/cid?q=asma", { headers: adminHeaders })).status, 403);
  });

  await context.test("preserva histórico ao arquivar paciente e desativar médico", async () => {
    assert.equal((await patch(`/api/patients/${patientId}`, { ...patientPayload, active: false }, adminHeaders)).status, 200);
    assert.equal((await del(`/api/patients/${patientId}`, adminHeaders)).status, 400);
    assert.equal((await patch(`/api/doctors/${doctorAId}`, { name: "Dra. Ana Continuidade", crm: `CRM-A-${run.slice(-8)}`, specialty: "Neurologia", phone: "85999990000", email: doctorAEmail, userId: doctorAUserId, active: false }, adminHeaders)).status, 200);
    assert.equal((await del(`/api/doctors/${doctorAId}`, adminHeaders)).status, 400);
    assert.equal((await request("/api/bootstrap", { headers: doctorAHeaders })).status, 403);
  });

  await context.test("audita ações com narrativa sem vazar conteúdo clínico", async () => {
    const audit = await request(`/api/audit?action=encounter.created&entity=encounter&user=${doctorAUserId}`, { headers: adminHeaders });
    assert.equal(audit.status, 200);
    const entry = audit.body.logs.find((item) => item.action === "encounter.created");
    assert.ok(entry);
    assert.equal(entry.actorRole, "doctor");
    assert.match(entry.summary, /finalizou um atendimento/i);
    assert.doesNotMatch(JSON.stringify(entry), /Cefaleia tensional|Dipirona|Hemograma/);
    const bootstrap = await request("/api/bootstrap", { headers: adminHeaders });
    assert.ok(bootstrap.body.dashboard.stats.patients >= 1);
    assert.ok(bootstrap.body.dashboard.stats.doctors >= 2);
  });
});

function identity(id, email, name) {
  return { "oai-authenticated-user-id": id, "oai-authenticated-user-email": email, "oai-authenticated-user-full-name": encodeURIComponent(name), "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8" };
}
function localDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  return { status: response.status, headers: Object.fromEntries(response.headers), body: await response.json().catch(() => ({})) };
}
function rawRequest(path, options = {}) { return fetch(`${base}${path}`, options); }
function post(path, body, headers) { return request(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }); }
function patch(path, body, headers) { return request(path, { method: "PATCH", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }); }
function del(path, headers) { return request(path, { method: "DELETE", headers }); }
function cookieFrom(setCookie = "") { return setCookie.split(";", 1)[0]; }
