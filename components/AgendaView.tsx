"use client";

import { useMemo, useState } from "react";
import type { Actor } from "@/lib/domain/types";
import type { Appointment } from "./clinic-types";
import { dateOnly, dateTime } from "./format";

type CalendarMode = "day" | "week" | "month";

export function AgendaView({ appointments, actor, mode, onMode, onNew, onEdit, onDelete }: {
  appointments: Appointment[];
  actor: Actor;
  mode: CalendarMode;
  onMode(value: CalendarMode): void;
  onNew(): void;
  onEdit(appointment: Appointment): void;
  onDelete(appointment: Appointment): void;
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState<Appointment | null>(null);
  const upcoming = useMemo(() => appointments.filter((item) => new Date(item.endsAt) >= new Date()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [appointments]);
  const dates = useMemo(() => calendarDates(anchor, mode), [anchor, mode]);
  function navigate(direction: -1 | 1) { setAnchor((current) => { const next = new Date(current); if (mode === "month") next.setMonth(next.getMonth() + direction); else next.setDate(next.getDate() + direction * (mode === "week" ? 7 : 1)); return next; }); }
  const canManage = (item: Appointment) => actor.role === "admin" || (actor.role === "doctor" ? item.scope === "doctor" && item.doctorId === actor.doctorId : item.scope === "doctor");

  return <>
    <header className="page-title"><div><p>Organização interna</p><h1>Agenda da clínica</h1><span>Compromissos médicos, plantões, bloqueios e eventos gerais em uma visão única.</span></div><button className="green-button" onClick={onNew}>+ Novo compromisso</button></header>
    <div className="calendar-toolbar"><button aria-label="Período anterior" onClick={() => navigate(-1)}>←</button><strong aria-live="polite">{calendarLabel(anchor, mode)}</strong><button aria-label="Próximo período" onClick={() => navigate(1)}>→</button><button className="today-button" onClick={() => setAnchor(new Date())}>Hoje</button><div className="segmented" aria-label="Visualização da agenda"><button className={mode === "day" ? "active" : ""} onClick={() => onMode("day")}>Dia</button><button className={mode === "week" ? "active" : ""} onClick={() => onMode("week")}>Semana</button><button className={mode === "month" ? "active" : ""} onClick={() => onMode("month")}>Mês</button></div></div>
    <div className="agenda-layout">
      <section className="calendar-surface" aria-label={`Agenda em modo ${mode}`}><div className={`calendar-placeholder mode-${mode}`}><div className="calendar-days">{dates.map((date) => { const dayItems = appointments.filter((item) => sameDay(new Date(item.startsAt), date)); return <div key={date.toISOString()} className={`${sameDay(date, new Date()) ? "today" : ""} ${date.getMonth() !== anchor.getMonth() && mode === "month" ? "outside" : ""}`}><span>{date.toLocaleDateString("pt-BR", { weekday: "short" })}</span><strong>{date.getDate()}</strong><div className="calendar-events">{dayItems.map((item) => <button type="button" key={item.id} className={`calendar-event ${item.scope === "global" ? "global" : "doctor"} ${item.type === "Clínica fechada" ? "closed" : ""}`} onClick={() => setSelected(item)}><time>{item.allDay ? "Dia inteiro" : new Date(item.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><b>{item.title}</b>{item.scope === "global" ? <small>Todos</small> : null}</button>)}</div></div>; })}</div></div></section>
      <aside className="agenda-upcoming"><header><p>Próximos 30 dias</p><h2>Compromissos</h2></header>{upcoming.length ? upcoming.slice(0, 10).map((item) => <button type="button" className={item.scope === "global" ? "global" : ""} key={item.id} onClick={() => setSelected(item)}><i /><div><time>{item.allDay ? dateOnly(item.startsAt) : dateTime(item.startsAt)}</time><strong>{item.title}</strong><span>{item.scope === "global" ? "Toda a clínica" : item.doctorName} · {item.type}</span></div></button>) : <div className="empty-state compact"><i>+</i><h3>Agenda livre</h3><p>Crie o primeiro compromisso.</p></div>}</aside>
    </div>
    {selected ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}><section className="modal appointment-detail" role="dialog" aria-modal="true" aria-labelledby="appointment-title"><header><div><p>{selected.scope === "global" ? "Evento geral da clínica" : "Agenda médica"}</p><h2 id="appointment-title">{selected.title}</h2></div><button onClick={() => setSelected(null)} aria-label="Fechar">×</button></header><div className="appointment-detail-body"><span className={`scope-badge ${selected.scope}`}>{selected.scope === "global" ? "Toda a clínica" : selected.doctorName}</span><dl><div><dt>Tipo</dt><dd>{selected.type}</dd></div><div><dt>Período</dt><dd>{selected.allDay ? `${dateOnly(selected.startsAt)} · dia inteiro` : `${dateTime(selected.startsAt)} até ${dateTime(selected.endsAt)}`}</dd></div><div><dt>Descrição</dt><dd>{selected.description || "Não informada"}</dd></div><div><dt>Motivo</dt><dd>{selected.reason || "Não informado"}</dd></div><div><dt>Observações</dt><dd>{selected.notes || "Nenhuma observação"}</dd></div><div><dt>Criado por</dt><dd>{selected.createdByName}</dd></div></dl></div><footer className="dialog-actions"><button className="secondary-button" onClick={() => setSelected(null)}>Fechar</button>{canManage(selected) ? <><button className="secondary-button" onClick={() => { onEdit(selected); setSelected(null); }}>Editar</button><button className="danger-button" onClick={() => { onDelete(selected); setSelected(null); }}>Excluir</button></> : null}</footer></section></div> : null}
  </>;
}

function calendarDates(anchor: Date, mode: CalendarMode) { const start = new Date(anchor); let length = 1; if (mode === "week") { start.setDate(start.getDate() - start.getDay()); length = 7; } else if (mode === "month") { start.setDate(1); start.setDate(start.getDate() - start.getDay()); length = 42; } return Array.from({ length }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; }); }
function calendarLabel(anchor: Date, mode: CalendarMode) { if (mode === "day") return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(anchor); if (mode === "week") { const dates = calendarDates(anchor, mode); return `${dates[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${dates[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`; } return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(anchor); }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
